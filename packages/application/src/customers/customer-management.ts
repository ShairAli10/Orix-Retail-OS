import { runWithEvents } from "../shared/transactional-events.js";
import { randomUUID } from "node:crypto";
import type { ApplicationEvent, CoreError, CoreResult } from "@orix/core";
import { err, ok } from "@orix/core";
import type {
  CustomerActivity,
  CustomerDetail,
  CustomerListQuery,
  CustomerPage,
  CustomerPayment,
  CustomerPaymentWrite,
  CustomerStatement,
  CustomerStatementQuery,
  CustomerWrite
} from "@orix/repositories";
import { applicationError } from "../shared/errors.js";
import type { ApplicationServiceContext } from "../shared/service-context.js";

export type CustomerMutationOutput = {
  readonly customer: CustomerDetail;
};

export type CustomerPaymentOutput = {
  readonly payment: CustomerPayment;
};

export type CustomerArchiveInput = {
  readonly id: string;
  readonly storeId: string;
  readonly branchId: string;
  readonly businessDayId: string;
  readonly userId: string;
};

const validationError = (message: string, fields?: readonly string[]): CoreError =>
  applicationError(
    "APPLICATION_VALIDATION_FAILED",
    message,
    fields === undefined ? undefined : { fields }
  );

export class CustomerManagementApplicationService {
  public constructor(private readonly context: ApplicationServiceContext) {}

  public listCustomers(query: CustomerListQuery): CoreResult<CustomerPage> {
    return this.context.repositories.customers.listCustomers(query);
  }

  public getCustomer(id: string): CoreResult<CustomerDetail | undefined> {
    return this.context.repositories.customers.getCustomer(id);
  }

  public statement(
    query: CustomerStatementQuery,
    preparedBy: string
  ): CoreResult<CustomerStatement> {
    return this.context.repositories.customers.statement(query, preparedBy);
  }

  public activity(customerId: string): CoreResult<readonly CustomerActivity[]> {
    return this.context.repositories.customers.activity(customerId);
  }

  public async createCustomer(input: CustomerWrite): Promise<CoreResult<CustomerMutationOutput>> {
    const validation = this.validateCustomer(input);
    if (!validation.ok) return validation;
    const phoneValidation = this.validatePhoneUniqueness(input);
    if (!phoneValidation.ok) return phoneValidation;

    const events: ApplicationEvent[] = [];
    const result = await runWithEvents(
      this.context,
      events,
      { name: "customers.create", metadata: { actorId: input.userId } },
      () => {
        const customer = this.context.repositories.customers.createCustomer(input);
        if (!customer.ok) return Promise.resolve(customer);
        events.push(this.event("CustomerCreated", customer.value.id, input.storeId, input.userId));
        if (input.openingBalanceMinor !== 0) {
          events.push(
            this.event(
              "CustomerOpeningBalanceRecorded",
              customer.value.id,
              input.storeId,
              input.userId
            )
          );
        }
        return Promise.resolve(ok({ customer: customer.value }));
      }
    );
    return result;
  }

  public async updateCustomer(
    input: CustomerWrite & { readonly id: string }
  ): Promise<CoreResult<CustomerMutationOutput>> {
    const validation = this.validateCustomer(input);
    if (!validation.ok) return validation;
    const phoneValidation = this.validatePhoneUniqueness(input);
    if (!phoneValidation.ok) return phoneValidation;

    const events: ApplicationEvent[] = [];
    const result = await runWithEvents(
      this.context,
      events,
      { name: "customers.update", metadata: { actorId: input.userId } },
      () => {
        const customer = this.context.repositories.customers.updateCustomer(input);
        if (!customer.ok) return Promise.resolve(customer);
        events.push(this.event("CustomerUpdated", input.id, input.storeId, input.userId));
        return Promise.resolve(ok({ customer: customer.value }));
      }
    );
    return result;
  }

  public async archiveCustomer(input: CustomerArchiveInput): Promise<CoreResult<void>> {
    const events = [this.event("CustomerArchived", input.id, input.storeId, input.userId)];
    const result = await runWithEvents(
      this.context,
      events,
      { name: "customers.archive", metadata: { actorId: input.userId } },
      () => Promise.resolve(this.context.repositories.customers.archiveCustomer(input))
    );
    return result;
  }

  public async restoreCustomer(input: CustomerArchiveInput): Promise<CoreResult<void>> {
    const events = [this.event("CustomerRestored", input.id, input.storeId, input.userId)];
    const result = await runWithEvents(
      this.context,
      events,
      { name: "customers.restore", metadata: { actorId: input.userId } },
      () => Promise.resolve(this.context.repositories.customers.restoreCustomer(input))
    );
    return result;
  }

  public async recordPayment(
    input: CustomerPaymentWrite
  ): Promise<CoreResult<CustomerPaymentOutput>> {
    if (input.operationId !== undefined && !/^[a-zA-Z0-9-]{16,80}$/.test(input.operationId)) {
      return err(validationError("Invalid payment request ID.", ["operationId"]));
    }
    if (!Number.isFinite(Date.parse(input.paidAt))) {
      return err(validationError("Enter a valid payment date.", ["paidAt"]));
    }
    if (input.amountMinor <= 0) {
      return err(validationError("Payment amount must be greater than zero.", ["amountMinor"]));
    }
    const customer = this.context.repositories.customers.getCustomer(input.customerId);
    if (!customer.ok) return customer;
    if (customer.value?.archivedAt !== null) {
      return err(validationError("Select an active customer.", ["customerId"]));
    }

    const events: ApplicationEvent[] = [];
    const result = await runWithEvents(
      this.context,
      events,
      { name: "customers.payment.record", metadata: { actorId: input.userId } },
      () => {
        const payment = this.context.repositories.customers.recordPayment(input);
        if (!payment.ok) return Promise.resolve(payment);
        events.push({
          ...this.event("CustomerPaymentReceived", payment.value.id, input.storeId, input.userId),
          id: `customer-payment-${payment.value.id}`
        });
        return Promise.resolve(ok({ payment: payment.value }));
      }
    );
    return result;
  }

  private validateCustomer(input: CustomerWrite): CoreResult<void> {
    const fields: string[] = [];
    if (input.name.trim().length < 2) fields.push("name");
    if (input.phone !== undefined && input.phone !== null && input.phone.trim().length < 6) {
      fields.push("phone");
    }
    if (input.creditLimitMinor < 0) fields.push("creditLimitMinor");
    if (fields.length > 0) {
      return err(validationError("Customer details are incomplete or invalid.", fields));
    }
    return ok(undefined);
  }

  private validatePhoneUniqueness(input: CustomerWrite): CoreResult<void> {
    const phone = input.phone?.trim();
    if (phone === undefined || phone.length === 0) {
      return ok(undefined);
    }
    const exists = this.context.repositories.customers.phoneExists(input.storeId, phone, input.id);
    if (!exists.ok) return exists;
    return exists.value
      ? err(validationError("A customer with this phone already exists.", ["phone"]))
      : ok(undefined);
  }

  private event(
    name: string,
    entityId: string,
    storeId: string,
    actorId: string
  ): ApplicationEvent {
    return {
      id: randomUUID(),
      name,
      occurredAt: new Date().toISOString(),
      kind: "domain",
      version: 1,
      payload: { entityId },
      metadata: { storeId, actorId }
    };
  }
}

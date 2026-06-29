import { randomUUID } from "node:crypto";
import type { ApplicationEvent, CoreError, CoreResult } from "@orix/core";
import { err, ok } from "@orix/core";
import type {
  SupplierDetail,
  SupplierListQuery,
  SupplierPage,
  SupplierPayment,
  SupplierPaymentWrite,
  SupplierStatement,
  SupplierStatementQuery,
  SupplierActivity,
  SupplierWrite
} from "@orix/repositories";
import { applicationError } from "../shared/errors.js";
import type { ApplicationServiceContext } from "../shared/service-context.js";

export type SupplierMutationOutput = {
  readonly supplier: SupplierDetail;
};

export type SupplierPaymentOutput = {
  readonly payment: SupplierPayment;
};

const validationError = (message: string, fields?: readonly string[]): CoreError =>
  applicationError(
    "APPLICATION_VALIDATION_FAILED",
    message,
    fields === undefined ? undefined : { fields }
  );

const operationError = (message: string): CoreError =>
  applicationError("APPLICATION_OPERATION_FAILED", message);

export class SupplierManagementApplicationService {
  public constructor(private readonly context: ApplicationServiceContext) {}

  public listSuppliers(query: SupplierListQuery): CoreResult<SupplierPage> {
    return this.context.repositories.suppliers.listSuppliers(query);
  }

  public getSupplier(id: string): CoreResult<SupplierDetail | undefined> {
    return this.context.repositories.suppliers.getSupplier(id);
  }

  public statement(
    query: SupplierStatementQuery,
    preparedBy: string
  ): CoreResult<SupplierStatement> {
    return this.context.repositories.suppliers.statement(query, preparedBy);
  }

  public activity(supplierId: string): CoreResult<{ readonly items: readonly SupplierActivity[] }> {
    const result = this.context.repositories.suppliers.activity(supplierId);
    return result.ok ? ok({ items: result.value }) : result;
  }

  public async createSupplier(input: SupplierWrite): Promise<CoreResult<SupplierMutationOutput>> {
    const validation = this.validateSupplier(input);
    if (!validation.ok) return validation;
    const uniqueness = this.validatePhone(input);
    if (!uniqueness.ok) return uniqueness;
    const events: ApplicationEvent[] = [];
    const timestamp = new Date().toISOString();
    const result = await this.context.transactionRunner.run(
      { name: "suppliers.create", metadata: { actorId: input.userId } },
      () => {
        const supplier = this.context.repositories.suppliers.createSupplier(input);
        if (!supplier.ok) return Promise.resolve(supplier);
        events.push(this.event("SupplierCreated", supplier.value.id, input, timestamp));
        if (input.openingBalanceMinor !== 0) {
          events.push(
            this.event("SupplierOpeningBalanceRecorded", supplier.value.id, input, timestamp)
          );
        }
        return Promise.resolve(ok({ supplier: supplier.value }));
      }
    );
    return this.publishAfterCommit(result, events);
  }

  public async updateSupplier(
    input: SupplierWrite & { readonly id: string }
  ): Promise<CoreResult<SupplierMutationOutput>> {
    const validation = this.validateSupplier(input);
    if (!validation.ok) return validation;
    const uniqueness = this.validatePhone(input);
    if (!uniqueness.ok) return uniqueness;
    const events: ApplicationEvent[] = [];
    const timestamp = new Date().toISOString();
    const result = await this.context.transactionRunner.run(
      { name: "suppliers.update", metadata: { actorId: input.userId } },
      () => {
        const supplier = this.context.repositories.suppliers.updateSupplier(input);
        if (!supplier.ok) return Promise.resolve(supplier);
        events.push(this.event("SupplierUpdated", supplier.value.id, input, timestamp));
        return Promise.resolve(ok({ supplier: supplier.value }));
      }
    );
    return this.publishAfterCommit(result, events);
  }

  public async archiveSupplier(input: {
    readonly id: string;
    readonly storeId: string;
    readonly branchId: string;
    readonly businessDayId: string;
    readonly userId: string;
  }): Promise<CoreResult<void>> {
    const events = [this.event("SupplierArchived", input.id, input, new Date().toISOString())];
    const result = await this.context.transactionRunner.run(
      { name: "suppliers.archive", metadata: { actorId: input.userId } },
      () => Promise.resolve(this.context.repositories.suppliers.archiveSupplier(input))
    );
    return this.publishAfterCommit(result, events);
  }

  public async restoreSupplier(input: {
    readonly id: string;
    readonly storeId: string;
    readonly branchId: string;
    readonly businessDayId: string;
    readonly userId: string;
  }): Promise<CoreResult<void>> {
    const events = [this.event("SupplierRestored", input.id, input, new Date().toISOString())];
    const result = await this.context.transactionRunner.run(
      { name: "suppliers.restore", metadata: { actorId: input.userId } },
      () => Promise.resolve(this.context.repositories.suppliers.restoreSupplier(input))
    );
    return this.publishAfterCommit(result, events);
  }

  public async recordPayment(
    input: SupplierPaymentWrite
  ): Promise<CoreResult<SupplierPaymentOutput>> {
    if (input.amountMinor <= 0) {
      return err(validationError("Supplier payment amount must be greater than zero.", ["amount"]));
    }
    const supplier = this.context.repositories.suppliers.getSupplier(input.supplierId);
    if (!supplier.ok) return supplier;
    if (supplier.value?.archivedAt !== null) {
      return err(operationError("Supplier was not found or is archived."));
    }
    const events: ApplicationEvent[] = [];
    const result = await this.context.transactionRunner.run(
      { name: "suppliers.payment.record", metadata: { actorId: input.userId } },
      () => {
        const payment = this.context.repositories.suppliers.recordPayment(input);
        if (!payment.ok) return Promise.resolve(payment);
        events.push(this.event("SupplierPaymentRecorded", input.supplierId, input, input.paidAt));
        return Promise.resolve(ok({ payment: payment.value }));
      }
    );
    return this.publishAfterCommit(result, events);
  }

  private validateSupplier(input: SupplierWrite): CoreResult<void> {
    const fields: string[] = [];
    if (input.name.trim().length < 2) fields.push("name");
    if (input.phone !== undefined && input.phone !== null && input.phone.trim().length < 6) {
      fields.push("phone");
    }
    if (input.openingBalanceDate !== undefined && input.openingBalanceDate !== null) {
      if (input.openingBalanceDate.trim().length === 0) fields.push("openingBalanceDate");
    }
    return fields.length > 0
      ? err(validationError("Supplier details are missing or invalid.", fields))
      : ok(undefined);
  }

  private validatePhone(input: SupplierWrite): CoreResult<void> {
    const phone = input.phone?.trim();
    if (phone === undefined || phone.length === 0) return ok(undefined);
    const exists = this.context.repositories.suppliers.phoneExists(input.storeId, phone, input.id);
    if (!exists.ok) return exists;
    return exists.value
      ? err(validationError("A supplier with this phone already exists.", ["phone"]))
      : ok(undefined);
  }

  private async publishAfterCommit<T>(
    result: CoreResult<T>,
    events: readonly ApplicationEvent[]
  ): Promise<CoreResult<T>> {
    if (!result.ok) return result;
    for (const event of events) {
      await this.context.eventPublisher.publish(event);
    }
    return result;
  }

  private event(
    name: string,
    aggregateId: string,
    input: {
      readonly storeId: string;
      readonly userId: string;
    },
    occurredAt: string
  ): ApplicationEvent {
    return {
      id: randomUUID(),
      name,
      occurredAt,
      kind: "domain",
      payload: { entityId: aggregateId },
      metadata: { storeId: input.storeId, actorId: input.userId },
      version: 1
    };
  }
}

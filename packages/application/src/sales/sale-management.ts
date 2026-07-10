import { randomUUID } from "node:crypto";
import type { ApplicationEvent, CoreError, CoreResult } from "@orix/core";
import { err, ok } from "@orix/core";
import type {
  CashRegisterSummary,
  ReceiptModel,
  SaleDetail,
  SaleListQuery,
  SalePage,
  SalesDashboardSummary,
  SaleWrite
} from "@orix/repositories";
import { applicationError } from "../shared/errors.js";
import type { ApplicationServiceContext } from "../shared/service-context.js";

export type SaleMutationOutput = {
  readonly sale: SaleDetail;
  readonly receipt: ReceiptModel | null;
};

const validationError = (message: string, fields?: readonly string[]): CoreError =>
  applicationError(
    "APPLICATION_VALIDATION_FAILED",
    message,
    fields === undefined ? undefined : { fields }
  );

const operationError = (message: string): CoreError =>
  applicationError("APPLICATION_OPERATION_FAILED", message);

export class SaleManagementApplicationService {
  public constructor(private readonly context: ApplicationServiceContext) {}

  public listSales(query: SaleListQuery): CoreResult<SalePage> {
    return this.context.repositories.sales.listSales(query);
  }

  public getSale(id: string): CoreResult<SaleDetail | undefined> {
    return this.context.repositories.sales.getSale(id);
  }

  public receipt(saleId: string): CoreResult<ReceiptModel> {
    return this.context.repositories.sales.receipt(saleId);
  }

  public cashRegisterSummary(businessDayId: string): CoreResult<CashRegisterSummary> {
    return this.context.repositories.sales.cashRegisterSummary(businessDayId);
  }

  public dashboardSummary(
    storeId: string,
    businessDayId: string
  ): CoreResult<SalesDashboardSummary> {
    return this.context.repositories.sales.dashboardSummary(storeId, businessDayId);
  }

  public async saveDraft(input: SaleWrite): Promise<CoreResult<SaleMutationOutput>> {
    const validation = this.validateSale(input, "draft");
    if (!validation.ok) return validation;
    const events: ApplicationEvent[] = [];
    const result = await this.context.transactionRunner.run(
      { name: "sales.save-draft", metadata: { actorId: input.userId } },
      () => {
        const sale = this.context.repositories.sales.saveDraft(input, "draft");
        if (!sale.ok) return Promise.resolve(sale);
        events.push(
          this.event(input.id === undefined ? "SaleCreated" : "SaleUpdated", sale.value.id, input)
        );
        return Promise.resolve(ok({ sale: sale.value, receipt: null }));
      }
    );
    return this.publishAfterCommit(result, events);
  }

  public async holdSale(input: SaleWrite): Promise<CoreResult<SaleMutationOutput>> {
    const validation = this.validateSale(input, "held");
    if (!validation.ok) return validation;
    const events: ApplicationEvent[] = [];
    const result = await this.context.transactionRunner.run(
      { name: "sales.hold", metadata: { actorId: input.userId } },
      () => {
        const sale = this.context.repositories.sales.saveDraft(input, "held");
        if (!sale.ok) return Promise.resolve(sale);
        events.push(this.event("SaleHeld", sale.value.id, input));
        return Promise.resolve(ok({ sale: sale.value, receipt: null }));
      }
    );
    return this.publishAfterCommit(result, events);
  }

  public async completeSale(input: SaleWrite): Promise<CoreResult<SaleMutationOutput>> {
    const validation = this.validateSale(input, "completed");
    if (!validation.ok) return validation;
    if (input.paymentType === "credit") {
      if (input.customerId === undefined || input.customerId === null) {
        return err(validationError("Credit sale requires a customer.", ["customerId"]));
      }
      const customer = this.context.repositories.customers.getCustomer(input.customerId);
      if (!customer.ok) return customer;
      if (customer.value?.archivedAt !== null) {
        return err(operationError("Customer was not found or is archived."));
      }
    }
    const events: ApplicationEvent[] = [];
    const result = await this.context.transactionRunner.run(
      { name: "sales.complete", metadata: { actorId: input.userId } },
      () => {
        const sale = this.context.repositories.sales.completeSale(input);
        if (!sale.ok) return Promise.resolve(sale);
        const receipt = this.context.repositories.sales.receipt(sale.value.id);
        if (!receipt.ok) return Promise.resolve(receipt);
        events.push(this.event("SaleCompleted", sale.value.id, input));
        events.push(this.event("InventoryReduced", sale.value.id, input));
        if (input.paymentType === "credit") {
          events.push(this.event("CustomerCreditCharged", sale.value.id, input));
        }
        return Promise.resolve(ok({ sale: sale.value, receipt: receipt.value }));
      }
    );
    return this.publishAfterCommit(result, events);
  }

  public async cancelDraft(input: {
    readonly id: string;
    readonly storeId: string;
    readonly branchId: string;
    readonly businessDayId: string;
    readonly userId: string;
    readonly reason: string;
  }): Promise<CoreResult<void>> {
    if (input.reason.trim().length < 3) {
      return err(validationError("Cancellation reason is required.", ["reason"]));
    }
    const events = [this.event("SaleCancelled", input.id, input)];
    const result = await this.context.transactionRunner.run(
      { name: "sales.cancel", metadata: { actorId: input.userId } },
      () => Promise.resolve(this.context.repositories.sales.cancelDraft(input))
    );
    return this.publishAfterCommit(result, events);
  }

  private validateSale(
    input: SaleWrite,
    targetStatus: "draft" | "held" | "completed"
  ): CoreResult<void> {
    const fields: string[] = [];
    if (input.saleDate.trim().length === 0) fields.push("saleDate");
    if (input.discountMinor < 0) fields.push("discountMinor");
    if (input.taxMinor < 0) fields.push("taxMinor");
    if (input.cashReceivedMinor < 0) fields.push("cashReceivedMinor");
    if (input.items.length === 0) fields.push("items");
    for (const item of input.items) {
      if (item.productId.trim().length === 0) fields.push("productId");
      if (item.unitId.trim().length === 0) fields.push("unitId");
      if (item.quantity <= 0) fields.push("quantity");
      if (item.unitPriceMinor < 0) fields.push("unitPriceMinor");
      if (item.discountMinor < 0) fields.push("itemDiscountMinor");
      if (item.taxMinor < 0) fields.push("itemTaxMinor");
    }
    const subtotalMinor = input.items.reduce(
      (total, item) =>
        total + item.quantity * item.unitPriceMinor - item.discountMinor + item.taxMinor,
      0
    );
    const totalMinor = subtotalMinor - input.discountMinor + input.taxMinor;
    if (totalMinor < 0) fields.push("total");
    if (
      targetStatus === "completed" &&
      input.paymentType === "cash" &&
      input.cashReceivedMinor < totalMinor
    ) {
      fields.push("cashReceivedMinor");
    }
    if (targetStatus === "held" && (input.holdReason ?? "").trim().length === 0) {
      fields.push("holdReason");
    }
    return fields.length > 0
      ? err(validationError("Sale details are missing or invalid.", [...new Set(fields)]))
      : ok(undefined);
  }

  private async publishAfterCommit<T>(
    result: CoreResult<T>,
    events: readonly ApplicationEvent[]
  ): Promise<CoreResult<T>> {
    if (!result.ok) return result;
    for (const event of events) {
      const published = await this.context.eventPublisher.publish(event);
      if (!published.ok) return published;
    }
    return result;
  }

  private event(
    name: string,
    entityId: string,
    input: { readonly storeId: string; readonly userId: string }
  ): ApplicationEvent {
    return {
      id: randomUUID(),
      name,
      version: 1,
      occurredAt: new Date().toISOString(),
      kind: "domain",
      payload: { entityId },
      metadata: { storeId: input.storeId, actorId: input.userId }
    };
  }
}

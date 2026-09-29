import { runWithEvents } from "../shared/transactional-events.js";
import { randomUUID } from "node:crypto";
import type { ApplicationEvent, CoreError, CoreResult } from "@orix/core";
import { err, ok } from "@orix/core";
import type {
  CashRegisterSummary,
  ReceiptModel,
  SaleDetail,
  SaleListQuery,
  SalePage,
  SaleReturnDetail,
  SaleReturnWrite,
  SalesDashboardSummary,
  SaleWrite
} from "@orix/repositories";
import { applicationError } from "../shared/errors.js";
import type { ApplicationServiceContext } from "../shared/service-context.js";

export type SaleMutationOutput = {
  readonly sale: SaleDetail;
  readonly receipt: ReceiptModel | null;
};

export type SaleReturnOutput = {
  readonly return: SaleReturnDetail;
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
    const result = await runWithEvents(
      this.context,
      events,
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
    return result;
  }

  public async holdSale(input: SaleWrite): Promise<CoreResult<SaleMutationOutput>> {
    const validation = this.validateSale(input, "held");
    if (!validation.ok) return validation;
    const events: ApplicationEvent[] = [];
    const result = await runWithEvents(
      this.context,
      events,
      { name: "sales.hold", metadata: { actorId: input.userId } },
      () => {
        const sale = this.context.repositories.sales.saveDraft(input, "held");
        if (!sale.ok) return Promise.resolve(sale);
        events.push(this.event("SaleHeld", sale.value.id, input));
        return Promise.resolve(ok({ sale: sale.value, receipt: null }));
      }
    );
    return result;
  }

  public async completeSale(input: SaleWrite): Promise<CoreResult<SaleMutationOutput>> {
    const validation = this.validateSale(input, "completed");
    if (!validation.ok) return validation;
    if (input.paymentType === "credit" || input.paymentType === "mixed") {
      if (input.customerId === undefined || input.customerId === null) {
        return err(validationError("Credit or mixed payment requires a customer.", ["customerId"]));
      }
      const customer = this.context.repositories.customers.getCustomer(input.customerId);
      if (!customer.ok) return customer;
      if (customer.value?.archivedAt !== null) {
        return err(operationError("Customer was not found or is archived."));
      }
    }
    const events: ApplicationEvent[] = [];
    const result = await runWithEvents(
      this.context,
      events,
      { name: "sales.complete", metadata: { actorId: input.userId } },
      () => {
        if (input.operationId !== undefined) {
          const previous = this.context.repositories.sales.completedOperation(input);
          if (!previous.ok) return Promise.resolve(previous);
          if (previous.value !== undefined) {
            const receipt = this.context.repositories.sales.receipt(previous.value.id);
            return Promise.resolve(
              receipt.ok ? ok({ sale: previous.value, receipt: receipt.value }) : receipt
            );
          }
        }
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
    return result;
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
    const result = await runWithEvents(
      this.context,
      events,
      { name: "sales.cancel", metadata: { actorId: input.userId } },
      () => Promise.resolve(this.context.repositories.sales.cancelDraft(input))
    );
    return result;
  }

  public async returnSale(input: SaleReturnWrite): Promise<CoreResult<SaleReturnOutput>> {
    const validation = this.validateReturn(input);
    if (!validation.ok) return validation;
    const events: ApplicationEvent[] = [];
    const result = await runWithEvents(
      this.context,
      events,
      { name: "sales.return", metadata: { actorId: input.userId } },
      () => {
        const saleReturn = this.context.repositories.sales.returnSale(input);
        if (!saleReturn.ok) return Promise.resolve(saleReturn);
        events.push(this.event("SaleReturned", saleReturn.value.id, input));
        events.push(this.event("InventoryIncreased", saleReturn.value.id, input));
        events.push(this.event("LedgerEntryPosted", saleReturn.value.id, input));
        return Promise.resolve(ok({ return: saleReturn.value }));
      }
    );
    return result;
  }

  private validateSale(
    input: SaleWrite,
    targetStatus: "draft" | "held" | "completed"
  ): CoreResult<void> {
    const fields: string[] = [];
    if (!["cash", "credit", "mixed"].includes(input.paymentType)) fields.push("paymentType");
    if (!Number.isFinite(Date.parse(input.saleDate))) fields.push("saleDate");
    if (new Set(input.items.map((item) => item.productId)).size !== input.items.length)
      fields.push("items");
    if (![input.discountMinor, input.taxMinor, input.cashReceivedMinor].every(Number.isSafeInteger))
      fields.push("amounts");
    if (input.paymentType === "credit" && input.cashReceivedMinor !== 0)
      fields.push("cashReceivedMinor");

    if (input.saleDate.trim().length === 0) fields.push("saleDate");
    if (input.discountMinor < 0) fields.push("discountMinor");
    if (input.taxMinor < 0) fields.push("taxMinor");
    if (input.cashReceivedMinor < 0) fields.push("cashReceivedMinor");
    if (input.items.length === 0) fields.push("items");
    for (const item of input.items) {
      if (item.productId.trim().length === 0) fields.push("productId");
      if (item.unitId.trim().length === 0) fields.push("unitId");
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) fields.push("quantity");
      if (![item.unitPriceMinor, item.discountMinor, item.taxMinor].every(Number.isSafeInteger))
        fields.push("items");
      const lineTotal = item.quantity * item.unitPriceMinor - item.discountMinor + item.taxMinor;
      if (!Number.isSafeInteger(lineTotal) || lineTotal < 0) fields.push("items");
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
    if (!Number.isSafeInteger(totalMinor) || totalMinor < 0) fields.push("total");
    if (
      targetStatus === "completed" &&
      input.paymentType === "cash" &&
      input.cashReceivedMinor < totalMinor
    ) {
      fields.push("cashReceivedMinor");
    }
    if (
      targetStatus === "completed" &&
      input.paymentType === "mixed" &&
      (input.cashReceivedMinor <= 0 || input.cashReceivedMinor >= totalMinor)
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

  private validateReturn(input: SaleReturnWrite): CoreResult<void> {
    const fields: string[] = [];
    if (input.saleId.trim().length === 0) fields.push("saleId");
    if (input.reason.trim().length < 3) fields.push("reason");
    if (input.items.length === 0) fields.push("items");
    for (const item of input.items) {
      if (item.saleItemId.trim().length === 0) fields.push("saleItemId");
      if (item.quantity <= 0) fields.push("quantity");
    }
    return fields.length > 0
      ? err(validationError("Sale return details are missing or invalid.", [...new Set(fields)]))
      : ok(undefined);
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

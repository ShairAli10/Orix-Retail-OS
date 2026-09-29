import { runWithEvents } from "../shared/transactional-events.js";
import { randomUUID } from "node:crypto";
import type { ApplicationEvent, CoreError, CoreResult } from "@orix/core";
import { err, ok } from "@orix/core";
import type {
  PurchaseDetail,
  PurchaseListQuery,
  PurchasePage,
  PurchaseReturnDetail,
  PurchaseReturnWrite,
  PurchaseWrite
} from "@orix/repositories";
import { applicationError } from "../shared/errors.js";
import type { ApplicationServiceContext } from "../shared/service-context.js";

export type PurchaseMutationOutput = {
  readonly purchase: PurchaseDetail;
};

export type PurchaseReturnOutput = {
  readonly return: PurchaseReturnDetail;
};

const validationError = (message: string, fields?: readonly string[]): CoreError =>
  applicationError(
    "APPLICATION_VALIDATION_FAILED",
    message,
    fields === undefined ? undefined : { fields }
  );

const operationError = (message: string): CoreError =>
  applicationError("APPLICATION_OPERATION_FAILED", message);

export class PurchaseManagementApplicationService {
  public constructor(private readonly context: ApplicationServiceContext) {}

  public listPurchases(query: PurchaseListQuery): CoreResult<PurchasePage> {
    return this.context.repositories.purchases.listPurchases(query);
  }

  public getPurchase(id: string): CoreResult<PurchaseDetail | undefined> {
    return this.context.repositories.purchases.getPurchase(id);
  }

  public async saveDraft(input: PurchaseWrite): Promise<CoreResult<PurchaseMutationOutput>> {
    const validation = this.validatePurchase(input);
    if (!validation.ok) return validation;
    const supplier = this.context.repositories.suppliers.getSupplier(input.supplierId);
    if (!supplier.ok) return supplier;
    if (supplier.value?.archivedAt !== null) {
      return err(operationError("Supplier was not found or is archived."));
    }
    const events: ApplicationEvent[] = [];
    const timestamp = new Date().toISOString();
    const result = await runWithEvents(
      this.context,
      events,
      { name: "purchases.save-draft", metadata: { actorId: input.userId } },
      () => {
        const purchase = this.context.repositories.purchases.saveDraft(input);
        if (!purchase.ok) return Promise.resolve(purchase);
        events.push(
          this.event(
            input.id === undefined ? "PurchaseCreated" : "PurchaseUpdated",
            purchase.value.id,
            input,
            timestamp
          )
        );
        return Promise.resolve(ok({ purchase: purchase.value }));
      }
    );
    return result;
  }

  public async receivePurchase(input: {
    readonly id: string;
    readonly storeId: string;
    readonly branchId: string;
    readonly businessDayId: string;
    readonly userId: string;
  }): Promise<CoreResult<PurchaseMutationOutput>> {
    const events: ApplicationEvent[] = [];
    const timestamp = new Date().toISOString();
    const result = await runWithEvents(
      this.context,
      events,
      { name: "purchases.receive", metadata: { actorId: input.userId } },
      () => {
        const purchase = this.context.repositories.purchases.receivePurchase(input);
        if (!purchase.ok) return Promise.resolve(purchase);
        events.push(this.event("PurchaseReceived", input.id, input, timestamp));
        events.push(this.event("InventoryIncreasedFromPurchase", input.id, input, timestamp));
        return Promise.resolve(ok({ purchase: purchase.value }));
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
    const events = [this.event("PurchaseCancelled", input.id, input, new Date().toISOString())];
    const result = await runWithEvents(
      this.context,
      events,
      { name: "purchases.cancel", metadata: { actorId: input.userId } },
      () => Promise.resolve(this.context.repositories.purchases.cancelDraft(input))
    );
    return result;
  }

  public async returnPurchase(
    input: PurchaseReturnWrite
  ): Promise<CoreResult<PurchaseReturnOutput>> {
    const validation = this.validateReturn(input);
    if (!validation.ok) return validation;
    const events: ApplicationEvent[] = [];
    const timestamp = new Date().toISOString();
    const result = await runWithEvents(
      this.context,
      events,
      { name: "purchases.return", metadata: { actorId: input.userId } },
      () => {
        const purchaseReturn = this.context.repositories.purchases.returnPurchase(input);
        if (!purchaseReturn.ok) return Promise.resolve(purchaseReturn);
        events.push(this.event("PurchaseReturned", purchaseReturn.value.id, input, timestamp));
        events.push(this.event("InventoryReduced", purchaseReturn.value.id, input, timestamp));
        events.push(this.event("LedgerEntryPosted", purchaseReturn.value.id, input, timestamp));
        return Promise.resolve(ok({ return: purchaseReturn.value }));
      }
    );
    return result;
  }

  private validatePurchase(input: PurchaseWrite): CoreResult<void> {
    const fields: string[] = [];
    if (input.supplierId.trim().length === 0) fields.push("supplierId");
    if (input.purchaseDate.trim().length === 0) fields.push("purchaseDate");
    if (input.discountMinor < 0) fields.push("discountMinor");
    if (input.taxMinor < 0) fields.push("taxMinor");
    if (input.freightMinor < 0) fields.push("freightMinor");
    if (input.otherChargesMinor < 0) fields.push("otherChargesMinor");
    if (input.items.length === 0) fields.push("items");
    for (const item of input.items) {
      if (item.productId.trim().length === 0) fields.push("productId");
      if (item.unitId.trim().length === 0) fields.push("unitId");
      if (item.quantity <= 0) fields.push("quantity");
      if (item.unitCostMinor < 0) fields.push("unitCostMinor");
      if (item.discountMinor < 0) fields.push("itemDiscountMinor");
      if (item.taxMinor < 0) fields.push("itemTaxMinor");
    }
    return fields.length > 0
      ? err(validationError("Purchase details are missing or invalid.", [...new Set(fields)]))
      : ok(undefined);
  }

  private validateReturn(input: PurchaseReturnWrite): CoreResult<void> {
    const fields: string[] = [];
    if (input.purchaseId.trim().length === 0) fields.push("purchaseId");
    if (input.reason.trim().length < 3) fields.push("reason");
    if (input.items.length === 0) fields.push("items");
    for (const item of input.items) {
      if (item.purchaseItemId.trim().length === 0) fields.push("purchaseItemId");
      if (item.quantity <= 0) fields.push("quantity");
    }
    return fields.length > 0
      ? err(
          validationError("Purchase return details are missing or invalid.", [...new Set(fields)])
        )
      : ok(undefined);
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

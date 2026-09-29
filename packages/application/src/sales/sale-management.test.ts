import type { EventPublisher, TransactionContext } from "@orix/core";
import { ok, type CoreResult } from "@orix/core";
import type {
  ReceiptModel,
  RepositoryFactory,
  SaleDetail,
  SaleReturnDetail
} from "@orix/repositories";
import { describe, expect, it } from "vitest";
import { SaleManagementApplicationService } from "./sale-management.js";

const sale: SaleDetail = {
  returnStatus: "none",
  refundedMinor: 0,
  netTotalMinor: 10000,
  id: "sale-1",
  saleNumber: "SALE-000001",
  customerId: null,
  customerName: null,
  saleDate: "2026-06-30T10:00:00.000Z",
  itemCount: 1,
  subtotalMinor: 10000,
  discountMinor: 0,
  taxMinor: 0,
  totalMinor: 10000,
  paidMinor: 10000,
  changeDueMinor: 0,
  paymentType: "cash",
  status: "completed",
  completedAt: "2026-06-30T10:01:00.000Z",
  cancelledAt: null,
  updatedAt: "2026-06-30T10:01:00.000Z",
  notes: null,
  holdReason: null,
  items: [
    {
      id: "sale-item-1",
      productId: "product-1",
      productName: "Rice",
      barcode: "123456",
      unitId: "unit-1",
      unitName: "Piece",
      quantity: 2,
      unitPriceMinor: 5000,
      discountMinor: 0,
      taxMinor: 0,
      lineTotalMinor: 10000,
      returnedQuantity: 0
    }
  ],
  createdAt: "2026-06-30T10:00:00.000Z",
  createdByUserId: "user-1",
  cashierName: "Cashier"
};

const receipt: ReceiptModel = {
  saleId: sale.id,
  saleNumber: sale.saleNumber,
  saleDate: sale.completedAt ?? sale.saleDate,
  cashierName: sale.cashierName,
  customerName: "Walk-in Customer",
  subtotalMinor: sale.subtotalMinor,
  discountMinor: sale.discountMinor,
  totalMinor: sale.totalMinor,
  paidMinor: sale.paidMinor,
  changeDueMinor: sale.changeDueMinor,
  paymentType: sale.paymentType,
  items: [{ name: "Rice", quantity: 2, unitPriceMinor: 5000, lineTotalMinor: 10000 }]
};

const saleReturn: SaleReturnDetail = {
  id: "return-1",
  returnNumber: "SR-000001",
  saleId: sale.id,
  saleNumber: sale.saleNumber,
  customerId: null,
  customerName: null,
  reason: "Customer returned item",
  refundMethod: "cash",
  totalRefundMinor: 5000,
  cashRefundMinor: 5000,
  receivableReductionMinor: 0,
  returnedAt: "2026-06-30T10:10:00.000Z",
  items: [
    {
      id: "return-item-1",
      saleItemId: "sale-item-1",
      productId: "product-1",
      productName: "Rice",
      quantity: 1,
      condition: "sellable",
      restockAction: "return-to-stock",
      unitPriceMinor: 5000,
      lineTotalMinor: 5000
    }
  ]
};

const transaction = (): TransactionContext => ({
  id: "tx-sale",
  depth: 0,
  isolationLevel: "immediate",
  metadata: {}
});

const createService = () => {
  const events: string[] = [];
  let transactionCount = 0;
  const repositories = {
    sales: {
      completeSale: () => ok(sale),
      receipt: () => ok(receipt),
      returnSale: () => ok(saleReturn)
    },
    customers: {
      getCustomer: () =>
        ok({
          id: "customer-1",
          archivedAt: null
        })
    }
  } as unknown as RepositoryFactory;
  const publisher: EventPublisher = {
    publish: (event) => {
      events.push(event.name);
      return Promise.resolve(ok(undefined));
    }
  };
  const service = new SaleManagementApplicationService({
    repositories,
    eventPublisher: publisher,
    transactionRunner: {
      run: async <T>(
        _options: { readonly name: string },
        scope: (context: TransactionContext) => Promise<CoreResult<T>>
      ) => {
        transactionCount += 1;
        return scope(transaction());
      }
    }
  });
  return { service, events, transactionCount: () => transactionCount };
};

describe("SaleManagementApplicationService", () => {
  it("completes a cash sale in a transaction and publishes sale events after success", async () => {
    const setup = createService();

    const result = await setup.service.completeSale({
      storeId: "store-1",
      branchId: "branch-1",
      businessDayId: "day-1",
      userId: "user-1",
      customerId: null,
      saleDate: "2026-06-30T10:00:00.000Z",
      paymentType: "cash",
      discountMinor: 0,
      taxMinor: 0,
      cashReceivedMinor: 10000,
      items: [
        {
          productId: "product-1",
          unitId: "unit-1",
          quantity: 2,
          unitPriceMinor: 5000,
          discountMinor: 0,
          taxMinor: 0
        }
      ]
    });

    expect(result.ok).toBe(true);
    expect(setup.transactionCount()).toBe(1);
    expect(setup.events).toEqual(["SaleCompleted", "InventoryReduced"]);
  });

  it("rejects underpaid cash sales before opening a transaction", async () => {
    const setup = createService();

    const result = await setup.service.completeSale({
      storeId: "store-1",
      branchId: "branch-1",
      businessDayId: "day-1",
      userId: "user-1",
      saleDate: "2026-06-30T10:00:00.000Z",
      paymentType: "cash",
      discountMinor: 0,
      taxMinor: 0,
      cashReceivedMinor: 9000,
      items: [
        {
          productId: "product-1",
          unitId: "unit-1",
          quantity: 2,
          unitPriceMinor: 5000,
          discountMinor: 0,
          taxMinor: 0
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(setup.transactionCount()).toBe(0);
    expect(setup.events).toEqual([]);
  });

  it("requires a customer for credit sales", async () => {
    const setup = createService();

    const result = await setup.service.completeSale({
      storeId: "store-1",
      branchId: "branch-1",
      businessDayId: "day-1",
      userId: "user-1",
      saleDate: "2026-06-30T10:00:00.000Z",
      paymentType: "credit",
      discountMinor: 0,
      taxMinor: 0,
      cashReceivedMinor: 0,
      items: [
        {
          productId: "product-1",
          unitId: "unit-1",
          quantity: 1,
          unitPriceMinor: 5000,
          discountMinor: 0,
          taxMinor: 0
        }
      ]
    });

    expect(result.ok).toBe(false);
    expect(setup.transactionCount()).toBe(0);
  });

  it("requires a customer and partial cash for mixed payments", async () => {
    const setup = createService();

    const noCustomer = await setup.service.completeSale({
      storeId: "store-1",
      branchId: "branch-1",
      businessDayId: "day-1",
      userId: "user-1",
      saleDate: "2026-06-30T10:00:00.000Z",
      paymentType: "mixed",
      discountMinor: 0,
      taxMinor: 0,
      cashReceivedMinor: 3000,
      items: [
        {
          productId: "product-1",
          unitId: "unit-1",
          quantity: 1,
          unitPriceMinor: 5000,
          discountMinor: 0,
          taxMinor: 0
        }
      ]
    });
    const fullCash = await setup.service.completeSale({
      storeId: "store-1",
      branchId: "branch-1",
      businessDayId: "day-1",
      userId: "user-1",
      customerId: "customer-1",
      saleDate: "2026-06-30T10:00:00.000Z",
      paymentType: "mixed",
      discountMinor: 0,
      taxMinor: 0,
      cashReceivedMinor: 5000,
      items: [
        {
          productId: "product-1",
          unitId: "unit-1",
          quantity: 1,
          unitPriceMinor: 5000,
          discountMinor: 0,
          taxMinor: 0
        }
      ]
    });

    expect(noCustomer.ok).toBe(false);
    expect(fullCash.ok).toBe(false);
    expect(setup.transactionCount()).toBe(0);
  });

  it("returns a sale in a transaction and publishes return events", async () => {
    const setup = createService();

    const result = await setup.service.returnSale({
      saleId: sale.id,
      storeId: "store-1",
      branchId: "branch-1",
      businessDayId: "day-1",
      userId: "user-1",
      reason: "Customer returned item",
      refundMethod: "cash",
      items: [{ saleItemId: "sale-item-1", quantity: 1, condition: "sellable" }]
    });

    expect(result.ok).toBe(true);
    expect(setup.transactionCount()).toBe(1);
    expect(setup.events).toEqual(["SaleReturned", "InventoryIncreased", "LedgerEntryPosted"]);
  });
});

import type { EventPublisher, TransactionContext } from "@orix/core";
import { ok, type CoreResult } from "@orix/core";
import type { ReceiptModel, RepositoryFactory, SaleDetail } from "@orix/repositories";
import { describe, expect, it } from "vitest";
import { SaleManagementApplicationService } from "./sale-management.js";

const sale: SaleDetail = {
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
      lineTotalMinor: 10000
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
      receipt: () => ok(receipt)
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
});

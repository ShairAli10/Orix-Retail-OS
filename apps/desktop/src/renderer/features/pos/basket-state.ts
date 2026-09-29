import type { SalePaymentType } from "@orix/electron";
export type PosCartItem = {
  readonly productId: string;
  readonly productName: string;
  readonly barcode: string | null;
  readonly unitId: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly currentStock: number;
};

export type SaleFormState = {
  readonly operationId: string;
  readonly id?: string;
  readonly customerId: string;
  readonly saleNumber: string;
  readonly saleDate: string;
  readonly paymentType: SalePaymentType;
  readonly discount: string;
  readonly tax: string;
  readonly cashReceived: string;
  readonly notes: string;
  readonly holdReason: string;
  readonly items: readonly PosCartItem[];
  readonly expectedUpdatedAt?: string | null;
};

export const emptySaleForm = (): SaleFormState => ({
  operationId: crypto.randomUUID(),
  customerId: "",
  saleNumber: "",
  saleDate: new Date().toISOString(),
  paymentType: "cash",
  discount: "0",
  tax: "0",
  cashReceived: "0",
  notes: "",
  holdReason: "",
  items: []
});

export const loadBasket = (key: string): SaleFormState => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return emptySaleForm();
    const value: unknown = JSON.parse(raw);
    if (value === null || typeof value !== "object") return emptySaleForm();
    const basket = value as SaleFormState;
    if (
      typeof basket.operationId !== "string" ||
      !Array.isArray(basket.items) ||
      basket.items.length === 0 ||
      basket.items.length > 10000 ||
      !Number.isFinite(Date.parse(basket.saleDate))
    )
      return emptySaleForm();
    const strings = [
      basket.customerId,
      basket.saleNumber,
      basket.saleDate,
      basket.discount,
      basket.tax,
      basket.cashReceived,
      basket.notes,
      basket.holdReason
    ];
    if (
      !strings.every((v) => typeof v === "string") ||
      !["cash", "credit", "mixed"].includes(basket.paymentType)
    )
      return emptySaleForm();
    if (
      !basket.items.every(
        (item: PosCartItem) =>
          typeof item.productId === "string" &&
          typeof item.productName === "string" &&
          typeof item.unitId === "string" &&
          Number.isFinite(item.quantity) &&
          item.quantity > 0 &&
          [item.unitPriceMinor, item.discountMinor, item.taxMinor].every(Number.isSafeInteger)
      )
    )
      return emptySaleForm();
    return basket;
  } catch {
    return emptySaleForm();
  }
};
export const saveBasket = (key: string, basket: SaleFormState): boolean => {
  try {
    if (basket.items.length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(basket));
    return true;
  } catch {
    return false;
  }
};

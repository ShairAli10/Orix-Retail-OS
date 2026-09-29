import { refundForQuantity } from "@orix/core";

type ReturnSale = {
  readonly totalMinor: number;
  readonly items: readonly {
    readonly id: string;
    readonly quantity: number;
    readonly returnedQuantity: number;
    readonly lineTotalMinor: number;
  }[];
};

export const returnPreview = (sale: ReturnSale, quantities: Readonly<Record<string, string>>) => {
  let totalMinor = 0;
  let selected = false;
  for (const item of sale.items) {
    const quantity = Number(quantities[item.id] ?? "0");
    if (
      !Number.isFinite(quantity) ||
      quantity < 0 ||
      quantity > item.quantity - item.returnedQuantity
    ) {
      return { totalMinor: 0, valid: false };
    }
    if (quantity > 0) {
      selected = true;
      totalMinor += refundForQuantity(sale.totalMinor, sale.items, item.id, quantity);
    }
  }
  return { totalMinor, valid: selected && totalMinor > 0 };
};

export const returnBlockingMessage = (
  sale: ReturnSale,
  quantities: Readonly<Record<string, string>>,
  reason: string
): string | null => {
  if (sale.items.every((item) => item.returnedQuantity >= item.quantity))
    return "All items on this sale have already been returned.";
  const values = sale.items.map((item) => ({ item, quantity: Number(quantities[item.id] ?? "0") }));
  if (
    values.some(
      ({ item, quantity }) =>
        !Number.isFinite(quantity) ||
        quantity < 0 ||
        quantity > item.quantity - item.returnedQuantity
    )
  )
    return "Enter quantities between zero and the available amount for each item.";
  if (!values.some(({ quantity }) => quantity > 0))
    return "Enter a return quantity for at least one item.";
  if (!returnPreview(sale, quantities).valid)
    return "The selected quantity has no refundable amount.";
  if (reason.trim().length < 3) return "Enter a reason of at least 3 characters.";
  return null;
};

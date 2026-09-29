import { expect, it } from "vitest";
import { returnPreview } from "./return-preview.js";
const sale = {
  totalMinor: 437,
  items: [
    { id: "one", quantity: 3, returnedQuantity: 0, lineTotalMinor: 300 },
    { id: "two", quantity: 2, returnedQuantity: 0, lineTotalMinor: 200 }
  ]
};
it("previews the original net total with document discounts and tax", () => {
  expect(returnPreview(sale, { one: "3", two: "2" })).toEqual({ totalMinor: 437, valid: true });
});
it("preserves cumulative rounding on later partial returns", () => {
  const first = returnPreview(sale, { one: "1" }).totalMinor;
  const remaining = returnPreview(
    {
      ...sale,
      items: sale.items.map((item) => (item.id === "one" ? { ...item, returnedQuantity: 1 } : item))
    },
    { one: "2", two: "2" }
  ).totalMinor;
  expect(first + remaining).toBe(437);
});
it.each(["-1", "4", "Infinity", "NaN"])("rejects invalid quantity %s", (quantity) => {
  expect(returnPreview(sale, { one: quantity }).valid).toBe(false);
});
it("rejects an empty selection and accepts fractional quantities", () => {
  expect(returnPreview(sale, {}).valid).toBe(false);
  expect(returnPreview(sale, { one: "0.5" }).valid).toBe(true);
});

it("explains why a return cannot be submitted", async () => {
  const { returnBlockingMessage } = await import("./return-preview.js");
  expect(returnBlockingMessage(sale, {}, "")).toBe(
    "Enter a return quantity for at least one item."
  );
  expect(returnBlockingMessage(sale, { one: "4" }, "Reason")).toBe(
    "Enter quantities between zero and the available amount for each item."
  );
  expect(returnBlockingMessage(sale, { one: "1" }, "ab")).toBe(
    "Enter a reason of at least 3 characters."
  );
  expect(returnBlockingMessage(sale, { one: "1" }, "Reason")).toBeNull();
  const returned = {
    ...sale,
    items: sale.items.map((item) => ({ ...item, returnedQuantity: item.quantity }))
  };
  expect(returnBlockingMessage(returned, {}, "")).toBe(
    "All items on this sale have already been returned."
  );
});

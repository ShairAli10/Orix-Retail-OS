import { expect, it } from "vitest";
import { refundForQuantity } from "./refund-allocation.js";
it("conserves discounted and taxed document cents across partial returns", () => {
  const lines = [
    { id: "one", quantity: 3, returnedQuantity: 0, lineTotalMinor: 300 },
    { id: "two", quantity: 2, returnedQuantity: 0, lineTotalMinor: 200 }
  ];
  let refunded = 0;
  for (const line of lines) {
    for (let count = 0; count < line.quantity; count++) {
      refunded += refundForQuantity(437, lines, line.id, 1);
      line.returnedQuantity++;
    }
  }
  expect(refunded).toBe(437);
});
it("refunds only net amounts and includes allocated document tax", () => {
  const lines = [{ id: "one", quantity: 1, returnedQuantity: 0, lineTotalMinor: 800 }];
  expect(refundForQuantity(720, lines, "one", 1)).toBe(720);
  expect(refundForQuantity(880, lines, "one", 1)).toBe(880);
});

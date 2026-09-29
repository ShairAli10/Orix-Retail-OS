type RefundLine = {
  readonly id: string;
  readonly quantity: number;
  readonly returnedQuantity: number;
  readonly lineTotalMinor: number;
};

// Allocate the document net total once; cumulative rounding prevents penny drift
// when the same line is returned in several separate transactions.
export const refundForQuantity = (
  totalMinor: number,
  lines: readonly RefundLine[],
  id: string,
  quantity: number
): number => {
  const sum = lines.reduce((total, line) => total + line.lineTotalMinor, 0);
  let weight = 0;
  for (const line of lines) {
    const previous = weight;
    weight += line.lineTotalMinor;
    if (line.id !== id) continue;
    const allocated =
      sum === 0
        ? 0
        : Math.round((totalMinor * weight) / sum) - Math.round((totalMinor * previous) / sum);
    return (
      Math.round((allocated * (line.returnedQuantity + quantity)) / line.quantity) -
      Math.round((allocated * line.returnedQuantity) / line.quantity)
    );
  }
  throw new Error("Return line does not belong to the original document.");
};

import { DomainError } from "./errors.js";

export class Quantity {
  public readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  public static fromString(value: string): Quantity {
    const normalized = value.trim();

    if (!/^(0|[1-9]\d*)(\.\d{1,6})?$/.test(normalized)) {
      throw new DomainError({
        code: "quantity.invalid",
        message: "Quantity must be a non-negative decimal with up to 6 decimal places."
      });
    }

    return new Quantity(normalized);
  }

  public static zero(): Quantity {
    return new Quantity("0");
  }
}

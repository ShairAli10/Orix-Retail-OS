import { DomainError } from "./errors.js";

export type CurrencyCode = string;

export class Money {
  public readonly amountMinor: number;
  public readonly currencyCode: CurrencyCode;

  private constructor(amountMinor: number, currencyCode: CurrencyCode) {
    this.amountMinor = amountMinor;
    this.currencyCode = currencyCode;
  }

  public static fromMinor(amountMinor: number, currencyCode: CurrencyCode = "PKR"): Money {
    if (!Number.isSafeInteger(amountMinor)) {
      throw new DomainError({
        code: "money.invalid_minor_amount",
        message: "Money amount must be a safe integer minor-unit value."
      });
    }

    return new Money(amountMinor, currencyCode);
  }

  public static zero(currencyCode: CurrencyCode = "PKR"): Money {
    return new Money(0, currencyCode);
  }

  public add(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromMinor(this.amountMinor + other.amountMinor, this.currencyCode);
  }

  public subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return Money.fromMinor(this.amountMinor - other.amountMinor, this.currencyCode);
  }

  public isNegative(): boolean {
    return this.amountMinor < 0;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currencyCode !== other.currencyCode) {
      throw new DomainError({
        code: "money.currency_mismatch",
        message: "Money values must use the same currency."
      });
    }
  }
}

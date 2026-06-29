import { DomainError } from "@orix/shared";

export class PurchaseDomainError extends DomainError {
  public constructor(message: string) {
    super({ code: "purchase.domain_error", message });
  }
}

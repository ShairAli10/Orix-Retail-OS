import { DomainError } from "@orix/shared";

export class PaymentDomainError extends DomainError {
  public constructor(message: string) {
    super({ code: "payment.domain_error", message });
  }
}

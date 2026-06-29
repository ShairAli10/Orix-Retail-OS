import { DomainError } from "@orix/shared";

export class SaleDomainError extends DomainError {
  public constructor(message: string) {
    super({ code: "sale.domain_error", message });
  }
}

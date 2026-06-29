import { DomainError } from "@orix/shared";

export class CustomerDomainError extends DomainError {
  public constructor(message: string) {
    super({ code: "customer.domain_error", message });
  }
}

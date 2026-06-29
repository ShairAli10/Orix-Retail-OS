import { DomainError } from "@orix/shared";

export class ProductDomainError extends DomainError {
  public constructor(message: string) {
    super({ code: "product.domain_error", message });
  }
}

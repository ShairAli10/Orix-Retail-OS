import { DomainError } from "@orix/shared";

export class SupplierDomainError extends DomainError {
  public constructor(message: string) {
    super({ code: "supplier.domain_error", message });
  }
}

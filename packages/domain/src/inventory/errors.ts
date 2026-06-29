import { DomainError } from "@orix/shared";

export class InventoryDomainError extends DomainError {
  public constructor(message: string) {
    super({ code: "inventory.domain_error", message });
  }
}

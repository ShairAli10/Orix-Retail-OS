import { DomainError } from "@orix/shared";

export class LedgerDomainError extends DomainError {
  public constructor(message: string) {
    super({ code: "ledger.domain_error", message });
  }
}

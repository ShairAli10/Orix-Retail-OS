import { DomainError } from "@orix/shared";

export class DomainContractError extends DomainError {
  public constructor(message: string) {
    super({
      code: "domain.contract_violation",
      message
    });
  }
}

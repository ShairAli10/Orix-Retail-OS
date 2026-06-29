import { DomainError } from "@orix/shared";

export class ExpenseDomainError extends DomainError {
  public constructor(message: string) {
    super({ code: "expense.domain_error", message });
  }
}

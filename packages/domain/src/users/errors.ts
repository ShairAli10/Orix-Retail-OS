import { DomainError } from "@orix/shared";

export class UserDomainError extends DomainError {
  public constructor(message: string) {
    super({ code: "user.domain_error", message });
  }
}

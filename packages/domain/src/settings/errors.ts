import { DomainError } from "@orix/shared";

export class SettingsDomainError extends DomainError {
  public constructor(message: string) {
    super({ code: "settings.domain_error", message });
  }
}

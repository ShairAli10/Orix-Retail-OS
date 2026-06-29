import type { StoreId } from "@orix/shared";
import type { DomainEvent } from "../shared/index.js";

export type SettingsUpdated = DomainEvent<
  "SettingsUpdated",
  {
    readonly storeId: StoreId;
    readonly key: string;
  }
>;

export type SettingsEvent = SettingsUpdated;

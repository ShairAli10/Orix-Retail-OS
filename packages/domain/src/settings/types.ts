import type { StoreId } from "@orix/shared";
import type { AuditStamp } from "../shared/index.js";

export type SettingCategory =
  "inventory" | "receipts" | "backup" | "reports" | "security" | "general";

export type SettingContract = AuditStamp & {
  readonly storeId: StoreId;
  readonly key: string;
  readonly category: SettingCategory;
  readonly value: unknown;
  readonly isLocked: boolean;
};

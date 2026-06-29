import { check, index, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { businessDays } from "./business-days.js";
import { cashAccounts } from "./cash-accounts.js";
import {
  moneyColumn,
  nonNegative,
  requiredMoneyColumn,
  requiredTimestampColumn,
  requiredUuidColumn,
  timestampColumn,
  uuidColumn,
  uuidPrimaryKey
} from "./shared.js";
import { users } from "./users.js";

export const cashSessions = sqliteTable(
  "cash_sessions",
  {
    id: uuidPrimaryKey(),
    cashAccountId: requiredUuidColumn("cash_account_id").references(() => cashAccounts.id),
    businessDayId: requiredUuidColumn("business_day_id").references(() => businessDays.id),
    openedAt: requiredTimestampColumn("opened_at"),
    openedByUserId: requiredUuidColumn("opened_by_user_id").references(() => users.id),
    openingCashMinor: requiredMoneyColumn("opening_cash_minor"),
    closedAt: timestampColumn("closed_at"),
    closedByUserId: uuidColumn("closed_by_user_id").references(() => users.id),
    expectedCashMinor: moneyColumn("expected_cash_minor"),
    countedCashMinor: moneyColumn("counted_cash_minor"),
    varianceMinor: moneyColumn("variance_minor"),
    status: text("status").notNull().default("open"),
    notes: text("notes")
  },
  (table) => ({
    cashAccountStatusIdx: index("cash_sessions_account_status_idx").on(
      table.cashAccountId,
      table.status
    ),
    businessDayIdx: index("cash_sessions_business_day_idx").on(table.businessDayId),
    openedAtIdx: index("cash_sessions_opened_at_idx").on(table.openedAt),
    closedAtIdx: index("cash_sessions_closed_at_idx").on(table.closedAt),
    openingCashNonNegative: check(
      "cash_sessions_opening_cash_non_negative",
      nonNegative("opening_cash_minor")
    )
  })
);

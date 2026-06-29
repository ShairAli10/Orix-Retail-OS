import type { LedgerTransactionId, Money, StoreId } from "@orix/shared";
import type { DomainReference, PostedAt } from "../shared/index.js";

export type LedgerTransactionStatus = "draft" | "posted" | "reversed";
export type LedgerAccountType =
  "cash" | "customer_receivable" | "supplier_payable" | "revenue" | "purchase" | "expense";

export type LedgerEntryContract = {
  readonly accountType: LedgerAccountType;
  readonly accountReference?: DomainReference;
  readonly debit: Money;
  readonly credit: Money;
};

export type LedgerTransactionContract = {
  readonly id: LedgerTransactionId;
  readonly storeId: StoreId;
  readonly status: LedgerTransactionStatus;
  readonly postedAt?: PostedAt;
  readonly entries: readonly LedgerEntryContract[];
};

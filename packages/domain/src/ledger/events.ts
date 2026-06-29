import type { LedgerTransactionId } from "@orix/shared";
import type { DomainEvent } from "../shared/index.js";

export type LedgerEntryPosted = DomainEvent<
  "LedgerEntryPosted",
  {
    readonly ledgerTransactionId: LedgerTransactionId;
  }
>;

export type LedgerEntryReversed = DomainEvent<
  "LedgerEntryReversed",
  {
    readonly ledgerTransactionId: LedgerTransactionId;
    readonly reason: string;
  }
>;

export type LedgerEvent = LedgerEntryPosted | LedgerEntryReversed;

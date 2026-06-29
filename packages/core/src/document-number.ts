import type { CoreResult } from "./result.js";

export type DocumentNumberKind =
  | "sale"
  | "purchase"
  | "customer-payment"
  | "supplier-payment"
  | "sale-return"
  | "purchase-return"
  | "expense"
  | "stock-adjustment"
  | "business-day"
  | "custom";

export type DocumentNumberRequest = {
  readonly kind: DocumentNumberKind;
  readonly storeId: string;
  readonly branchId?: string;
  readonly businessDate?: string;
  readonly customRuleKey?: string;
};

export type DocumentNumberPreview = {
  readonly nextValue: string;
  readonly ruleKey: string;
};

export interface DocumentNumberGenerator {
  next(request: DocumentNumberRequest): Promise<CoreResult<string>>;

  preview(request: DocumentNumberRequest): Promise<CoreResult<DocumentNumberPreview>>;
}

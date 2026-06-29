import type { CoreResult } from "./result.js";

export type PrinterId = string;

export type ReceiptLine = {
  readonly text: string;
  readonly align?: "left" | "center" | "right";
  readonly emphasis?: boolean;
};

export type ReceiptDocument = {
  readonly title?: string;
  readonly lines: readonly ReceiptLine[];
};

export type PrintReceiptRequest = {
  readonly printerId?: PrinterId;
  readonly document: ReceiptDocument;
  readonly openCashDrawer?: boolean;
};

export type PrinterStatus = "online" | "offline" | "paper-out" | "unknown";

export interface ReceiptPrinter {
  printReceipt(request: PrintReceiptRequest): Promise<CoreResult<void>>;

  getStatus(printerId?: PrinterId): Promise<CoreResult<PrinterStatus>>;

  openCashDrawer(printerId?: PrinterId): Promise<CoreResult<void>>;
}

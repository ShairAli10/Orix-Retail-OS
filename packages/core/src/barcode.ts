import type { CoreResult } from "./result.js";

export type BarcodeFormat = "ean13" | "ean8" | "code128" | "qr" | "upc";

export type BarcodeImageFormat = "svg" | "png";

export type BarcodeGenerateRequest = {
  readonly value: string;
  readonly format: BarcodeFormat;
  readonly imageFormat: BarcodeImageFormat;
};

export type BarcodeImage = {
  readonly content: Uint8Array | string;
  readonly contentType: string;
};

export type BarcodeScan = {
  readonly value: string;
  readonly format?: BarcodeFormat;
  readonly scannedAt: string;
};

export interface BarcodeGenerator {
  generate(request: BarcodeGenerateRequest): Promise<CoreResult<BarcodeImage>>;
}

export interface BarcodeScanner {
  start(): Promise<CoreResult<void>>;

  stop(): Promise<CoreResult<void>>;

  onScan(handler: (scan: BarcodeScan) => Promise<CoreResult<void>>): Promise<CoreResult<void>>;
}

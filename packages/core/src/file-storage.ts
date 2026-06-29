import type { CoreResult } from "./result.js";

export type FileStorageArea = "backups" | "exports" | "receipts" | "attachments" | "temporary";

export type StoredFileMetadata = Readonly<Record<string, string | number | boolean>>;

export type StoredFile = {
  readonly id: string;
  readonly area: FileStorageArea;
  readonly path: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly checksum?: string;
  readonly metadata?: StoredFileMetadata;
};

export type StoreFileRequest = {
  readonly area: FileStorageArea;
  readonly fileName: string;
  readonly contentType: string;
  readonly content: Uint8Array;
  readonly metadata?: StoredFileMetadata;
};

export interface FileStorage {
  store(request: StoreFileRequest): Promise<CoreResult<StoredFile>>;

  read(fileId: string): Promise<CoreResult<Uint8Array>>;

  exists(fileId: string): Promise<CoreResult<boolean>>;

  delete(fileId: string): Promise<CoreResult<void>>;
}

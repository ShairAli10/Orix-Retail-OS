import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

export type BackupVerificationResult = {
  readonly valid: boolean;
  readonly message: string;
  readonly checkedAt: string;
};

export const backupTimestamp = (date: Date): string =>
  date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}Z$/, "Z");

export const buildBackupNumber = (date: Date): string => `BK-${backupTimestamp(date)}`;

export const buildBackupFileName = (date: Date): string =>
  `orix-retail-os-${backupTimestamp(date)}.sqlite`;

export const calculateFileChecksum = async (filePath: string): Promise<string> =>
  new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => {
      hash.update(chunk);
    });
    stream.on("error", reject);
    stream.on("end", () => {
      resolve(hash.digest("hex"));
    });
  });

export const verificationOk = (message: string): BackupVerificationResult => ({
  valid: true,
  message,
  checkedAt: new Date().toISOString()
});

export const verificationFailed = (message: string): BackupVerificationResult => ({
  valid: false,
  message,
  checkedAt: new Date().toISOString()
});

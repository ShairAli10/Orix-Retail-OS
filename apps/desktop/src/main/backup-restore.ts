import { randomUUID } from "node:crypto";
import { open, rename, rm } from "node:fs/promises";
import { resolve } from "node:path";
import { createDatabaseConnection } from "@orix/database";

// SQLite's backup API includes committed WAL pages. A plain file copy does not.
export const stageDatabaseRestore = async (
  sourcePath: string,
  livePath: string,
  verify: (path: string) => boolean
): Promise<string> => {
  if (resolve(sourcePath) === resolve(livePath)) throw new Error("Choose a separate backup file.");
  const staged = `${livePath}.restore-${randomUUID()}`;
  const source = createDatabaseConnection({
    filePath: sourcePath,
    mode: "readonly",
    enableWal: false
  });
  try {
    await source.sqlite.backup(staged);
    if (!verify(staged)) throw new Error("Staged backup did not pass verification.");
    const file = await open(staged, "r+");
    try {
      await file.sync();
    } finally {
      await file.close();
    }
    return staged;
  } catch (error) {
    await rm(staged, { force: true });
    throw error;
  } finally {
    source.close();
  }
};

// Staging is beside the live file, so rename is an atomic same-filesystem replacement.
// The caller must close SQLite and block further IPC before this point.
export const replaceWithStagedRestore = async (
  stagedPath: string,
  livePath: string
): Promise<void> => {
  await rename(stagedPath, livePath);
};

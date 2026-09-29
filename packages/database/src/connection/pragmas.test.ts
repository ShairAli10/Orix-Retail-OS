import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { createDatabaseConnection } from "../index.js";
it("uses FULL synchronization for durable WAL commits on the store database", () => {
  const directory = mkdtempSync(join(tmpdir(), "orix-durable-"));
  const connection = createDatabaseConnection({ filePath: join(directory, "store.sqlite") });
  try {
    expect(connection.sqlite.pragma("journal_mode", { simple: true })).toBe("wal");
    expect(connection.sqlite.pragma("synchronous", { simple: true })).toBe(2);
  } finally {
    connection.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

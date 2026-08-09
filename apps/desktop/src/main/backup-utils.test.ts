import { describe, expect, it } from "vitest";
import { backupTimestamp, buildBackupFileName, buildBackupNumber } from "./backup-utils.js";

describe("backup utilities", () => {
  const date = new Date("2026-08-09T10:11:12.345Z");

  it("creates sortable backup timestamps", () => {
    expect(backupTimestamp(date)).toBe("20260809T101112Z");
  });

  it("creates user-readable backup numbers", () => {
    expect(buildBackupNumber(date)).toBe("BK-20260809T101112Z");
  });

  it("creates sqlite backup file names", () => {
    expect(buildBackupFileName(date)).toBe("orix-retail-os-20260809T101112Z.sqlite");
  });
});

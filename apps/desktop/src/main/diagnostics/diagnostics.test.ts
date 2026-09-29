import { afterEach, expect, it } from "vitest";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  statSync
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Diagnostics } from "./diagnostics.js";
const directories: string[] = [];
const directory = () => {
  const path = mkdtempSync(join(tmpdir(), "orix-support-"));
  directories.push(path);
  return path;
};
afterEach(() => {
  for (const path of directories.splice(0)) rmSync(path, { recursive: true, force: true });
});
const metadata = {
  appVersion: "0.1.0-rc.1",
  buildId: "abcd1234",
  platform: "win32",
  arch: "x64",
  osRelease: "10.0.26100",
  electron: "33.4.11",
  node: "20.18.1"
};
it("detects an interrupted session but not a clean shutdown", () => {
  const path = directory();
  const first = new Diagnostics(path, metadata);
  first.beginSession();
  const second = new Diagnostics(path, metadata);
  expect(second.status().previousUncleanShutdown).toBe(true);
  second.beginSession();
  second.cleanShutdown();
  expect(new Diagnostics(path, metadata).status().previousUncleanShutdown).toBe(false);
});
it("persists technical locations without messages, SQL, secrets or personal paths", () => {
  const path = directory();
  const logs = new Diagnostics(path, metadata);
  logs.beginSession();
  const error = new Error("password=DemoSecret customer=Alice SELECT * FROM customers");
  error.stack =
    "Error: secret\n at save (C:\\Users\\Alice\\shop\\dist\\main\\index.js:123:45)\n at arbitrary (/Users/Alice/private-customer.js:4:2)";
  logs.record("main-exception", error);
  logs.record("operation-failed", { message: "pin=2468", sql: "Alice", code: "SQLITE_CONSTRAINT" });
  const text = readdirSync(path)
    .filter((f) => f.endsWith(".jsonl"))
    .map((f) => readFileSync(join(path, f), "utf8"))
    .join("");
  expect(text).toContain("index.js:123:45");
  expect(text).toContain("SQLITE_CONSTRAINT");
  for (const secret of ["DemoSecret", "Alice", "2468", "SELECT", "private-customer"])
    expect(text).not.toContain(secret);
});
it("bounds log files and excludes arbitrary files and native dumps from export", () => {
  const path = directory();
  const logs = new Diagnostics(path, metadata, { maxFileBytes: 1024, maxFiles: 3 });
  logs.beginSession();
  for (let i = 0; i < 100; i++) logs.record("operation-failed", new Error("secret"));
  const files = readdirSync(path).filter((f) => f.endsWith(".jsonl"));
  expect(files.length).toBeLessThanOrEqual(3);
  for (const file of files) expect(statSync(join(path, file)).size).toBeLessThanOrEqual(1024);
  writeFileSync(join(path, "store.sqlite"), "PRIVATE DATABASE");
  mkdirSync(join(path, "native"));
  writeFileSync(join(path, "native", "crash.dmp"), "PRIVATE MEMORY");
  const archive = logs.exportZip(4);
  expect(archive.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
  const text = archive.toString();
  expect(text).toContain("manifest.json");
  expect(text).toContain("abcd1234");
  expect(text).toContain("schemaVersion");
  expect(text).not.toContain("PRIVATE");
  expect(text).not.toContain("crash.dmp");
  // ZIP central-directory and end record must be present for standard unzip tools.
  expect(archive.readUInt32LE(archive.length - 22)).toBe(0x06054b50);
});
it("logging failure is visible and does not throw into checkout", () => {
  const path = join(directory(), "not-a-directory");
  writeFileSync(path, "occupied");
  const logs = new Diagnostics(path, metadata);
  expect(() => {
    logs.beginSession();
  }).not.toThrow();
  expect(() => {
    logs.record("operation-failed");
  }).not.toThrow();
  expect(logs.status().loggingAvailable).toBe(false);
  expect(() => logs.exportZip(null)).toThrow();
});
it("keeps the originating build on old log entries after an update", () => {
  const path = directory();
  const old = new Diagnostics(path, metadata);
  old.beginSession();
  old.record("renderer-crashed");
  old.cleanShutdown();
  const updated = new Diagnostics(path, {
    ...metadata,
    appVersion: "0.1.0-rc.2",
    buildId: "newbuild"
  });
  updated.beginSession();
  const text = updated.exportZip(4).toString();
  expect(text).toContain("abcd1234");
  expect(text).toContain("newbuild");
  expect(updated.status().previousUncleanShutdown).toBe(true);
});

import {
  appendFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs";
import { join } from "node:path";
import { diagnosticsZip } from "./zip.js";
export type DiagnosticMetadata = {
  appVersion: string;
  buildId: string;
  platform: string;
  arch: string;
  osRelease: string;
  electron: string;
  node: string;
};
const events = [
  "session-start",
  "clean-shutdown",
  "startup-failed",
  "main-exception",
  "unhandled-rejection",
  "renderer-crashed",
  "renderer-unresponsive",
  "renderer-responsive",
  "renderer-error",
  "operation-failed",
  "migration-start",
  "migration-complete",
  "migration-failed",
  "native-crash-reporter-unavailable",
  "export-complete"
] as const;
export type DiagnosticEvent = (typeof events)[number];
type Entry = {
  appVersion: string;
  buildId: string;
  time: string;
  event: DiagnosticEvent;
  code: string;
  frames: readonly string[];
};
const technicalError = (error: unknown): { code: string; frames: string[] } => {
  const value =
    error !== null && typeof error === "object"
      ? (error as { code?: unknown; name?: unknown; stack?: unknown })
      : {};
  const code =
    typeof value.code === "string" &&
    /^(SQLITE_[A-Z_]+|E_RENDERER_OOM|E_RENDERER_CRASH|ENOENT|EACCES|EPERM|ENOSPC|EIO|EBUSY|EROFS)$/.test(
      value.code
    )
      ? value.code
      : ["TypeError", "RangeError", "ReferenceError", "SyntaxError", "Error"].includes(
            String(value.name)
          )
        ? String(value.name)
        : "UNKNOWN";
  const frames =
    typeof value.stack === "string"
      ? Array.from(
          value.stack
            .slice(0, 16000)
            .matchAll(/(?:index(?:-[A-Za-z0-9_-]+)?\.js|preload\.cjs):(\d{1,7}):(\d{1,7})/g)
        )
          .slice(0, 12)
          .map((match) => match[0])
      : [];
  return { code, frames };
};
export class Diagnostics {
  private available = true;
  private hadFailure = false;
  private readonly previousUnclean: boolean;
  private readonly maxBytes: number;
  private readonly maxFiles: number;
  public constructor(
    public readonly directory: string,
    private readonly metadata: DiagnosticMetadata,
    limits: { maxFileBytes?: number; maxFiles?: number } = {}
  ) {
    this.maxBytes = limits.maxFileBytes ?? 1024 * 1024;
    this.maxFiles = limits.maxFiles ?? 5;
    let previousUnclean = false;
    try {
      mkdirSync(directory, { recursive: true, mode: 0o700 });
      const marker = join(directory, "session.json");
      if (existsSync(marker)) {
        try {
          const previous = JSON.parse(readFileSync(marker, "utf8")) as {
            active?: unknown;
            hadFailure?: unknown;
          };
          previousUnclean = previous.active !== false || previous.hadFailure === true;
        } catch {
          previousUnclean = true;
        }
      }
      for (let i = 0; i < this.maxFiles; i++) {
        const path = this.logPath(i);
        if (existsSync(path) && Date.now() - statSync(path).mtimeMs > 14 * 86400000) rmSync(path);
      }
    } catch {
      this.available = false;
    }
    this.previousUnclean = previousUnclean;
  }
  public status() {
    return {
      ...this.metadata,
      previousUncleanShutdown: this.previousUnclean,
      loggingAvailable: this.available
    };
  }
  public beginSession(): void {
    this.marker(true);
    this.record("session-start");
  }
  public cleanShutdown(): void {
    this.record("clean-shutdown");
    this.marker(false);
  }
  public record(event: DiagnosticEvent, error?: unknown): void {
    if (!this.available) return;
    try {
      if (
        ["main-exception", "unhandled-rejection", "renderer-crashed", "startup-failed"].includes(
          event
        )
      ) {
        this.hadFailure = true;
        this.marker(true);
      }
      const entry: Entry = {
        appVersion: this.metadata.appVersion,
        buildId: this.metadata.buildId,
        time: new Date().toISOString(),
        event,
        ...technicalError(error)
      };
      const line = JSON.stringify(entry) + "\n";
      const path = this.logPath(0);
      if (existsSync(path) && statSync(path).size + Buffer.byteLength(line) > this.maxBytes) {
        rmSync(this.logPath(this.maxFiles - 1), { force: true });
        for (let i = this.maxFiles - 2; i >= 0; i--) {
          if (existsSync(this.logPath(i))) renameSync(this.logPath(i), this.logPath(i + 1));
        }
      }
      if (Buffer.byteLength(line) <= this.maxBytes) appendFileSync(path, line, { mode: 0o600 });
    } catch {
      this.available = false;
    }
  }
  public exportZip(schemaVersion: number | null): Buffer {
    if (!this.available) throw new Error("Diagnostics storage is unavailable.");
    const files: { name: string; data: Buffer }[] = [];
    // Re-encode only our documented fields, never sweep the profile directory into an archive.
    for (let i = this.maxFiles - 1; i >= 0; i--) {
      const path = this.logPath(i);
      if (!existsSync(path)) continue;
      if (statSync(path).size > this.maxBytes) continue;
      const entries: Entry[] = [];
      for (const line of readFileSync(path, "utf8").split("\n")) {
        try {
          const entry = JSON.parse(line) as Entry;
          if (
            !events.includes(entry.event) ||
            typeof entry.time !== "string" ||
            !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(entry.time)
          )
            continue;
          const frames = Array.isArray(entry.frames)
            ? (entry.frames as unknown[])
                .filter(
                  (v): v is string =>
                    typeof v === "string" &&
                    /^(?:index(?:-[A-Za-z0-9_-]+)?\.js|preload\.cjs):\d{1,7}:\d{1,7}$/.test(v)
                )
                .slice(0, 12)
            : [];
          entries.push({
            appVersion:
              typeof entry.appVersion === "string" && /^[a-zA-Z0-9.-]{1,80}$/.test(entry.appVersion)
                ? entry.appVersion
                : "unknown",
            buildId:
              typeof entry.buildId === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(entry.buildId)
                ? entry.buildId
                : "unknown",
            time: entry.time,
            event: entry.event,
            code: technicalError({ code: entry.code, name: entry.code }).code,
            frames
          });
        } catch {
          /* Ignore incomplete trailing records after an interrupted write. */
        }
      }
      files.push({
        name: `logs/events-${String(i)}.jsonl`,
        data: Buffer.from(entries.map((entry) => JSON.stringify(entry)).join("\n"))
      });
    }
    files.unshift({
      name: "manifest.json",
      data: Buffer.from(
        JSON.stringify(
          {
            ...this.status(),
            schemaVersion,
            exportedAt: new Date().toISOString(),
            formatVersion: 1,
            nativeDumpsIncluded: false
          },
          null,
          2
        )
      )
    });
    files.push({
      name: "README.txt",
      data: Buffer.from(
        "Orix support diagnostics. No database, request payloads, raw error messages, personal file paths or native memory dumps are included. Share this ZIP with your support contact. Native dumps remain local and may contain sensitive memory. Keep the matching installer and bundled code for the build ID in manifest.json.\n"
      )
    });
    return diagnosticsZip(files);
  }
  private logPath(index: number): string {
    return join(this.directory, `events-${String(index)}.jsonl`);
  }
  private marker(active: boolean): void {
    if (!this.available) return;
    try {
      const temp = join(this.directory, "session.tmp");
      writeFileSync(temp, JSON.stringify({ active, hadFailure: this.hadFailure }), { mode: 0o600 });
      renameSync(temp, join(this.directory, "session.json"));
    } catch {
      this.available = false;
    }
  }
}

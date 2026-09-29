import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { release } from "node:os";
import { Diagnostics } from "./diagnostics.js";
export const createDiagnostics = (
  userData: string,
  appPath: string,
  appVersion: string
): Diagnostics => {
  const hash = createHash("sha256");
  const files = [
    "dist/main/index.js",
    "dist/main/diagnostics.cjs",
    "preload.cjs",
    "dist/renderer/index.html"
  ];
  try {
    files.push(
      ...readdirSync(join(appPath, "dist/renderer/assets"))
        .filter((name) => /\.(js|css)$/.test(name))
        .sort()
        .map((name) => `dist/renderer/assets/${name}`)
    );
  } catch {
    /* Failed renderer builds remain diagnosable. */
  }
  for (const file of files) {
    hash.update(file);
    try {
      hash.update(readFileSync(join(appPath, file)));
    } catch {
      hash.update("missing");
    }
  }
  return new Diagnostics(join(userData, "diagnostics"), {
    appVersion,
    buildId: hash.digest("hex"),
    platform: process.platform,
    arch: process.arch,
    osRelease: release(),
    electron: (process.versions as Record<string, string | undefined>).electron ?? "not-electron",
    node: process.versions.node
  });
};
export { pruneNativeDumps } from "./native-retention.js";

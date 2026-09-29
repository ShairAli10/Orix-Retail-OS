import { readdirSync, statSync, rmSync } from "node:fs";
import { join } from "node:path";
export const pruneNativeDumps = (directory: string): void => {
  try {
    const files: { path: string; time: number; size: number }[] = [];
    const visit = (path: string, depth: number) => {
      if (depth > 3) return;
      for (const entry of readdirSync(path, { withFileTypes: true })) {
        if (entry.isSymbolicLink()) continue;
        const child = join(path, entry.name);
        if (entry.isDirectory()) visit(child, depth + 1);
        else if (entry.isFile() && entry.name.endsWith(".dmp")) {
          const stat = statSync(child);
          files.push({ path: child, time: stat.mtimeMs, size: stat.size });
        }
      }
    };
    visit(directory, 0);
    files.sort((a, b) => b.time - a.time);
    let bytes = 0;
    let count = 0;
    for (const file of files) {
      if (
        count >= 5 ||
        Date.now() - file.time > 14 * 86400000 ||
        bytes + file.size > 50 * 1024 * 1024
      )
        rmSync(file.path, { force: true });
      else {
        bytes += file.size;
        count++;
      }
    }
  } catch {
    /* A currently locked Crashpad file will be retried on the next sweep. */
  }
};

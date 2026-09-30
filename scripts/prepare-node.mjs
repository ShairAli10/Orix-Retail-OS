import { createRequire } from "node:module";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";
const require = createRequire(new URL("../apps/desktop/package.json", import.meta.url));
const packagePath = require.resolve("better-sqlite3/package.json");
const check = spawnSync(
  process.execPath,
  [
    "-e",
    `const Database=require(${JSON.stringify(dirname(packagePath))});new Database(':memory:').close()`
  ],
  { encoding: "utf8" }
);
if (check.status !== 0) {
  console.error(
    "SQLite could not load. Use a current Node 22 LTS patch (minimum 22.14) and reinstall dependencies with pnpm install --frozen-lockfile."
  );
  process.exit(1);
}

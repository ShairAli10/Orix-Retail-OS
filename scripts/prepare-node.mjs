import { createRequire } from "node:module";
import { dirname } from "node:path";
import { spawnSync } from "node:child_process";
const require = createRequire(new URL("../apps/desktop/package.json", import.meta.url));
const packagePath = require.resolve("better-sqlite3/package.json");
const nativeRequire = createRequire(packagePath);
const check = spawnSync(
  process.execPath,
  [
    "-e",
    `const Database=require(${JSON.stringify(dirname(packagePath))});new Database(':memory:').close()`
  ],
  { encoding: "utf8" }
);
if (check.status !== 0) {
  const result = spawnSync(
    process.execPath,
    [
      nativeRequire.resolve("prebuild-install/bin.js"),
      "--runtime=node",
      `--target=${process.versions.node}`
    ],
    { cwd: dirname(packagePath), stdio: "inherit" }
  );
  if (result.status !== 0) {
    console.error(
      "SQLite preparation failed. Use a supported Node LTS version and install native build prerequisites."
    );
    process.exit(1);
  }
}

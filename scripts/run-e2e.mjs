import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
const packageManager = process.env.npm_execpath;
const pnpm = packageManager ? process.execPath : "pnpm";
const pnpmArgs = packageManager ? [packageManager] : [];
const run = (cmd, args, env = process.env) => {
  const result = spawnSync(cmd, args, { stdio: "inherit", env });
  if (result.status !== 0) throw new Error(`Command failed: ${args[0]}`);
};
const directory = mkdtempSync(join(tmpdir(), "orix-e2e-"));
try {
  run(process.execPath, ["scripts/prepare-node.mjs"]);
  run(pnpm, [...pnpmArgs, "build"]);
  run(process.execPath, ["scripts/seed-demo.mjs", "--directory", directory]);
  run(pnpm, [...pnpmArgs, "exec", "playwright", "test", ...process.argv.slice(2)], {
    ...process.env,
    ORIX_DEMO_DIRECTORY: directory
  });
} finally {
  rmSync(directory, { recursive: true, force: true });
  run(process.execPath, ["scripts/prepare-node.mjs"]);
}

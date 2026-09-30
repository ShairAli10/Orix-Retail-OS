import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
const require = createRequire(new URL("../apps/desktop/package.json", import.meta.url));
await access(resolve(".orix-demo/ORIX-DEMO.json"));
const env = { ...process.env };
delete env.ELECTRON_RUN_AS_NODE;
const child = spawn(require("electron"), [resolve("apps/desktop"), "--demo"], {
  stdio: "inherit",
  env
});
child.on("exit", (code) => process.exit(code ?? 0));

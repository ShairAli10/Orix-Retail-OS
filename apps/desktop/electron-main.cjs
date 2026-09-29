const electron = require("electron");
const path = require("node:path");
const fs = require("node:fs");
if (process.argv.includes("--demo")) {
  if (electron.app.isPackaged) throw new Error("Demo mode is only available in development.");
  electron.app.setPath(
    "userData",
    process.env.ORIX_DEMO_DIRECTORY || path.resolve(__dirname, "../../.orix-demo")
  );
}
if (!electron.app.requestSingleInstanceLock()) {
  electron.app.quit();
} else {
  globalThis.__orixHasInstanceLock = true;
  const { createDiagnostics, pruneNativeDumps } = require("./dist/main/diagnostics.cjs");
  const diagnostics = createDiagnostics(
    electron.app.getPath("userData"),
    __dirname,
    electron.app.getVersion()
  );
  globalThis.__orixDiagnostics = diagnostics;
  globalThis.__orixElectron = electron;
  diagnostics.beginSession();
  let failing = false;
  const fatal = (event, error) => {
    if (failing) return;
    failing = true;
    diagnostics.record(event, error);
    electron.dialog.showErrorBox(
      "Orix could not continue",
      "Orix stopped unexpectedly. Restart it and check Sales History before retrying a payment. Logs are stored in:\n" +
        diagnostics.directory +
        "\n\nIf this happened during an update, keep the database and upgrade-backups folder. Contact support before reinstalling an older version."
    );
    electron.app.exit(1);
  };
  process.on("uncaughtException", (error) => fatal("main-exception", error));
  process.on("unhandledRejection", (error) => fatal("unhandled-rejection", error));
  electron.app.on("will-quit", () => diagnostics.cleanShutdown());
  try {
    const dumps = path.join(diagnostics.directory, "native");
    fs.mkdirSync(dumps, { recursive: true });
    electron.app.setPath("crashDumps", dumps);
    electron.crashReporter.start({
      uploadToServer: false,
      extra: { orixBuild: diagnostics.status().buildId }
    });
    pruneNativeDumps(dumps);
    const retention = setInterval(() => pruneNativeDumps(dumps), 60000);
    retention.unref();
  } catch {
    diagnostics.record("native-crash-reporter-unavailable");
  }
  import("./dist/main/index.js").catch((error) => fatal("startup-failed", error));
}

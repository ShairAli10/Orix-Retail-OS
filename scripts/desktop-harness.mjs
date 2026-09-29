// Development/test adapter. Business handlers, migrations and SQLite are real.
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
export async function openDesktop(directory) {
  await mkdir(directory, { recursive: true });
  const handlers = new Map();
  const listeners = new Map();
  let ready;
  const started = new Promise((resolve) => {
    ready = resolve;
  });
  const rendererUrl = pathToFileURL(resolve("apps/desktop/dist/renderer/index.html")).href;
  globalThis.__orixElectron = {
    app: {
      isPackaged: false,
      getPath: () => directory,
      getAppPath: () => resolve("apps/desktop"),
      getVersion: () => "test",
      whenReady: () => Promise.resolve(),
      on: (name, fn) => listeners.set(name, fn),
      requestSingleInstanceLock: () => true,
      quit: () => {},
      relaunch: () => {},
      exit: () => {}
    },
    BrowserWindow: class {
      constructor() {
        this.webContents = { on() {}, setWindowOpenHandler() {} };
        ready();
      }
      loadFile() {
        return Promise.resolve();
      }
      loadURL() {
        return Promise.resolve();
      }
      on() {}
    },
    ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
    dialog: {}
  };
  if (!process.resourcesPath) process.resourcesPath = resolve("apps/desktop");
  await import(pathToFileURL(resolve("apps/desktop/dist/main/index.js")).href);
  await started;
  return {
    directory,
    call: (name, payload = {}) =>
      handlers.get(`orix:${name}`)(
        { senderFrame: { url: rendererUrl }, sender: { getURL: () => rendererUrl } },
        { requestId: crypto.randomUUID(), payload }
      ),
    close: () => listeners.get("window-all-closed")?.()
  };
}

globalThis.__orixElectron = require("electron");

import("./dist/main/index.js").catch((error) => {
  console.error(error);
  process.exit(1);
});

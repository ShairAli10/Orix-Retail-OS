module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "desktop",
        "database",
        "business",
        "ui",
        "printer",
        "inventory",
        "ledger",
        "shared",
        "docs",
        "tooling",
        "release"
      ]
    ]
  }
};

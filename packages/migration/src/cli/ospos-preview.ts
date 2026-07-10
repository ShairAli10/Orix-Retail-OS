import { writeFile } from "node:fs/promises";
import { createOspoMigrationPreview } from "../ospos/preview.js";

type CliArgs = {
  readonly itemsFile: string;
  readonly sqlFile?: string;
  readonly outputFile?: string;
};

const main = async (): Promise<void> => {
  const args = parseArgs(process.argv.slice(2));
  const preview = await createOspoMigrationPreview(
    args.sqlFile === undefined
      ? { itemsFile: args.itemsFile }
      : { itemsFile: args.itemsFile, sqlFile: args.sqlFile }
  );
  const output = JSON.stringify(preview, null, 2);

  if (args.outputFile === undefined) {
    console.log(output);
  } else {
    await writeFile(args.outputFile, `${output}\n`, "utf8");
    console.log(`OSPOS migration preview written to ${args.outputFile}`);
  }

  const errorCount = preview.issues.filter((issue) => issue.severity === "error").length;
  if (errorCount > 0) {
    process.exitCode = 2;
  }
};

const parseArgs = (args: readonly string[]): CliArgs => {
  let itemsFile: string | undefined;
  let sqlFile: string | undefined;
  let outputFile: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = args[index + 1];
    if (arg === "--items" && next !== undefined) {
      itemsFile = next;
      index += 1;
    } else if (arg === "--sql" && next !== undefined) {
      sqlFile = next;
      index += 1;
    } else if (arg === "--out" && next !== undefined) {
      outputFile = next;
      index += 1;
    } else if (arg === "--help") {
      printHelp();
      process.exit(0);
    }
  }

  if (itemsFile === undefined) {
    printHelp();
    throw new Error("Missing required --items file path.");
  }

  return {
    itemsFile,
    ...(sqlFile === undefined ? {} : { sqlFile }),
    ...(outputFile === undefined ? {} : { outputFile })
  };
};

const printHelp = (): void => {
  console.log(`Usage:
  pnpm migration:ospos:preview -- --items /path/ospos_items.csv --sql /path/ospos.sql --out /path/preview.json

Options:
  --items  Required OSPOS items CSV export.
  --sql    Optional OSPOS SQL dump. Required for current inventory quantities.
  --out    Optional JSON output path. Prints to stdout when omitted.`);
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "Unknown migration preview failure.";
  console.error(message);
  process.exitCode = 1;
});

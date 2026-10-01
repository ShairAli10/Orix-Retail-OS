import { randomUUID } from "node:crypto";
import type { DatabaseConnection } from "@orix/database";

export const resetStoreData = async (
  connection: DatabaseConnection,
  storeId: string,
  userId: string,
  confirmation: string,
  backup: () => Promise<{ status: string; verifiedAt: string | null; filePath: string | null }>
): Promise<{ backupFile: string }> => {
  const db = connection.sqlite;
  if (confirmation !== "RESET STORE DATA") throw new Error("Type RESET STORE DATA to confirm.");
  const stores = db.prepare("SELECT id FROM stores").all() as { id: string }[];
  if (stores.length !== 1 || stores[0]?.id !== storeId)
    throw new Error("Reset is only available for a single-store database.");
  if (db.prepare("SELECT 1 FROM cash_sessions WHERE status='open'").get())
    throw new Error("Close the counter before resetting store data.");
  const snapshot = await backup();
  if (snapshot.status !== "completed" || !snapshot.verifiedAt || !snapshot.filePath)
    throw new Error("Reset requires a verified backup.");
  const backupFile = snapshot.filePath;
  db.transaction(() => {
    db.pragma("defer_foreign_keys = ON");
    // Keep authentication, store configuration, backups and audit history.
    for (const table of [
      "legacy_import_records",
      "legacy_import_jobs",
      "payment_operations",
      "inventory_count_items",
      "inventory_counts",
      "sales_return_items",
      "purchase_return_items",
      "sales_returns",
      "purchase_returns",
      "ledger_entries",
      "ledger_transactions",
      "customer_payments",
      "supplier_payments",
      "inventory_transactions",
      "sale_items",
      "purchase_items",
      "sales",
      "purchases",
      "expenses",
      "cash_sessions",
      "products",
      "customers",
      "suppliers",
      "categories",
      "brands",
      "units",
      "expense_categories",
      "business_events"
    ])
      db.prepare(`DELETE FROM ${table}`).run();
    db.prepare(
      "UPDATE business_days SET status='closed',opened_at=NULL,closed_at=NULL,closed_by_user_id=NULL,expected_cash_minor=NULL,counted_cash_minor=NULL,cash_variance_minor=NULL,notes=NULL WHERE store_id=?"
    ).run(storeId);
    if ((db.pragma("foreign_key_check") as unknown[]).length)
      throw new Error("Reset integrity check failed.");
    const timestamp = new Date().toISOString();
    db.prepare(
      "INSERT INTO audit_logs(id,store_id,actor_user_id,action,target_type,target_id,reason,metadata_json,occurred_at,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)"
    ).run(
      randomUUID(),
      storeId,
      userId,
      "StoreDataReset",
      "store",
      storeId,
      "Fresh import after testing",
      JSON.stringify({ backupFile }),
      timestamp,
      timestamp
    );
  })();
  return { backupFile };
};

CREATE TABLE legacy_import_jobs (
 id TEXT PRIMARY KEY NOT NULL,
 store_id TEXT NOT NULL REFERENCES stores(id),
 source_hash TEXT NOT NULL,
 result_json TEXT NOT NULL,
 imported_at TEXT NOT NULL,
 UNIQUE(store_id, source_hash)
);
--> statement-breakpoint
CREATE TABLE legacy_import_records (
 store_id TEXT NOT NULL REFERENCES stores(id),
 kind TEXT NOT NULL,
 source_id TEXT NOT NULL,
 target_id TEXT NOT NULL,
 job_id TEXT NOT NULL REFERENCES legacy_import_jobs(id),
 PRIMARY KEY(store_id, kind, source_id)
);

ALTER TABLE sales ADD COLUMN client_operation_id TEXT;
--> statement-breakpoint
ALTER TABLE sales ADD COLUMN client_operation_hash TEXT;
--> statement-breakpoint
CREATE UNIQUE INDEX sales_store_operation_unique ON sales(store_id, client_operation_id);

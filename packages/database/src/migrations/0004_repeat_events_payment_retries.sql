DROP INDEX business_events_source_event_unique;
--> statement-breakpoint
CREATE INDEX business_events_source_event_idx ON business_events(source_type, source_id, event_name);
--> statement-breakpoint
CREATE TABLE payment_operations (store_id TEXT NOT NULL REFERENCES stores(id), kind TEXT NOT NULL, operation_id TEXT NOT NULL, request_json TEXT NOT NULL, result_json TEXT NOT NULL, PRIMARY KEY(store_id, kind, operation_id));

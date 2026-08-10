CREATE TABLE inventory_counts (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  business_day_id TEXT NOT NULL REFERENCES business_days(id),
  count_number TEXT NOT NULL,
  scope_type TEXT NOT NULL DEFAULT 'full',
  status TEXT NOT NULL DEFAULT 'draft',
  started_at TEXT NOT NULL,
  completed_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  completed_by_user_id TEXT REFERENCES users(id),
  approved_by_user_id TEXT REFERENCES users(id),
  CHECK (status IN ('draft', 'completed', 'cancelled')),
  CHECK (scope_type IN ('full', 'partial'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX inventory_counts_branch_number_unique ON inventory_counts (branch_id, count_number);
--> statement-breakpoint
CREATE INDEX inventory_counts_branch_status_idx ON inventory_counts (branch_id, status);
--> statement-breakpoint
CREATE INDEX inventory_counts_business_day_idx ON inventory_counts (business_day_id);
--> statement-breakpoint
CREATE INDEX inventory_counts_started_at_idx ON inventory_counts (started_at);
--> statement-breakpoint
CREATE TABLE inventory_count_items (
  id TEXT PRIMARY KEY NOT NULL,
  inventory_count_id TEXT NOT NULL REFERENCES inventory_counts(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  expected_quantity INTEGER NOT NULL,
  counted_quantity INTEGER,
  variance_quantity INTEGER,
  adjustment_inventory_transaction_id TEXT REFERENCES inventory_transactions(id),
  created_at TEXT NOT NULL,
  updated_at TEXT,
  counted_by_user_id TEXT REFERENCES users(id),
  approved_by_user_id TEXT REFERENCES users(id),
  CHECK (expected_quantity >= 0),
  CHECK (counted_quantity IS NULL OR counted_quantity >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX inventory_count_items_count_product_unique ON inventory_count_items (inventory_count_id, product_id);
--> statement-breakpoint
CREATE INDEX inventory_count_items_count_idx ON inventory_count_items (inventory_count_id);
--> statement-breakpoint
CREATE INDEX inventory_count_items_product_idx ON inventory_count_items (product_id);
--> statement-breakpoint
CREATE INDEX inventory_count_items_adjustment_idx ON inventory_count_items (adjustment_inventory_transaction_id);

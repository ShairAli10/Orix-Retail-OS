CREATE TABLE sales_returns (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  business_day_id TEXT NOT NULL REFERENCES business_days(id),
  original_sale_id TEXT NOT NULL REFERENCES sales(id),
  customer_id TEXT REFERENCES customers(id),
  return_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'posted',
  reason TEXT NOT NULL,
  refund_method TEXT NOT NULL DEFAULT 'cash',
  total_refund_minor INTEGER NOT NULL DEFAULT 0,
  cash_refund_minor INTEGER NOT NULL DEFAULT 0,
  receivable_reduction_minor INTEGER NOT NULL DEFAULT 0,
  returned_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  approved_by_user_id TEXT REFERENCES users(id),
  CHECK (total_refund_minor >= 0),
  CHECK (cash_refund_minor >= 0),
  CHECK (receivable_reduction_minor >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX sales_returns_branch_number_unique ON sales_returns (branch_id, return_number);
--> statement-breakpoint
CREATE INDEX sales_returns_original_sale_idx ON sales_returns (original_sale_id);
--> statement-breakpoint
CREATE INDEX sales_returns_customer_returned_idx ON sales_returns (customer_id, returned_at);
--> statement-breakpoint
CREATE INDEX sales_returns_day_returned_idx ON sales_returns (business_day_id, returned_at);
--> statement-breakpoint
CREATE INDEX sales_returns_returned_at_idx ON sales_returns (returned_at);
--> statement-breakpoint
CREATE TABLE sales_return_items (
  id TEXT PRIMARY KEY NOT NULL,
  sales_return_id TEXT NOT NULL REFERENCES sales_returns(id),
  sale_item_id TEXT NOT NULL REFERENCES sale_items(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  condition TEXT NOT NULL DEFAULT 'sellable',
  restock_action TEXT NOT NULL DEFAULT 'return-to-stock',
  unit_price_minor INTEGER NOT NULL,
  line_total_minor INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (quantity > 0),
  CHECK (unit_price_minor >= 0),
  CHECK (line_total_minor >= 0)
);
--> statement-breakpoint
CREATE INDEX sales_return_items_return_idx ON sales_return_items (sales_return_id);
--> statement-breakpoint
CREATE INDEX sales_return_items_sale_item_idx ON sales_return_items (sale_item_id);
--> statement-breakpoint
CREATE INDEX sales_return_items_product_created_idx ON sales_return_items (product_id, created_at);
--> statement-breakpoint
CREATE TABLE purchase_returns (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  business_day_id TEXT NOT NULL REFERENCES business_days(id),
  original_purchase_id TEXT NOT NULL REFERENCES purchases(id),
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  return_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'posted',
  reason TEXT NOT NULL,
  total_value_minor INTEGER NOT NULL DEFAULT 0,
  payable_reduction_minor INTEGER NOT NULL DEFAULT 0,
  returned_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  approved_by_user_id TEXT REFERENCES users(id),
  CHECK (total_value_minor >= 0),
  CHECK (payable_reduction_minor >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX purchase_returns_branch_number_unique ON purchase_returns (branch_id, return_number);
--> statement-breakpoint
CREATE INDEX purchase_returns_original_purchase_idx ON purchase_returns (original_purchase_id);
--> statement-breakpoint
CREATE INDEX purchase_returns_supplier_returned_idx ON purchase_returns (supplier_id, returned_at);
--> statement-breakpoint
CREATE INDEX purchase_returns_day_returned_idx ON purchase_returns (business_day_id, returned_at);
--> statement-breakpoint
CREATE INDEX purchase_returns_returned_at_idx ON purchase_returns (returned_at);
--> statement-breakpoint
CREATE TABLE purchase_return_items (
  id TEXT PRIMARY KEY NOT NULL,
  purchase_return_id TEXT NOT NULL REFERENCES purchase_returns(id),
  purchase_item_id TEXT NOT NULL REFERENCES purchase_items(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_cost_minor INTEGER NOT NULL,
  line_total_minor INTEGER NOT NULL,
  created_at TEXT NOT NULL,
  CHECK (quantity > 0),
  CHECK (unit_cost_minor >= 0),
  CHECK (line_total_minor >= 0)
);
--> statement-breakpoint
CREATE INDEX purchase_return_items_return_idx ON purchase_return_items (purchase_return_id);
--> statement-breakpoint
CREATE INDEX purchase_return_items_purchase_item_idx ON purchase_return_items (purchase_item_id);
--> statement-breakpoint
CREATE INDEX purchase_return_items_product_created_idx ON purchase_return_items (product_id, created_at);

CREATE TABLE stores (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  trading_name TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  registration_number TEXT,
  currency_code TEXT NOT NULL DEFAULT 'PKR',
  status TEXT NOT NULL DEFAULT 'draft',
  activated_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  archived_at TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT,
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'local',
  device_id TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX stores_registration_number_unique ON stores (registration_number);
--> statement-breakpoint
CREATE INDEX stores_status_idx ON stores (status);
--> statement-breakpoint
CREATE INDEX stores_name_idx ON stores (name);
--> statement-breakpoint

CREATE TABLE branches (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  is_default INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT,
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'local',
  device_id TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX branches_store_code_unique ON branches (store_id, code);
--> statement-breakpoint
CREATE UNIQUE INDEX branches_store_name_unique ON branches (store_id, name);
--> statement-breakpoint
CREATE INDEX branches_store_status_idx ON branches (store_id, status);
--> statement-breakpoint
CREATE INDEX branches_store_default_idx ON branches (store_id, is_default);
--> statement-breakpoint

CREATE TABLE users (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  display_name TEXT NOT NULL,
  username TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  last_login_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  archived_at TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT,
  sync_version INTEGER NOT NULL DEFAULT 1,
  sync_status TEXT NOT NULL DEFAULT 'local',
  device_id TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX users_store_username_unique ON users (store_id, username);
--> statement-breakpoint
CREATE INDEX users_store_status_idx ON users (store_id, status);
--> statement-breakpoint
CREATE INDEX users_last_login_idx ON users (last_login_at);
--> statement-breakpoint

CREATE TABLE roles (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  description TEXT,
  is_system_role INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT,
  archived_at TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX roles_store_name_unique ON roles (store_id, name);
--> statement-breakpoint
CREATE INDEX roles_store_status_idx ON roles (store_id, status);
--> statement-breakpoint
CREATE INDEX roles_system_role_idx ON roles (is_system_role);
--> statement-breakpoint

CREATE TABLE permissions (
  id TEXT PRIMARY KEY NOT NULL,
  code TEXT NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  description TEXT,
  is_system_permission INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  created_by_user_id TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX permissions_code_unique ON permissions (code);
--> statement-breakpoint
CREATE INDEX permissions_module_action_idx ON permissions (module, action);
--> statement-breakpoint
CREATE INDEX permissions_module_idx ON permissions (module);
--> statement-breakpoint

CREATE TABLE user_roles (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id),
  role_id TEXT NOT NULL REFERENCES roles(id),
  assigned_at TEXT NOT NULL,
  assigned_by_user_id TEXT NOT NULL REFERENCES users(id),
  revoked_at TEXT,
  revoked_by_user_id TEXT REFERENCES users(id)
);
--> statement-breakpoint
CREATE INDEX user_roles_user_idx ON user_roles (user_id);
--> statement-breakpoint
CREATE INDEX user_roles_role_idx ON user_roles (role_id);
--> statement-breakpoint
CREATE INDEX user_roles_active_idx ON user_roles (user_id, role_id, revoked_at);
--> statement-breakpoint

CREATE TABLE role_permissions (
  id TEXT PRIMARY KEY NOT NULL,
  role_id TEXT NOT NULL REFERENCES roles(id),
  permission_id TEXT NOT NULL REFERENCES permissions(id),
  granted_at TEXT NOT NULL,
  granted_by_user_id TEXT NOT NULL REFERENCES users(id),
  revoked_at TEXT,
  revoked_by_user_id TEXT REFERENCES users(id)
);
--> statement-breakpoint
CREATE INDEX role_permissions_role_idx ON role_permissions (role_id);
--> statement-breakpoint
CREATE INDEX role_permissions_permission_idx ON role_permissions (permission_id);
--> statement-breakpoint
CREATE INDEX role_permissions_active_idx ON role_permissions (role_id, permission_id, revoked_at);
--> statement-breakpoint

CREATE TABLE business_days (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  business_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  opened_at TEXT,
  opened_by_user_id TEXT NOT NULL REFERENCES users(id),
  closed_at TEXT,
  closed_by_user_id TEXT REFERENCES users(id),
  expected_cash_minor INTEGER,
  counted_cash_minor INTEGER,
  cash_variance_minor INTEGER,
  notes TEXT,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX business_days_branch_date_unique ON business_days (branch_id, business_date);
--> statement-breakpoint
CREATE INDEX business_days_branch_status_idx ON business_days (branch_id, status);
--> statement-breakpoint
CREATE INDEX business_days_business_date_idx ON business_days (business_date);
--> statement-breakpoint
CREATE INDEX business_days_opened_at_idx ON business_days (opened_at);
--> statement-breakpoint
CREATE INDEX business_days_closed_at_idx ON business_days (closed_at);
--> statement-breakpoint

CREATE TABLE categories (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  parent_category_id TEXT,
  name TEXT NOT NULL,
  code TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT,
  archived_at TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX categories_store_parent_name_unique ON categories (store_id, parent_category_id, name);
--> statement-breakpoint
CREATE UNIQUE INDEX categories_store_code_unique ON categories (store_id, code);
--> statement-breakpoint
CREATE INDEX categories_parent_idx ON categories (parent_category_id);
--> statement-breakpoint
CREATE INDEX categories_store_status_idx ON categories (store_id, status);
--> statement-breakpoint

CREATE TABLE brands (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  code TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT,
  archived_at TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX brands_store_name_unique ON brands (store_id, name);
--> statement-breakpoint
CREATE UNIQUE INDEX brands_store_code_unique ON brands (store_id, code);
--> statement-breakpoint
CREATE INDEX brands_store_status_idx ON brands (store_id, status);
--> statement-breakpoint

CREATE TABLE units (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  abbreviation TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT,
  archived_at TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX units_store_abbreviation_unique ON units (store_id, abbreviation);
--> statement-breakpoint
CREATE UNIQUE INDEX units_store_name_unique ON units (store_id, name);
--> statement-breakpoint
CREATE INDEX units_store_status_idx ON units (store_id, status);
--> statement-breakpoint

CREATE TABLE products (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  category_id TEXT REFERENCES categories(id),
  brand_id TEXT REFERENCES brands(id),
  unit_id TEXT NOT NULL REFERENCES units(id),
  sku TEXT,
  barcode TEXT,
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT NOT NULL DEFAULT 'standard',
  status TEXT NOT NULL DEFAULT 'draft',
  is_stock_tracked INTEGER NOT NULL DEFAULT 1,
  is_sellable INTEGER NOT NULL DEFAULT 1,
  is_purchasable INTEGER NOT NULL DEFAULT 1,
  sale_price_minor INTEGER CHECK (sale_price_minor >= 0),
  purchase_cost_minor INTEGER CHECK (purchase_cost_minor >= 0),
  reorder_level_quantity INTEGER CHECK (reorder_level_quantity >= 0),
  created_at TEXT NOT NULL,
  updated_at TEXT,
  archived_at TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX products_store_sku_unique ON products (store_id, sku);
--> statement-breakpoint
CREATE UNIQUE INDEX products_store_barcode_unique ON products (store_id, barcode);
--> statement-breakpoint
CREATE INDEX products_store_status_idx ON products (store_id, status);
--> statement-breakpoint
CREATE INDEX products_name_idx ON products (name);
--> statement-breakpoint
CREATE INDEX products_category_idx ON products (category_id);
--> statement-breakpoint
CREATE INDEX products_brand_idx ON products (brand_id);
--> statement-breakpoint
CREATE INDEX products_low_stock_idx ON products (reorder_level_quantity);
--> statement-breakpoint

CREATE TABLE customers (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  credit_allowed INTEGER NOT NULL DEFAULT 0,
  credit_limit_minor INTEGER CHECK (credit_limit_minor >= 0),
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  archived_at TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX customers_store_phone_unique ON customers (store_id, phone);
--> statement-breakpoint
CREATE INDEX customers_store_status_idx ON customers (store_id, status);
--> statement-breakpoint
CREATE INDEX customers_name_idx ON customers (name);
--> statement-breakpoint
CREATE INDEX customers_created_at_idx ON customers (created_at);
--> statement-breakpoint

CREATE TABLE suppliers (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  payment_terms TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  archived_at TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX suppliers_store_phone_unique ON suppliers (store_id, phone);
--> statement-breakpoint
CREATE INDEX suppliers_store_status_idx ON suppliers (store_id, status);
--> statement-breakpoint
CREATE INDEX suppliers_name_idx ON suppliers (name);
--> statement-breakpoint
CREATE INDEX suppliers_created_at_idx ON suppliers (created_at);
--> statement-breakpoint

CREATE TABLE cash_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  name TEXT NOT NULL,
  account_type TEXT NOT NULL DEFAULT 'cash_drawer',
  status TEXT NOT NULL DEFAULT 'active',
  currency_code TEXT NOT NULL DEFAULT 'PKR',
  opened_at TEXT,
  closed_at TEXT,
  closed_by_user_id TEXT REFERENCES users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT,
  archived_at TEXT,
  created_by_user_id TEXT REFERENCES users(id),
  updated_by_user_id TEXT REFERENCES users(id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX cash_accounts_branch_name_unique ON cash_accounts (branch_id, name);
--> statement-breakpoint
CREATE INDEX cash_accounts_branch_status_idx ON cash_accounts (branch_id, status);
--> statement-breakpoint
CREATE INDEX cash_accounts_type_idx ON cash_accounts (account_type);
--> statement-breakpoint

CREATE TABLE cash_sessions (
  id TEXT PRIMARY KEY NOT NULL,
  cash_account_id TEXT NOT NULL REFERENCES cash_accounts(id),
  business_day_id TEXT NOT NULL REFERENCES business_days(id),
  opened_at TEXT NOT NULL,
  opened_by_user_id TEXT NOT NULL REFERENCES users(id),
  opening_cash_minor INTEGER NOT NULL CHECK (opening_cash_minor >= 0),
  closed_at TEXT,
  closed_by_user_id TEXT REFERENCES users(id),
  expected_cash_minor INTEGER,
  counted_cash_minor INTEGER,
  variance_minor INTEGER,
  status TEXT NOT NULL DEFAULT 'open',
  notes TEXT
);
--> statement-breakpoint
CREATE INDEX cash_sessions_account_status_idx ON cash_sessions (cash_account_id, status);
--> statement-breakpoint
CREATE INDEX cash_sessions_business_day_idx ON cash_sessions (business_day_id);
--> statement-breakpoint
CREATE INDEX cash_sessions_opened_at_idx ON cash_sessions (opened_at);
--> statement-breakpoint
CREATE INDEX cash_sessions_closed_at_idx ON cash_sessions (closed_at);
--> statement-breakpoint

CREATE TABLE ledger_accounts (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  account_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX ledger_accounts_store_code_unique ON ledger_accounts (store_id, code);
--> statement-breakpoint
CREATE INDEX ledger_accounts_store_status_idx ON ledger_accounts (store_id, status);
--> statement-breakpoint
CREATE INDEX ledger_accounts_type_idx ON ledger_accounts (account_type);
--> statement-breakpoint

CREATE TABLE ledger_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  business_day_id TEXT NOT NULL REFERENCES business_days(id),
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'posted',
  posted_at TEXT NOT NULL,
  posted_by_user_id TEXT NOT NULL REFERENCES users(id),
  approved_by_user_id TEXT REFERENCES users(id),
  reversed_at TEXT,
  reversal_of_ledger_transaction_id TEXT,
  memo TEXT,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX ledger_transactions_source_unique ON ledger_transactions (source_type, source_id, transaction_type);
--> statement-breakpoint
CREATE INDEX ledger_transactions_source_idx ON ledger_transactions (source_type, source_id);
--> statement-breakpoint
CREATE INDEX ledger_transactions_day_posted_idx ON ledger_transactions (business_day_id, posted_at);
--> statement-breakpoint
CREATE INDEX ledger_transactions_type_posted_idx ON ledger_transactions (transaction_type, posted_at);
--> statement-breakpoint
CREATE INDEX ledger_transactions_status_idx ON ledger_transactions (status);
--> statement-breakpoint

CREATE TABLE ledger_entries (
  id TEXT PRIMARY KEY NOT NULL,
  ledger_transaction_id TEXT NOT NULL REFERENCES ledger_transactions(id),
  ledger_account_id TEXT NOT NULL REFERENCES ledger_accounts(id),
  entry_type TEXT NOT NULL,
  account_type TEXT NOT NULL,
  account_ref_type TEXT,
  account_ref_id TEXT,
  debit_minor INTEGER NOT NULL DEFAULT 0,
  credit_minor INTEGER NOT NULL DEFAULT 0,
  currency_code TEXT NOT NULL DEFAULT 'PKR',
  memo TEXT,
  created_at TEXT NOT NULL,
  CHECK ((debit_minor > 0 AND credit_minor = 0) OR (debit_minor = 0 AND credit_minor > 0))
);
--> statement-breakpoint
CREATE INDEX ledger_entries_transaction_idx ON ledger_entries (ledger_transaction_id);
--> statement-breakpoint
CREATE INDEX ledger_entries_account_idx ON ledger_entries (ledger_account_id);
--> statement-breakpoint
CREATE INDEX ledger_entries_account_ref_idx ON ledger_entries (account_type, account_ref_id);
--> statement-breakpoint
CREATE INDEX ledger_entries_ref_created_idx ON ledger_entries (account_ref_id, created_at);
--> statement-breakpoint
CREATE INDEX ledger_entries_account_created_idx ON ledger_entries (account_type, created_at);
--> statement-breakpoint

CREATE TABLE sales (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  business_day_id TEXT NOT NULL REFERENCES business_days(id),
  customer_id TEXT REFERENCES customers(id),
  sale_number TEXT NOT NULL,
  sale_type TEXT NOT NULL DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'draft',
  sale_date TEXT NOT NULL,
  subtotal_minor INTEGER NOT NULL DEFAULT 0 CHECK (subtotal_minor >= 0),
  discount_minor INTEGER NOT NULL DEFAULT 0 CHECK (discount_minor >= 0),
  tax_minor INTEGER NOT NULL DEFAULT 0 CHECK (tax_minor >= 0),
  total_minor INTEGER NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
  paid_minor INTEGER NOT NULL DEFAULT 0 CHECK (paid_minor >= 0),
  change_due_minor INTEGER,
  cancellation_reason TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  returned_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  completed_by_user_id TEXT REFERENCES users(id),
  cancelled_by_user_id TEXT REFERENCES users(id),
  approved_by_user_id TEXT REFERENCES users(id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX sales_branch_sale_number_unique ON sales (branch_id, sale_number);
--> statement-breakpoint
CREATE INDEX sales_day_status_idx ON sales (business_day_id, status);
--> statement-breakpoint
CREATE INDEX sales_customer_date_idx ON sales (customer_id, sale_date);
--> statement-breakpoint
CREATE INDEX sales_sale_date_idx ON sales (sale_date);
--> statement-breakpoint
CREATE INDEX sales_completed_at_idx ON sales (completed_at);
--> statement-breakpoint
CREATE INDEX sales_status_idx ON sales (status);
--> statement-breakpoint

CREATE TABLE sale_items (
  id TEXT PRIMARY KEY NOT NULL,
  sale_id TEXT NOT NULL REFERENCES sales(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  unit_id TEXT NOT NULL REFERENCES units(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price_minor INTEGER NOT NULL CHECK (unit_price_minor >= 0),
  discount_minor INTEGER,
  tax_minor INTEGER,
  line_total_minor INTEGER NOT NULL CHECK (line_total_minor >= 0),
  returned_quantity INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
--> statement-breakpoint
CREATE INDEX sale_items_sale_product_idx ON sale_items (sale_id, product_id);
--> statement-breakpoint
CREATE INDEX sale_items_sale_idx ON sale_items (sale_id);
--> statement-breakpoint
CREATE INDEX sale_items_product_created_idx ON sale_items (product_id, created_at);
--> statement-breakpoint

CREATE TABLE purchases (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  business_day_id TEXT NOT NULL REFERENCES business_days(id),
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  purchase_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  purchase_date TEXT NOT NULL,
  subtotal_minor INTEGER NOT NULL DEFAULT 0,
  discount_minor INTEGER NOT NULL DEFAULT 0,
  tax_minor INTEGER NOT NULL DEFAULT 0,
  total_minor INTEGER NOT NULL DEFAULT 0 CHECK (total_minor >= 0),
  paid_minor INTEGER NOT NULL DEFAULT 0 CHECK (paid_minor >= 0),
  cancellation_reason TEXT,
  approved_at TEXT,
  received_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  approved_by_user_id TEXT REFERENCES users(id),
  received_by_user_id TEXT REFERENCES users(id),
  cancelled_by_user_id TEXT REFERENCES users(id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX purchases_branch_number_unique ON purchases (branch_id, purchase_number);
--> statement-breakpoint
CREATE INDEX purchases_supplier_date_idx ON purchases (supplier_id, purchase_date);
--> statement-breakpoint
CREATE INDEX purchases_day_status_idx ON purchases (business_day_id, status);
--> statement-breakpoint
CREATE INDEX purchases_purchase_date_idx ON purchases (purchase_date);
--> statement-breakpoint
CREATE INDEX purchases_received_at_idx ON purchases (received_at);
--> statement-breakpoint

CREATE TABLE purchase_items (
  id TEXT PRIMARY KEY NOT NULL,
  purchase_id TEXT NOT NULL REFERENCES purchases(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  unit_id TEXT NOT NULL REFERENCES units(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost_minor INTEGER NOT NULL CHECK (unit_cost_minor >= 0),
  discount_minor INTEGER,
  tax_minor INTEGER,
  line_total_minor INTEGER NOT NULL CHECK (line_total_minor >= 0),
  returned_quantity INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT
);
--> statement-breakpoint
CREATE INDEX purchase_items_purchase_product_idx ON purchase_items (purchase_id, product_id);
--> statement-breakpoint
CREATE INDEX purchase_items_purchase_idx ON purchase_items (purchase_id);
--> statement-breakpoint
CREATE INDEX purchase_items_product_created_idx ON purchase_items (product_id, created_at);
--> statement-breakpoint

CREATE TABLE payment_methods (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  method_type TEXT NOT NULL DEFAULT 'cash',
  status TEXT NOT NULL DEFAULT 'active',
  is_system_method INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX payment_methods_store_code_unique ON payment_methods (store_id, code);
--> statement-breakpoint
CREATE INDEX payment_methods_store_status_idx ON payment_methods (store_id, status);
--> statement-breakpoint
CREATE INDEX payment_methods_type_idx ON payment_methods (method_type);
--> statement-breakpoint

CREATE TABLE customer_payments (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  business_day_id TEXT NOT NULL REFERENCES business_days(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  cash_account_id TEXT NOT NULL REFERENCES cash_accounts(id),
  payment_method_id TEXT NOT NULL REFERENCES payment_methods(id),
  payment_number TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  status TEXT NOT NULL DEFAULT 'recorded',
  paid_at TEXT NOT NULL,
  reversed_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  approved_by_user_id TEXT REFERENCES users(id),
  posted_by_user_id TEXT NOT NULL REFERENCES users(id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX customer_payments_branch_number_unique ON customer_payments (branch_id, payment_number);
--> statement-breakpoint
CREATE INDEX customer_payments_customer_paid_idx ON customer_payments (customer_id, paid_at);
--> statement-breakpoint
CREATE INDEX customer_payments_cash_paid_idx ON customer_payments (cash_account_id, paid_at);
--> statement-breakpoint
CREATE INDEX customer_payments_business_day_idx ON customer_payments (business_day_id);
--> statement-breakpoint
CREATE INDEX customer_payments_paid_at_idx ON customer_payments (paid_at);
--> statement-breakpoint

CREATE TABLE supplier_payments (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  business_day_id TEXT NOT NULL REFERENCES business_days(id),
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  cash_account_id TEXT NOT NULL REFERENCES cash_accounts(id),
  payment_method_id TEXT NOT NULL REFERENCES payment_methods(id),
  payment_number TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  status TEXT NOT NULL DEFAULT 'recorded',
  paid_at TEXT NOT NULL,
  reversed_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  approved_by_user_id TEXT REFERENCES users(id),
  posted_by_user_id TEXT NOT NULL REFERENCES users(id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX supplier_payments_branch_number_unique ON supplier_payments (branch_id, payment_number);
--> statement-breakpoint
CREATE INDEX supplier_payments_supplier_paid_idx ON supplier_payments (supplier_id, paid_at);
--> statement-breakpoint
CREATE INDEX supplier_payments_cash_paid_idx ON supplier_payments (cash_account_id, paid_at);
--> statement-breakpoint
CREATE INDEX supplier_payments_business_day_idx ON supplier_payments (business_day_id);
--> statement-breakpoint
CREATE INDEX supplier_payments_paid_at_idx ON supplier_payments (paid_at);
--> statement-breakpoint

CREATE TABLE expense_categories (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL,
  updated_at TEXT,
  archived_at TEXT,
  created_by_user_id TEXT,
  updated_by_user_id TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX expense_categories_store_code_unique ON expense_categories (store_id, code);
--> statement-breakpoint
CREATE UNIQUE INDEX expense_categories_store_name_unique ON expense_categories (store_id, name);
--> statement-breakpoint
CREATE INDEX expense_categories_store_status_idx ON expense_categories (store_id, status);
--> statement-breakpoint

CREATE TABLE expenses (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  business_day_id TEXT NOT NULL REFERENCES business_days(id),
  expense_category_id TEXT NOT NULL REFERENCES expense_categories(id),
  cash_account_id TEXT NOT NULL REFERENCES cash_accounts(id),
  expense_number TEXT NOT NULL,
  description TEXT NOT NULL,
  amount_minor INTEGER NOT NULL CHECK (amount_minor > 0),
  status TEXT NOT NULL DEFAULT 'recorded',
  expense_date TEXT NOT NULL,
  posted_at TEXT,
  reversed_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  created_by_user_id TEXT NOT NULL REFERENCES users(id),
  approved_by_user_id TEXT REFERENCES users(id),
  posted_by_user_id TEXT REFERENCES users(id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX expenses_branch_number_unique ON expenses (branch_id, expense_number);
--> statement-breakpoint
CREATE INDEX expenses_category_date_idx ON expenses (expense_category_id, expense_date);
--> statement-breakpoint
CREATE INDEX expenses_cash_date_idx ON expenses (cash_account_id, expense_date);
--> statement-breakpoint
CREATE INDEX expenses_business_day_idx ON expenses (business_day_id);
--> statement-breakpoint
CREATE INDEX expenses_expense_date_idx ON expenses (expense_date);
--> statement-breakpoint

CREATE TABLE inventory_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  branch_id TEXT NOT NULL REFERENCES branches(id),
  business_day_id TEXT NOT NULL REFERENCES business_days(id),
  product_id TEXT NOT NULL REFERENCES products(id),
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  movement_type TEXT NOT NULL,
  direction TEXT NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_cost_minor INTEGER,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'posted',
  posted_at TEXT NOT NULL,
  posted_by_user_id TEXT NOT NULL REFERENCES users(id),
  approved_by_user_id TEXT REFERENCES users(id),
  reversed_at TEXT,
  reversal_of_inventory_transaction_id TEXT,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX inventory_transactions_source_unique ON inventory_transactions (source_type, source_id, product_id, movement_type);
--> statement-breakpoint
CREATE INDEX inventory_transactions_product_posted_idx ON inventory_transactions (product_id, posted_at);
--> statement-breakpoint
CREATE INDEX inventory_transactions_branch_posted_idx ON inventory_transactions (branch_id, posted_at);
--> statement-breakpoint
CREATE INDEX inventory_transactions_source_idx ON inventory_transactions (source_type, source_id);
--> statement-breakpoint
CREATE INDEX inventory_transactions_movement_posted_idx ON inventory_transactions (movement_type, posted_at);
--> statement-breakpoint
CREATE INDEX inventory_transactions_status_idx ON inventory_transactions (status);
--> statement-breakpoint

CREATE TABLE settings (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  key TEXT NOT NULL,
  value_json TEXT NOT NULL,
  value_type TEXT NOT NULL,
  category TEXT NOT NULL,
  is_sensitive INTEGER NOT NULL DEFAULT 0,
  is_locked INTEGER NOT NULL DEFAULT 0,
  effective_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  created_by_user_id TEXT REFERENCES users(id),
  updated_by_user_id TEXT REFERENCES users(id),
  approved_by_user_id TEXT REFERENCES users(id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX settings_store_key_effective_unique ON settings (store_id, key, effective_at);
--> statement-breakpoint
CREATE INDEX settings_store_key_idx ON settings (store_id, key);
--> statement-breakpoint
CREATE INDEX settings_category_key_idx ON settings (category, key);
--> statement-breakpoint
CREATE INDEX settings_effective_at_idx ON settings (effective_at);
--> statement-breakpoint

CREATE TABLE audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  branch_id TEXT REFERENCES branches(id),
  business_day_id TEXT REFERENCES business_days(id),
  actor_user_id TEXT REFERENCES users(id),
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  reason TEXT,
  metadata_json TEXT,
  occurred_at TEXT NOT NULL,
  device_id TEXT,
  created_at TEXT NOT NULL
);
--> statement-breakpoint
CREATE INDEX audit_logs_actor_occurred_idx ON audit_logs (actor_user_id, occurred_at);
--> statement-breakpoint
CREATE INDEX audit_logs_target_idx ON audit_logs (target_type, target_id);
--> statement-breakpoint
CREATE INDEX audit_logs_action_occurred_idx ON audit_logs (action, occurred_at);
--> statement-breakpoint
CREATE INDEX audit_logs_business_day_idx ON audit_logs (business_day_id);
--> statement-breakpoint
CREATE INDEX audit_logs_occurred_at_idx ON audit_logs (occurred_at);
--> statement-breakpoint

CREATE TABLE business_events (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  branch_id TEXT REFERENCES branches(id),
  event_name TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  payload_summary_json TEXT,
  occurred_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_by_user_id TEXT REFERENCES users(id),
  audit_log_id TEXT REFERENCES audit_logs(id),
  sync_status TEXT NOT NULL DEFAULT 'local',
  sync_version INTEGER NOT NULL DEFAULT 1,
  device_id TEXT
);
--> statement-breakpoint
CREATE UNIQUE INDEX business_events_source_event_unique ON business_events (source_type, source_id, event_name);
--> statement-breakpoint
CREATE INDEX business_events_event_occurred_idx ON business_events (event_name, occurred_at);
--> statement-breakpoint
CREATE INDEX business_events_source_idx ON business_events (source_type, source_id);
--> statement-breakpoint
CREATE INDEX business_events_sync_status_occurred_idx ON business_events (sync_status, occurred_at);
--> statement-breakpoint
CREATE INDEX business_events_occurred_at_idx ON business_events (occurred_at);
--> statement-breakpoint

CREATE TABLE backups (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL REFERENCES stores(id),
  backup_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'requested',
  destination_type TEXT NOT NULL,
  file_name TEXT,
  file_size_bytes INTEGER,
  checksum TEXT,
  app_version TEXT NOT NULL,
  started_at TEXT,
  completed_at TEXT,
  verified_at TEXT,
  failure_reason TEXT,
  created_at TEXT NOT NULL,
  created_by_user_id TEXT REFERENCES users(id),
  verified_by_user_id TEXT REFERENCES users(id)
);
--> statement-breakpoint
CREATE UNIQUE INDEX backups_store_number_unique ON backups (store_id, backup_number);
--> statement-breakpoint
CREATE INDEX backups_checksum_idx ON backups (checksum);
--> statement-breakpoint
CREATE INDEX backups_store_status_idx ON backups (store_id, status);
--> statement-breakpoint
CREATE INDEX backups_completed_at_idx ON backups (completed_at);

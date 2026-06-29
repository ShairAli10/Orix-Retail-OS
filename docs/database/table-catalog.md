# Table Catalog

This catalog describes the proposed SQLite entities. It does not define SQL.

## Shared Field Conventions

Every table includes:

- `id`: UUID primary key.
- `created_at`: UTC timestamp.
- `updated_at`: UTC timestamp where updates are allowed.

Audited business tables also include:

- `created_by_user_id`: user that created the record where applicable.
- `updated_by_user_id`: user that last changed an editable record where applicable.
- `posted_by_user_id`: user that posted immutable business facts where applicable.
- `approved_by_user_id`: user that approved sensitive actions where applicable.

Future sync-ready tables should reserve conceptual fields:

- `device_id`: source device identifier.
- `sync_version`: monotonically increasing local version.
- `sync_status`: local-only, pending, synced, conflict, or ignored.

## stores

- Purpose: store legal and operating identity.
- Fields: id, name, trading_name, phone, email, address, registration_number, currency_code,
  status, activated_at, created_at, updated_at.
- Primary Key: id.
- Candidate Keys: normalized name; registration_number when present.
- Relationships: owns branches, users, roles, settings, business records.
- Constraints: name required; currency_code required before activation; one active primary store in
  Version 1.0.
- Indexes: status; normalized name.
- Audit Fields: created_by_user_id, updated_by_user_id.
- Soft Delete Policy: archive only; no hard delete after activation.
- Immutable?: No, but identity changes are audited.
- Versioned?: Yes for future sync and settings compatibility.

## branches

- Purpose: future multi-branch boundary with one default branch in Version 1.0.
- Fields: id, store_id, name, code, address, status, is_default, created_at, updated_at.
- Primary Key: id.
- Candidate Keys: store_id + code; store_id + normalized name.
- Relationships: belongs to stores; future parent for sales, purchases, inventory, cash sessions.
- Constraints: one default active branch per store in Version 1.0.
- Indexes: store_id + status; store_id + code.
- Audit Fields: created_by_user_id, updated_by_user_id.
- Soft Delete Policy: archive only when unused by active operations.
- Immutable?: No.
- Versioned?: Yes.

## users

- Purpose: local staff identity and audit attribution.
- Fields: id, store_id, display_name, username, status, last_login_at, created_at, updated_at,
  archived_at.
- Primary Key: id.
- Candidate Keys: store_id + username.
- Relationships: belongs to store; assigned roles through user_roles; creates/audits transactions.
- Constraints: username required and unique per store; at least one active owner/admin equivalent.
- Indexes: store_id + status; store_id + username.
- Audit Fields: created_by_user_id, updated_by_user_id.
- Soft Delete Policy: archive when historical records exist.
- Immutable?: No, but audit identity must remain stable in history.
- Versioned?: Yes.

## roles

- Purpose: named authorization groups.
- Fields: id, store_id, name, description, is_system_role, status, created_at, updated_at,
  archived_at.
- Primary Key: id.
- Candidate Keys: store_id + normalized name.
- Relationships: has user_roles and role_permissions.
- Constraints: system roles protected; archived roles cannot be assigned.
- Indexes: store_id + status; store_id + name.
- Audit Fields: created_by_user_id, updated_by_user_id.
- Soft Delete Policy: archive when used.
- Immutable?: No.
- Versioned?: Yes.

## permissions

- Purpose: catalog of capabilities such as sales.create or settings.edit.
- Fields: id, code, module, action, description, is_system_permission, created_at, updated_at.
- Primary Key: id.
- Candidate Keys: code.
- Relationships: assigned to roles through role_permissions.
- Constraints: code required and globally unique.
- Indexes: module + action; code.
- Audit Fields: created_by_user_id for custom permissions if ever allowed.
- Soft Delete Policy: system permissions are never deleted; custom permissions archived if added.
- Immutable?: System permissions are effectively immutable.
- Versioned?: Yes, through migration-managed permission catalog.

## user_roles

- Purpose: many-to-many assignment between users and roles.
- Fields: id, user_id, role_id, assigned_at, assigned_by_user_id, revoked_at, revoked_by_user_id.
- Primary Key: id.
- Candidate Keys: user_id + role_id + active assignment.
- Relationships: belongs to users and roles.
- Constraints: only active users and active roles may receive active assignments.
- Indexes: user_id; role_id; active assignment lookup.
- Audit Fields: assigned_by_user_id, revoked_by_user_id.
- Soft Delete Policy: revoke by timestamp; do not hard delete.
- Immutable?: Assignment history is immutable after revocation.
- Versioned?: Yes.

## role_permissions

- Purpose: many-to-many assignment between roles and permissions.
- Fields: id, role_id, permission_id, granted_at, granted_by_user_id, revoked_at,
  revoked_by_user_id.
- Primary Key: id.
- Candidate Keys: role_id + permission_id + active grant.
- Relationships: belongs to roles and permissions.
- Constraints: system-protected permissions require owner/admin policy to change.
- Indexes: role_id; permission_id; active grant lookup.
- Audit Fields: granted_by_user_id, revoked_by_user_id.
- Soft Delete Policy: revoke by timestamp; do not hard delete grant history.
- Immutable?: Grant history is immutable after revocation.
- Versioned?: Yes.

## business_days

- Purpose: daily operating boundary for sales, cash, payments, expenses, and reports.
- Fields: id, store_id, branch_id, business_date, status, opened_at, opened_by_user_id, closed_at,
  closed_by_user_id, expected_cash_minor, counted_cash_minor, cash_variance_minor, notes.
- Primary Key: id.
- Candidate Keys: branch_id + business_date.
- Relationships: parent for cash_sessions and daily transactions.
- Constraints: one open business day per branch in Version 1.0.
- Indexes: branch_id + status; business_date; opened_at; closed_at.
- Audit Fields: opened_by_user_id, closed_by_user_id.
- Soft Delete Policy: never delete after opening.
- Immutable?: Closed summaries are immutable except approved correction notes.
- Versioned?: Yes.

## categories

- Purpose: product classification.
- Fields: id, store_id, parent_category_id, name, code, status, created_at, updated_at, archived_at.
- Primary Key: id.
- Candidate Keys: store_id + parent_category_id + normalized name; store_id + code.
- Relationships: parent category; products.
- Constraints: active products cannot reference archived categories.
- Indexes: store_id + status; parent_category_id; normalized name.
- Audit Fields: created_by_user_id, updated_by_user_id.
- Soft Delete Policy: archive when used.
- Immutable?: No.
- Versioned?: Yes.

## brands

- Purpose: product brand labels.
- Fields: id, store_id, name, code, status, created_at, updated_at, archived_at.
- Primary Key: id.
- Candidate Keys: store_id + normalized name; store_id + code.
- Relationships: products.
- Constraints: active products cannot reference archived brands.
- Indexes: store_id + status; normalized name.
- Audit Fields: created_by_user_id, updated_by_user_id.
- Soft Delete Policy: archive when used.
- Immutable?: No.
- Versioned?: Yes.

## units

- Purpose: product measurement units.
- Fields: id, store_id, name, abbreviation, status, created_at, updated_at, archived_at.
- Primary Key: id.
- Candidate Keys: store_id + abbreviation; store_id + normalized name.
- Relationships: products.
- Constraints: products require active unit.
- Indexes: store_id + status; abbreviation.
- Audit Fields: created_by_user_id, updated_by_user_id.
- Soft Delete Policy: archive when used.
- Immutable?: No; conversions are future.
- Versioned?: Yes.

## products

- Purpose: sellable, purchasable, and stock-tracked item master.
- Fields: id, store_id, category_id, brand_id, unit_id, sku, barcode, name, description,
  product_type, status, is_stock_tracked, is_sellable, is_purchasable, sale_price_minor,
  purchase_cost_minor, reorder_level_quantity, created_at, updated_at, archived_at.
- Primary Key: id.
- Candidate Keys: store_id + sku; store_id + barcode.
- Relationships: category, brand, unit, sale_items, purchase_items, inventory_transactions.
- Constraints: name required; sale_price_minor and purchase_cost_minor non-negative; archived
  products cannot be added to new sale or purchase items.
- Indexes: store_id + status; sku; barcode; name search; category_id; brand_id; low-stock reporting.
- Audit Fields: created_by_user_id, updated_by_user_id.
- Soft Delete Policy: archive when used.
- Immutable?: No, but stock-tracking mode should become locked after movement.
- Versioned?: Yes.

## customers

- Purpose: buyer identity and receivable participant.
- Fields: id, store_id, name, phone, email, address, status, credit_allowed, credit_limit_minor,
  notes, created_at, updated_at, archived_at.
- Primary Key: id.
- Candidate Keys: store_id + phone when present; store_id + normalized name when policy requires.
- Relationships: sales, customer_payments, ledger_entries.
- Constraints: name required; archived customers cannot receive new credit sales.
- Indexes: store_id + status; phone; name search.
- Audit Fields: created_by_user_id, updated_by_user_id.
- Soft Delete Policy: archive when history exists.
- Immutable?: No.
- Versioned?: Yes.

## suppliers

- Purpose: vendor identity and payable participant.
- Fields: id, store_id, name, phone, email, address, status, payment_terms, notes, created_at,
  updated_at, archived_at.
- Primary Key: id.
- Candidate Keys: store_id + phone when present; store_id + normalized name when policy requires.
- Relationships: purchases, supplier_payments, ledger_entries.
- Constraints: name required; archived suppliers cannot be used for new purchases without approval.
- Indexes: store_id + status; phone; name search.
- Audit Fields: created_by_user_id, updated_by_user_id.
- Soft Delete Policy: archive when history exists.
- Immutable?: No.
- Versioned?: Yes.

## cash_accounts

- Purpose: cash drawer, petty cash, or bank-like local account.
- Fields: id, store_id, branch_id, name, account_type, status, currency_code, opened_at, closed_at,
  created_at, updated_at, archived_at.
- Primary Key: id.
- Candidate Keys: branch_id + normalized name.
- Relationships: cash_sessions, sale_payments, customer_payments, supplier_payments, expenses,
  ledger_entries.
- Constraints: at least one active account before cash workflows; closed accounts cannot receive
  new transactions.
- Indexes: branch_id + status; account_type.
- Audit Fields: created_by_user_id, updated_by_user_id, closed_by_user_id.
- Soft Delete Policy: archive when history exists.
- Immutable?: No; balance is derived from ledger_entries.
- Versioned?: Yes.

## cash_sessions

- Purpose: open/close cash drawer accountability for a business day.
- Fields: id, cash_account_id, business_day_id, opened_at, opened_by_user_id, opening_cash_minor,
  closed_at, closed_by_user_id, expected_cash_minor, counted_cash_minor, variance_minor, status,
  notes.
- Primary Key: id.
- Candidate Keys: cash_account_id + business_day_id + session sequence.
- Relationships: cash_account, business_day, user.
- Constraints: one open session per cash account in Version 1.0.
- Indexes: cash_account_id + status; business_day_id; opened_at; closed_at.
- Audit Fields: opened_by_user_id, closed_by_user_id.
- Soft Delete Policy: never delete after opening.
- Immutable?: Closed session financial facts are immutable.
- Versioned?: Yes.

## sales

- Purpose: sale document header.
- Fields: id, store_id, branch_id, business_day_id, customer_id, sale_number, sale_type, status,
  sale_date, subtotal_minor, discount_minor, tax_minor, total_minor, paid_minor, change_due_minor,
  cancellation_reason, completed_at, cancelled_at, returned_at, created_at, updated_at.
- Primary Key: id.
- Candidate Keys: branch_id + sale_number.
- Relationships: customer, sale_items, sale_payments, sales_returns, ledger_transactions,
  inventory_transactions.
- Constraints: totals non-negative; completed sales immutable; cash sale paid in full; credit sale
  requires customer.
- Indexes: branch_id + sale_number; business_day_id + status; customer_id + sale_date; sale_date;
  status.
- Audit Fields: created_by_user_id, completed_by_user_id, cancelled_by_user_id,
  approved_by_user_id.
- Soft Delete Policy: drafts may be discarded by policy; completed records never hard deleted.
- Immutable?: Yes after completed/cancelled/returned posting.
- Versioned?: Yes.

## sale_items

- Purpose: line items sold on a sale.
- Fields: id, sale_id, product_id, unit_id, quantity, unit_price_minor, discount_minor, tax_minor,
  line_total_minor, returned_quantity, created_at, updated_at.
- Primary Key: id.
- Candidate Keys: sale_id + line_number if line_number is included.
- Relationships: sale, product, unit, sales_return_items, inventory_transactions.
- Constraints: quantity greater than zero; unit_price non-negative; immutable after sale completion.
- Indexes: sale_id; product_id; product_id + created_at for reporting.
- Audit Fields: inherited from sale plus created_at.
- Soft Delete Policy: draft lines may be removed; posted lines never hard deleted.
- Immutable?: Yes after sale completion.
- Versioned?: Yes.

## sale_payments

- Purpose: immediate payments collected as part of sale completion, including mixed payment support.
- Fields: id, sale_id, cash_account_id, payment_method_id, amount_minor, received_minor,
  change_due_minor, status, paid_at, created_at.
- Primary Key: id.
- Candidate Keys: sale_id + payment sequence.
- Relationships: sale, cash_account, payment_method.
- Constraints: amount greater than zero; posted payments immutable.
- Indexes: sale_id; cash_account_id + paid_at; payment_method_id + paid_at.
- Audit Fields: created_by_user_id.
- Soft Delete Policy: never delete after posting.
- Immutable?: Yes after posting.
- Versioned?: Yes.

## sales_returns

- Purpose: return document header for sold goods.
- Fields: id, store_id, branch_id, business_day_id, original_sale_id, customer_id, return_number,
  status, reason, total_refund_minor, receivable_reduction_minor, cash_refund_minor, returned_at,
  created_at.
- Primary Key: id.
- Candidate Keys: branch_id + return_number.
- Relationships: original sale, customer, sales_return_items, ledger_transactions,
  inventory_transactions.
- Constraints: posted returns immutable; reason required.
- Indexes: original_sale_id; customer_id + returned_at; business_day_id; return_number.
- Audit Fields: created_by_user_id, approved_by_user_id, posted_by_user_id.
- Soft Delete Policy: drafts may be cancelled; posted returns never deleted.
- Immutable?: Yes after posting.
- Versioned?: Yes.

## sales_return_items

- Purpose: returned sale lines.
- Fields: id, sales_return_id, sale_item_id, product_id, quantity, condition, restock_action,
  refund_minor, created_at.
- Primary Key: id.
- Candidate Keys: sales_return_id + sale_item_id.
- Relationships: sales_return, sale_item, product, inventory_transactions.
- Constraints: quantity greater than zero; cannot exceed available unreturned quantity.
- Indexes: sales_return_id; sale_item_id; product_id.
- Audit Fields: inherited from sales_return.
- Soft Delete Policy: never delete after return posting.
- Immutable?: Yes after posting.
- Versioned?: Yes.

## purchases

- Purpose: purchase document header.
- Fields: id, store_id, branch_id, business_day_id, supplier_id, purchase_number, status,
  purchase_date, subtotal_minor, discount_minor, tax_minor, total_minor, paid_minor,
  cancellation_reason, approved_at, received_at, cancelled_at, created_at, updated_at.
- Primary Key: id.
- Candidate Keys: branch_id + purchase_number.
- Relationships: supplier, purchase_items, purchase_payments, purchase_returns,
  ledger_transactions, inventory_transactions.
- Constraints: totals non-negative; received purchases immutable; supplier required before approval.
- Indexes: branch_id + purchase_number; supplier_id + purchase_date; business_day_id + status;
  purchase_date.
- Audit Fields: created_by_user_id, approved_by_user_id, received_by_user_id,
  cancelled_by_user_id.
- Soft Delete Policy: drafts may be discarded; received records never hard deleted.
- Immutable?: Yes after received/cancelled posting.
- Versioned?: Yes.

## purchase_items

- Purpose: line items acquired from supplier.
- Fields: id, purchase_id, product_id, unit_id, quantity, unit_cost_minor, discount_minor, tax_minor,
  line_total_minor, returned_quantity, created_at, updated_at.
- Primary Key: id.
- Candidate Keys: purchase_id + line_number if line_number is included.
- Relationships: purchase, product, unit, purchase_return_items, inventory_transactions.
- Constraints: quantity greater than zero; unit_cost non-negative; immutable after receiving.
- Indexes: purchase_id; product_id; product_id + created_at for reporting.
- Audit Fields: inherited from purchase plus created_at.
- Soft Delete Policy: draft lines may be removed; posted lines never hard deleted.
- Immutable?: Yes after purchase receiving.
- Versioned?: Yes.

## purchase_payments

- Purpose: immediate supplier payment captured during purchase receiving.
- Fields: id, purchase_id, cash_account_id, payment_method_id, amount_minor, status, paid_at,
  created_at.
- Primary Key: id.
- Candidate Keys: purchase_id + payment sequence.
- Relationships: purchase, cash_account, payment_method.
- Constraints: amount greater than zero; cannot exceed payable in Version 1.0.
- Indexes: purchase_id; cash_account_id + paid_at; payment_method_id + paid_at.
- Audit Fields: created_by_user_id, approved_by_user_id where required.
- Soft Delete Policy: never delete after posting.
- Immutable?: Yes after posting.
- Versioned?: Yes.

## purchase_returns

- Purpose: return document header for goods returned to suppliers.
- Fields: id, store_id, branch_id, business_day_id, supplier_id, original_purchase_id,
  return_number, status, reason, total_value_minor, payable_reduction_minor, returned_at,
  created_at.
- Primary Key: id.
- Candidate Keys: branch_id + return_number.
- Relationships: supplier, original purchase, purchase_return_items, ledger_transactions,
  inventory_transactions.
- Constraints: reason required; posted returns immutable.
- Indexes: supplier_id + returned_at; original_purchase_id; business_day_id; return_number.
- Audit Fields: created_by_user_id, approved_by_user_id, posted_by_user_id.
- Soft Delete Policy: drafts may be cancelled; posted returns never deleted.
- Immutable?: Yes after posting.
- Versioned?: Yes.

## purchase_return_items

- Purpose: returned purchase lines.
- Fields: id, purchase_return_id, purchase_item_id, product_id, quantity, unit_cost_minor,
  line_total_minor, created_at.
- Primary Key: id.
- Candidate Keys: purchase_return_id + purchase_item_id.
- Relationships: purchase_return, purchase_item, product, inventory_transactions.
- Constraints: quantity greater than zero; cannot exceed returnable purchased quantity unless
  approved exception is recorded.
- Indexes: purchase_return_id; purchase_item_id; product_id.
- Audit Fields: inherited from purchase_return.
- Soft Delete Policy: never delete after posting.
- Immutable?: Yes after posting.
- Versioned?: Yes.

## inventory_transactions

- Purpose: immutable stock movement ledger.
- Fields: id, store_id, branch_id, business_day_id, product_id, source_type, source_id,
  movement_type, direction, quantity, unit_cost_minor, reason, status, posted_at, reversed_at,
  reversal_of_inventory_transaction_id, created_at.
- Primary Key: id.
- Candidate Keys: source_type + source_id + product_id + movement_type for idempotency.
- Relationships: product, business_day, user, source documents.
- Constraints: quantity greater than zero; posted rows immutable; reversal must reference original.
- Indexes: product_id + posted_at; branch_id + posted_at; source_type + source_id; status;
  movement_type.
- Audit Fields: posted_by_user_id, approved_by_user_id.
- Soft Delete Policy: never hard delete posted records.
- Immutable?: Yes after posting.
- Versioned?: Yes.

## inventory_counts

- Purpose: stock-take header and expected snapshot context.
- Fields: id, store_id, branch_id, business_day_id, count_number, scope_type, status, started_at,
  completed_at, notes, created_at, updated_at.
- Primary Key: id.
- Candidate Keys: branch_id + count_number.
- Relationships: inventory_count_items, business_day, users.
- Constraints: completed count immutable except notes; one active count per overlapping scope by
  policy.
- Indexes: branch_id + status; business_day_id; started_at; count_number.
- Audit Fields: created_by_user_id, completed_by_user_id, approved_by_user_id.
- Soft Delete Policy: draft counts may be cancelled; completed counts retained.
- Immutable?: Yes after completion.
- Versioned?: Yes.

## inventory_count_items

- Purpose: counted products and variance details.
- Fields: id, inventory_count_id, product_id, expected_quantity, counted_quantity,
  variance_quantity, adjustment_inventory_transaction_id, created_at, updated_at.
- Primary Key: id.
- Candidate Keys: inventory_count_id + product_id.
- Relationships: inventory_count, product, inventory_transaction.
- Constraints: counted_quantity cannot be negative; variance posts only on approval.
- Indexes: inventory_count_id; product_id; adjustment_inventory_transaction_id.
- Audit Fields: counted_by_user_id, approved_by_user_id.
- Soft Delete Policy: retained with count.
- Immutable?: Yes after count completion.
- Versioned?: Yes.

## ledger_transactions

- Purpose: financial posting header for a business source.
- Fields: id, store_id, branch_id, business_day_id, source_type, source_id, transaction_type,
  status, posted_at, reversed_at, reversal_of_ledger_transaction_id, memo, created_at.
- Primary Key: id.
- Candidate Keys: source_type + source_id + transaction_type for idempotency.
- Relationships: ledger_entries, source documents, business_day, users.
- Constraints: posted transactions immutable; reversal references original transaction.
- Indexes: source_type + source_id; business_day_id + posted_at; transaction_type + posted_at;
  status.
- Audit Fields: posted_by_user_id, approved_by_user_id.
- Soft Delete Policy: never hard delete posted records.
- Immutable?: Yes after posting.
- Versioned?: Yes.

## ledger_entries

- Purpose: financial lines used to derive cash, receivable, payable, revenue, purchase, and expense
  balances.
- Fields: id, ledger_transaction_id, entry_type, account_type, account_ref_type, account_ref_id,
  debit_minor, credit_minor, currency_code, memo, created_at.
- Primary Key: id.
- Candidate Keys: ledger_transaction_id + line_number if line_number is included.
- Relationships: ledger_transaction; optionally references customer, supplier, cash_account, or
  source classification by account_ref_type/account_ref_id.
- Constraints: exactly one of debit_minor or credit_minor is positive; posted parent immutable;
  transaction debits and credits must balance where double-entry policy applies.
- Indexes: ledger_transaction_id; account_type + account_ref_id; created_at; account_ref_id +
  created_at.
- Audit Fields: inherited from ledger_transaction.
- Soft Delete Policy: never hard delete.
- Immutable?: Yes after parent posting.
- Versioned?: Yes.

## customer_payments

- Purpose: standalone customer collection outside sale completion.
- Fields: id, store_id, branch_id, business_day_id, customer_id, cash_account_id,
  payment_method_id, payment_number, amount_minor, status, paid_at, reversed_at, notes, created_at.
- Primary Key: id.
- Candidate Keys: branch_id + payment_number.
- Relationships: customer, cash_account, payment_method, ledger_transaction.
- Constraints: amount greater than zero; cannot exceed receivable in Version 1.0 unless approved.
- Indexes: customer_id + paid_at; cash_account_id + paid_at; business_day_id; payment_number.
- Audit Fields: created_by_user_id, approved_by_user_id, posted_by_user_id.
- Soft Delete Policy: drafts may be cancelled; posted payments never deleted.
- Immutable?: Yes after posting.
- Versioned?: Yes.

## supplier_payments

- Purpose: standalone supplier payment outside purchase receiving.
- Fields: id, store_id, branch_id, business_day_id, supplier_id, cash_account_id,
  payment_method_id, payment_number, amount_minor, status, paid_at, reversed_at, notes, created_at.
- Primary Key: id.
- Candidate Keys: branch_id + payment_number.
- Relationships: supplier, cash_account, payment_method, ledger_transaction.
- Constraints: amount greater than zero; cannot exceed payable in Version 1.0 unless approved.
- Indexes: supplier_id + paid_at; cash_account_id + paid_at; business_day_id; payment_number.
- Audit Fields: created_by_user_id, approved_by_user_id, posted_by_user_id.
- Soft Delete Policy: drafts may be cancelled; posted payments never deleted.
- Immutable?: Yes after posting.
- Versioned?: Yes.

## expenses

- Purpose: non-inventory business cost.
- Fields: id, store_id, branch_id, business_day_id, expense_category_id, cash_account_id,
  expense_number, description, amount_minor, status, expense_date, posted_at, reversed_at, notes,
  created_at, updated_at.
- Primary Key: id.
- Candidate Keys: branch_id + expense_number.
- Relationships: expense_category, cash_account, ledger_transaction.
- Constraints: amount greater than zero; category required; posted expenses immutable.
- Indexes: expense_category_id + expense_date; cash_account_id + expense_date; business_day_id;
  expense_number.
- Audit Fields: created_by_user_id, approved_by_user_id, posted_by_user_id.
- Soft Delete Policy: drafts may be cancelled; posted expenses never deleted.
- Immutable?: Yes after posting.
- Versioned?: Yes.

## expense_categories

- Purpose: controlled classification for expenses.
- Fields: id, store_id, name, code, status, created_at, updated_at, archived_at.
- Primary Key: id.
- Candidate Keys: store_id + normalized name; store_id + code.
- Relationships: expenses.
- Constraints: archived categories cannot be used for new expenses.
- Indexes: store_id + status; code.
- Audit Fields: created_by_user_id, updated_by_user_id.
- Soft Delete Policy: archive when used.
- Immutable?: No.
- Versioned?: Yes.

## payment_methods

- Purpose: lookup for cash, card placeholder, bank transfer, wallet, or other payment modes.
- Fields: id, store_id, code, name, method_type, status, is_system_method, created_at, updated_at.
- Primary Key: id.
- Candidate Keys: store_id + code.
- Relationships: sale_payments, customer_payments, supplier_payments, purchase_payments.
- Constraints: active method required for new payments; Version 1.0 may enable cash by default.
- Indexes: store_id + status; method_type.
- Audit Fields: created_by_user_id, updated_by_user_id.
- Soft Delete Policy: archive when used.
- Immutable?: System methods effectively immutable.
- Versioned?: Yes.

## settings

- Purpose: store-level configuration.
- Fields: id, store_id, key, value_json, value_type, category, is_sensitive, is_locked, effective_at,
  created_at, updated_at.
- Primary Key: id.
- Candidate Keys: store_id + key + effective_at for versioned settings.
- Relationships: store; audit logs.
- Constraints: locked settings cannot be edited except by migration/approved policy.
- Indexes: store_id + key; category; effective_at.
- Audit Fields: created_by_user_id, updated_by_user_id, approved_by_user_id for sensitive settings.
- Soft Delete Policy: old setting versions retained; do not hard delete sensitive changes.
- Immutable?: Individual setting versions are immutable after superseded.
- Versioned?: Yes.

## audit_logs

- Purpose: append-only accountability record.
- Fields: id, store_id, branch_id, business_day_id, actor_user_id, action, target_type, target_id,
  reason, metadata_json, occurred_at, device_id, created_at.
- Primary Key: id.
- Candidate Keys: none; append-only event records.
- Relationships: actor user; optional target records by type/id; business events.
- Constraints: occurred_at required; action required; actor required unless system action.
- Indexes: actor_user_id + occurred_at; target_type + target_id; action + occurred_at;
  business_day_id.
- Audit Fields: audit log is itself the audit record.
- Soft Delete Policy: no deletion in Version 1.0.
- Immutable?: Yes.
- Versioned?: Yes.

## business_events

- Purpose: durable local business event log and future sync/outbox source.
- Fields: id, store_id, branch_id, event_name, source_type, source_id, payload_summary_json,
  occurred_at, created_at, created_by_user_id, audit_log_id, sync_status, sync_version, device_id.
- Primary Key: id.
- Candidate Keys: source_type + source_id + event_name for idempotent event creation where valid.
- Relationships: store, branch, audit_log, source document by type/id.
- Constraints: event_name required; occurred_at UTC; payload contains summary only, not duplicated
  business truth.
- Indexes: event_name + occurred_at; source_type + source_id; sync_status + occurred_at;
  occurred_at.
- Audit Fields: created_by_user_id, audit_log_id.
- Soft Delete Policy: append-only; no hard delete in Version 1.0.
- Immutable?: Yes.
- Versioned?: Yes.

## backups

- Purpose: backup attempt metadata and restore confidence.
- Fields: id, store_id, backup_number, status, destination_type, file_name, file_size_bytes,
  checksum, app_version, started_at, completed_at, verified_at, failure_reason, created_at.
- Primary Key: id.
- Candidate Keys: store_id + backup_number; checksum where present.
- Relationships: store, user, audit logs.
- Constraints: completed backups require checksum or verification metadata where possible.
- Indexes: store_id + status; completed_at; backup_number.
- Audit Fields: created_by_user_id, verified_by_user_id where applicable.
- Soft Delete Policy: metadata retained; physical backup retention policy is separate.
- Immutable?: Completed backup metadata immutable except retention annotations.
- Versioned?: Yes.

## document_prints

- Purpose: receipt and report print attempt history.
- Fields: id, store_id, branch_id, document_type, document_id, print_type, status, printer_name,
  attempted_at, printed_at, failure_reason, reprint_reason, created_at.
- Primary Key: id.
- Candidate Keys: document_type + document_id + print attempt sequence.
- Relationships: business document by type/id; user.
- Constraints: failed print must not reverse business document.
- Indexes: document_type + document_id; status + attempted_at; branch_id + attempted_at.
- Audit Fields: created_by_user_id, approved_by_user_id for reprints.
- Soft Delete Policy: retain print attempts.
- Immutable?: Yes after attempt recorded.
- Versioned?: Yes.

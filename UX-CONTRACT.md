# Orix workflow contract

Scope: single-counter offline desktop. Preserve existing workflows while hardening touched capabilities.

| Capability        | Canonical owner                            | Contract                                                                           |
| ----------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Settings sections | SettingsPanel in renderer/index.tsx        | Natural content height within existing main-content scroller                       |
| Buttons           | Global styles.css and native button        | Named actions, keyboard focus, busy/disabled states                                |
| Dialog            | components/dialog.tsx                      | Label, focus containment, Escape, focus restoration                                |
| Files             | Electron main-process dialog               | OS-owned save/open chooser; renderer cannot select an arbitrary export destination |
| Feedback          | Shared Toast plus inline role=status/alert | Important errors persist inline; no success on cancellation                        |
| Support           | features/support/diagnostics-panel.tsx     | Owner permission in backend; export is manual, no automatic transmission           |

Diagnostics: display loading, logging-unavailable, cancellation, success, and failure states. Prevent duplicate export submission. Recovery notices advise checking Sales History; never assert that every interrupted operation rolled back. Raw crash dumps stay local and are excluded from the support ZIP.

Existing untouched legacy dialogs and larger tables remain migration work; this contract does not certify all screens as compliant.

Onboarding: three named steps; automatic default location for the single counter; native form submission; focus first invalid input, including fields inside optional details. Setup secrets stay in memory. Post-setup readiness uses actual item/counter/backup status and explicitly labelled human confirmations. Persist only checklist booleans per owner in the local profile. Use a compact reminder on Sell to preserve checkout visibility.

Settings: five accessible tabs replace section shortcuts. Arrow keys and Home/End move between tabs; panels retain their state while hidden. Save and Discard appear only on Store & appearance and Receipts; the unsaved indicator remains visible throughout. Operational panels use the full content width. Appearance, store name and receipt edits remain drafts until Save Settings. Theme preview is restored to the saved preference on leaving Settings. Backup-folder updates preserve unrelated draft fields. Import, backup and user actions execute independently of Save Settings.

Inventory: default columns prioritize barcode, item, category, current/minimum stock, selling price, status and actions. Additional columns remain selectable with readable labels; item and action columns stay available. Item names are keyboard-operable detail buttons. Six summary cards keep cost and selling valuations separate; quantities across different units are not combined into a headline total. Wide tables scroll within their container, while filters reflow at narrower widths.

Reports: date edits remain drafts until Run Reports; Refresh reloads the applied dates. Validate missing or reversed dates before requesting data. Sales exports use the loaded report period; current-balance exports use the snapshot date. Ignore responses after their request is superseded or the page unmounts. Disable export and print while loading, unavailable or in an error state. Explain that sales and posted returns use the date range. Report tabs expose selection and support arrow/Home/End navigation; tables scroll within their container.

Sales History: invoice numbers open details by keyboard or pointer. Search/status controls have explicit labels; loading, failure and filtered-empty states are distinct. Superseded list requests cannot replace newer results. The details drawer reuses Dialog focus containment, Escape and focus restoration with its existing drawer layout; show sale date and returned quantities.

Sales Returns: preview and repository posting share the core refund allocation function, including original discounts/tax and cumulative partial-return rounding. Reject non-finite, negative or excessive quantities; require a selection and reason. A synchronous in-flight guard blocks repeated clicks, with fields and close actions disabled during posting. Backend validation remains authoritative, including cash already refunded. Posting failures stay inline; uncertain transport outcomes advise checking returned quantities. The return dialog uses shared keyboard focus and Escape handling.

Return accounting: preserve original invoices and expose separate none/partial/full return status, cumulative returned amount and net invoice total. Details show sold, returned and remaining quantities. Fully returned sales cannot start another return. Gross sales minus returns posted in the selected period gives net period sales, including returns of older invoices; invoice rows show cumulative returns. Cash returns reduce drawer cash; account credits reduce customer receivables. Only sellable returned quantities increase stock. No schema migration is needed for these derived summaries.

Sales list layout: five columns (invoice/customer, date, original sale total, one current status, View details). At 1100px and below, show sale cards. The list always preserves the original invoice amount, including returned/cancelled invoices; status explains its state. Refund amounts, remaining sale value and original payment belong in the details drawer. Reprint receipt and Return items live in the drawer; close it before opening their dialogs to avoid competing focus traps. Period reports continue to show net sales after returns.

Customer Book: default columns are name, phone, balance, status and actions; optional columns use readable labels and preserve name/actions. Balance sign is explained as To collect, Customer credit or Settled. At narrow widths, cards keep actions visible. Profile, edit and payment dialogs use shared focus handling; hide the profile while a child form is open to prevent competing focus traps. Remove unavailable WhatsApp placeholder.

Suppliers: five list columns (supplier, phone, balance, status, actions), with the same narrow-window cards as Customer Book. Explain payable balances as To pay, negative balances as Credit with supplier, and zero as Settled. Keep city, terms and last purchase in the profile. Supplier profile, edit and payment dialogs share focus handling; only one dialog is mounted at a time.

Buy Stock: six list columns keep purchase/supplier, date, original total, payment, status and available actions visible. Narrow windows use cards; item entry reflows into labelled columns. Draft, details and supplier-return dialogs share keyboard focus handling. Explain that saving a draft does not receive inventory. Supplier-return previews use the shared refund allocation including discounts and tax, excluding freight and other charges; validate quantities and require a reason. Preserve the original purchase total after returns.

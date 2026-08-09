# Returns and Reversals

## Purpose

Returns are separate business documents. A completed sale or received purchase is never edited in
place. Orix Retail OS records the return, then posts inventory and ledger impact from that return.

## Sales Returns

- A sales return must reference a completed sale.
- Each returned line references the original sale item.
- Returned quantity cannot exceed the original quantity minus prior returns.
- Sellable returns create an inbound inventory transaction.
- Damaged returns do not restock inventory.
- Cash refunds reduce cash through ledger entries.
- Customer-credit refunds reduce customer receivable through ledger entries.
- Walk-in customer sales cannot be refunded to customer credit.

## Purchase Returns

- A purchase return must reference a received purchase.
- Each returned line references the original purchase item.
- Returned quantity cannot exceed the original received quantity minus prior returns.
- Current stock must be available before stock can be returned to a supplier.
- Purchase returns create outbound inventory transactions.
- Supplier payable is reduced through ledger entries.

## Audit And Events

Sales returns produce `SaleReturned`, `InventoryIncreased`, and `LedgerEntryPosted`.
Purchase returns produce `PurchaseReturned`, `InventoryReduced`, and `LedgerEntryPosted`.

Both workflows write audit logs with the original document number, return number, reason, and
financial value.

## User Experience

Returns are available from Sales History and Buy Stock. Users choose return quantities from the
original document, enter a reason, and post the return. Orix keeps original documents immutable and
shows friendly errors when a return is not allowed.

## Known Limitations

- Manager approval for refunds is reserved for a future release.
- Dedicated printed return receipts are not yet implemented.
- Cash drawer balance enforcement for refunds is not yet strict.

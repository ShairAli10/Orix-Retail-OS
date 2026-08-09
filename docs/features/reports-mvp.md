# Reports MVP

Reports give store owners a daily operating view without requiring technical database knowledge.
Every report derives from transactional tables; reports do not store independent balances.

## Reports Included

- Daily sales
- Cash drawer
- Inventory value
- Low stock
- Customer receivables
- Supplier payables

## Data Philosophy

- Sales totals come from completed sales only.
- Cash drawer values derive from cash sessions, completed cash sales, customer cash collections,
  and supplier cash payments.
- Inventory quantity derives from posted inventory transactions.
- Inventory value multiplies current derived quantity by product cost and retail prices.
- Customer receivables derive from customer ledger entries.
- Supplier payables derive from supplier ledger entries.

## User Experience

The Reports screen opens with today's date range. Users can change the date range, refresh, print,
or export the active report tab as CSV.

The first version intentionally keeps report controls simple:

- Date range at the top.
- Summary cards for critical totals.
- Tabs for each operational report.
- Empty states when no data exists.
- Tables that scroll horizontally on smaller laptop screens.

## Known Limitations

- Reports currently load a capped result set for desktop usability.
- Aging buckets are not implemented yet.
- Profit and margin reports are excluded until cost data is more reliable.
- Print output uses the browser print flow; dedicated print layouts still need QA.

## Future Enhancements

- Aging reports for customers and suppliers.
- Profit and margin reports.
- Stock movement report.
- Expense report.
- Saved report presets.
- Date shortcuts such as Today, Yesterday, This Week, This Month.
- Export to PDF.

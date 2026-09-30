import { useCallback, useEffect, useRef, useState } from "react";
import type { CounterSummaryDto } from "@orix/electron";

const money = (minor: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(minor / 100);
const varianceLabel = (value: number) =>
  value < 0 ? "Cash shortage" : value > 0 ? "Extra cash" : "Cash matches";
const minor = (value: string) => Math.round(Number(value) * 100);
export const CounterPage = ({
  canExpense,
  onChanged
}: {
  readonly canExpense: boolean;
  readonly onChanged: () => void;
}) => {
  const [summary, setSummary] = useState<CounterSummaryDto | null>(null);
  const [opening, setOpening] = useState("0");
  const [counted, setCounted] = useState("");
  const [reason, setReason] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [operationId, setOperationId] = useState(() => crypto.randomUUID());
  const inFlight = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await window.orix.counter.summary();
      if (result.ok) setSummary(result.value);
      else {
        setSummary(null);
        setError(result.error.message);
      }
    } catch {
      setSummary(null);
      setError("Counter could not be loaded. Try refreshing.");
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  const run = async (action: "open" | "close" | "expense") => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result =
        action === "open"
          ? await window.orix.counter.open({ openingCashMinor: minor(opening) })
          : action === "close"
            ? await window.orix.counter.close({ countedCashMinor: minor(counted), reason })
            : await window.orix.counter.expense({
                amountMinor: minor(amount),
                description,
                operationId
              });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      setSummary(result.value);
      if (result.value.backupWarning) setError(result.value.backupWarning);
      setMessage(
        action === "expense"
          ? "Expense recorded."
          : action === "close"
            ? "Counter closed. Cash count saved."
            : "Counter opened. Ready to sell."
      );
      if (action === "expense") {
        setAmount("");
        setDescription("");
        setOperationId(crypto.randomUUID());
      }
      onChanged();
    } catch {
      setError(
        "The response was interrupted. Refresh before closing again; expense retries are safe."
      );
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  };
  const open = summary?.session?.status === "open";
  const variance =
    counted.trim() === "" || !Number.isFinite(Number(counted))
      ? null
      : minor(counted) - (summary?.expectedCashMinor ?? 0);
  return (
    <section className="counter-page">
      <header className="page-heading">
        <div>
          <p className="eyebrow">Daily operations</p>
          <h1>Counter & Expenses</h1>
          <p>Account for the cash that enters and leaves your drawer.</p>
        </div>
        <button
          disabled={busy}
          onClick={() => {
            void load();
          }}
        >
          Refresh
        </button>
      </header>
      {error ? (
        <p className="counter-error" role="alert">
          {error}
        </p>
      ) : null}
      <p className="counter-feedback" role="status">
        {message}
      </p>
      {summary === null ? (
        <p role="status">
          {busy ? "Loading counter…" : "Counter unavailable. Refresh to try again."}
        </p>
      ) : (
        <>
          <div className="counter-overview card">
            <div>
              <span className={`badge ${open ? "success" : "muted"}`}>
                {open
                  ? "Counter is open"
                  : summary.session
                    ? "Counter is closed"
                    : "Not opened yet"}
              </span>
              <h2>
                {open
                  ? "Ready for the trading day"
                  : summary.session
                    ? "Trading day completed"
                    : "Count your opening float"}
              </h2>
              <p>
                {open
                  ? "Record expenses as they happen. Count the drawer before closing."
                  : summary.session
                    ? "Your closing count and difference are preserved in the audit history."
                    : "Enter the actual cash in the drawer before serving customers."}
              </p>
            </div>
            <div className="counter-cash">
              <span>Expected drawer cash</span>
              <strong>{money(summary.expectedCashMinor)}</strong>
            </div>
          </div>
          <div className="counter-grid">
            <section className="card counter-panel">
              <h2>
                {open
                  ? "Close the counter"
                  : summary.session
                    ? "Closing summary"
                    : "Open the counter"}
              </h2>
              {!summary.session ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run("open");
                  }}
                >
                  <label>
                    Opening cash
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={busy}
                      value={opening}
                      onChange={(event) => {
                        setOpening(event.target.value);
                      }}
                      required
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    Open Counter
                  </button>
                </form>
              ) : open ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    if (window.confirm("Close the counter and save this cash count?"))
                      void run("close");
                  }}
                >
                  <label>
                    Counted cash
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      disabled={busy}
                      value={counted}
                      onChange={(event) => {
                        setCounted(event.target.value);
                      }}
                      required
                    />
                  </label>
                  <div className="counter-variance">
                    <span>{variance === null ? "Cash difference" : varianceLabel(variance)}</span>
                    <strong>
                      {variance === null ? "Enter your cash count" : money(Math.abs(variance))}
                    </strong>
                  </div>
                  <label>
                    Difference explanation
                    <textarea
                      disabled={busy}
                      required={variance !== null && variance !== 0}
                      minLength={variance !== null && variance !== 0 ? 3 : undefined}
                      value={reason}
                      onChange={(event) => {
                        setReason(event.target.value);
                      }}
                      placeholder="Required when counted cash differs"
                    />
                  </label>
                  <button className="primary" disabled={busy}>
                    Close Counter
                  </button>
                </form>
              ) : (
                <dl>
                  <dt>Opening float</dt>
                  <dd>{money(summary.session.openingCashMinor)}</dd>
                  <dt>Counted cash</dt>
                  <dd>{money(summary.session.countedCashMinor ?? 0)}</dd>
                  <dt>{varianceLabel(summary.session.varianceMinor ?? 0)}</dt>
                  <dd>{money(Math.abs(summary.session.varianceMinor ?? 0))}</dd>
                  <dt>Explanation</dt>
                  <dd>{summary.session.notes ?? "No difference recorded"}</dd>
                </dl>
              )}
            </section>
            <section className="card counter-panel">
              <h2>Record an expense</h2>
              <p>
                {open
                  ? "Cash paid out for deliveries, supplies, and other store costs."
                  : "Open the counter to record cash expenses."}
              </p>
              {canExpense ? (
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void run("expense");
                  }}
                >
                  <label>
                    Expense description
                    <input
                      value={description}
                      onChange={(event) => {
                        setDescription(event.target.value);
                      }}
                      required
                      minLength={3}
                      disabled={!open || busy}
                    />
                  </label>
                  <label>
                    Expense amount
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={amount}
                      onChange={(event) => {
                        setAmount(event.target.value);
                      }}
                      required
                      disabled={!open || busy}
                    />
                  </label>
                  <button className="primary" disabled={!open || busy}>
                    Record Expense
                  </button>
                </form>
              ) : (
                <p>Ask the owner or manager to record a drawer expense.</p>
              )}
            </section>
          </div>
          <section className="card counter-panel">
            <h2>Expenses this business day</h2>
            {summary.expenses.length === 0 ? (
              <p>No expenses recorded.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Time</th>
                      <th>Amount</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {summary.expenses.map((expense) => (
                      <tr key={expense.id}>
                        <td>{expense.description}</td>
                        <td>
                          {new Date(expense.expenseDate).toLocaleTimeString("en-PK", {
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </td>
                        <td>{money(expense.amountMinor)}</td>
                        <td>
                          {expense.status === "posted"
                            ? "Recorded"
                            : expense.status === "voided"
                              ? "Voided"
                              : expense.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </section>
  );
};

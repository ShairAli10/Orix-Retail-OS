import { useEffect, useState } from "react";
import type { RouteId } from "../../routing.js";

let enabledThisSession = false;
export function enableReadiness(): void {
  enabledThisSession = true;
  try {
    localStorage.setItem("orix:readiness-enabled", "true");
  } catch {
    /* Remains available for this session. */
  }
}
export function readinessEnabled(): boolean {
  try {
    return enabledThisSession || localStorage.getItem("orix:readiness-enabled") === "true";
  } catch {
    return enabledThisSession;
  }
}

type Checks = { stock: boolean; hardware: boolean; dismissed: boolean };
const emptyChecks: Checks = { stock: false, hardware: false, dismissed: false };
export function CounterReadiness({
  userId,
  route,
  onNavigate
}: {
  readonly userId: string;
  readonly route: RouteId;
  readonly onNavigate: (route: RouteId) => void;
}) {
  const key = `orix:readiness:${userId}`;
  const [checks, setChecks] = useState<Checks>(() => {
    try {
      return { ...emptyChecks, ...(JSON.parse(localStorage.getItem(key) ?? "{}") as Checks) };
    } catch {
      return emptyChecks;
    }
  });
  const [status, setStatus] = useState<{
    products: boolean;
    counter: boolean;
    backup: boolean;
  } | null>(null);
  const [error, setError] = useState("");
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setStatus(null);
    setError("");
    void Promise.all([
      window.orix.products.list({
        page: 1,
        pageSize: 1,
        status: "active",
        sortBy: "name",
        sortDirection: "asc"
      }),
      window.orix.counter.summary(),
      window.orix.backups.status()
    ])
      .then(([products, counter, backups]) => {
        if (!active) return;
        if (!products.ok || !counter.ok || !backups.ok) {
          setError("Readiness could not be checked. Retry before relying on these statuses.");
          return;
        }
        setStatus({
          products: products.value.totalItems > 0,
          counter: counter.value.session?.status === "open",
          backup: backups.value.recentBackups.some((backup) => backup.verifiedAt !== null)
        });
      })
      .catch(() => {
        if (active) setError("Readiness could not be checked. Please retry.");
      });
    return () => {
      active = false;
    };
  }, [route, revision]);
  const save = (next: Checks) => {
    setChecks(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      setError("Checklist progress could not be saved on this computer.");
    }
  };
  if (checks.dismissed)
    return route === "dashboard" ? (
      <button
        onClick={() => {
          save({ ...checks, dismissed: false });
        }}
      >
        Review counter readiness
      </button>
    ) : null;
  if (route === "pos")
    return (
      <aside className="readiness-reminder" aria-label="Counter preparation">
        <span>
          {status && !status.products
            ? "Your catalog is empty. Add items before scanning."
            : "Finish your counter preparation before serving customers."}
        </span>
        <button
          onClick={() => {
            onNavigate("dashboard");
          }}
        >
          Review setup checks
        </button>
        {status && !status.products ? (
          <button
            onClick={() => {
              onNavigate("products");
            }}
          >
            Add first items
          </button>
        ) : null}
        {status && !status.counter ? (
          <button
            onClick={() => {
              onNavigate("expenses");
            }}
          >
            Open counter
          </button>
        ) : null}
        {error ? <span role="alert">{error}</span> : null}
      </aside>
    );
  const ready =
    status?.products && status.counter && status.backup && checks.stock && checks.hardware;
  return (
    <section className="card readiness-panel" aria-labelledby="readiness-title">
      <div>
        <h2 id="readiness-title">Prepare your counter</h2>
        <p>
          Complete these checks before serving customers. Progress stays on this computer. Hardware
          and stock checks are your confirmation.
        </p>
      </div>
      {error ? <p role="alert">{error}</p> : null}
      {!status && !error ? <p role="status">Checking store readiness…</p> : null}
      <ol className="readiness-list">
        <li>
          <strong>
            {status
              ? status.products
                ? "Items available"
                : "Add your first items"
              : "Items: not checked"}
          </strong>
          <p>
            Add items with prices and barcodes, or import your existing catalog through Settings.
          </p>
          <button
            onClick={() => {
              onNavigate("products");
            }}
          >
            Manage items
          </button>
        </li>
        <li>
          <strong>Review opening stock</strong>
          <p>Record and check actual quantities before selling.</p>
          <button
            onClick={() => {
              onNavigate("inventory");
            }}
          >
            Review stock
          </button>
          <label className="check-row">
            <input
              type="checkbox"
              checked={checks.stock}
              onChange={(event) => {
                save({ ...checks, stock: event.target.checked });
              }}
            />
            I checked the opening quantities
          </label>
        </li>
        <li>
          <strong>
            {status
              ? status.counter
                ? "Counter is open"
                : "Open the counter"
              : "Counter: not checked"}
          </strong>
          <p>Count the opening cash float and record it in Counter &amp; Expenses.</p>
          <button
            onClick={() => {
              onNavigate("expenses");
            }}
          >
            Go to counter
          </button>
        </li>
        <li>
          <strong>Check scanner and receipts</strong>
          <p>
            Scan a known item and check its price. Check the printer and receipt layout before live
            trading; do not complete a dummy sale in live records.
          </p>
          <button
            onClick={() => {
              onNavigate("settings");
            }}
          >
            Receipt settings
          </button>
          <label className="check-row">
            <input
              type="checkbox"
              checked={checks.hardware}
              onChange={(event) => {
                save({ ...checks, hardware: event.target.checked });
              }}
            />
            I checked my scanner and receipt output
          </label>
        </li>
        <li>
          <strong>
            {status
              ? status.backup
                ? "Verified backup recorded"
                : "Create and verify a backup"
              : "Backup: not checked"}
          </strong>
          <p>
            Keep a verified copy away from this computer. A local backup alone cannot protect
            against disk loss.
          </p>
          <button
            onClick={() => {
              onNavigate("settings");
            }}
          >
            Backup settings
          </button>
        </li>
      </ol>
      <p>
        Optional: create a separate cashier account in Settings if someone else operates the
        counter.
      </p>
      <div className="dialog-actions">
        <button
          onClick={() => {
            setRevision((value) => value + 1);
          }}
        >
          Refresh readiness
        </button>
        <button
          className="primary"
          disabled={!ready}
          onClick={() => {
            save({ ...checks, dismissed: true });
            onNavigate("pos");
          }}
        >
          Finish checks and open POS
        </button>
      </div>
    </section>
  );
}

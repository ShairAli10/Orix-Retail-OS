import { useEffect, useRef, useState } from "react";
import type { DiagnosticsStatusDto } from "@orix/electron";
export const DiagnosticsPanel = () => {
  const [status, setStatus] = useState<DiagnosticsStatusDto | null>(null);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const load = async () => {
    try {
      const result = await window.orix.diagnostics.status();
      if (result.ok) setStatus(result.value);
      else setError(result.error.message);
    } catch {
      setError("Support details could not be loaded. Try again.");
    }
  };
  useEffect(() => {
    void load();
  }, []);
  const exportLogs = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await window.orix.diagnostics.export();
      if (!result.ok) setError(result.error.message);
      else
        setMessage(
          result.value.filePath === null
            ? "Export cancelled."
            : "Diagnostics exported. Share the ZIP with your support contact."
        );
    } catch {
      setError("Diagnostics could not be exported. Try again.");
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  return (
    <section aria-label="Support diagnostics" className="page-stack">
      <p>Export a support file to help investigate a problem. Nothing is sent automatically.</p>
      {status === null ? (
        error ? null : (
          <p role="status">Loading support details…</p>
        )
      ) : (
        <>
          <dl>
            <dt>App version</dt>
            <dd>{status.appVersion}</dd>

            <dt>Crash logging</dt>
            <dd>
              {status.loggingAvailable
                ? "Active"
                : "Unavailable — check folder permissions and free disk space"}
            </dd>
          </dl>
          <details>
            <summary>Technical details for support</summary>
            <p>
              Build reference: <code>{status.buildId.slice(0, 16)}</code>
            </p>
          </details>
          {status.previousUncleanShutdown ? (
            <p role="alert">
              The last session ended unexpectedly or reported a crash. Check Sales History before
              retrying a payment.
            </p>
          ) : null}
        </>
      )}
      <p>
        The ZIP excludes store records, credentials, raw error messages, and native memory dumps.
      </p>
      <div className="row-actions">
        <button
          className="primary"
          disabled={busy || !status?.loggingAvailable}
          aria-busy={busy}
          onClick={() => {
            void exportLogs();
          }}
        >
          Export Diagnostics
        </button>
        <button
          disabled={busy}
          onClick={() => {
            setError("");
            void load();
          }}
        >
          Refresh
        </button>
      </div>
      {busy || message ? <p role="status">{busy ? "Preparing diagnostics…" : message}</p> : null}
      {error ? <p role="alert">{error}</p> : null}
    </section>
  );
};
export const DiagnosticNotice = () => {
  const [notice, setNotice] = useState("");
  const [dismissed, setDismissed] = useState(false);
  useEffect(() => {
    let active = true;
    void window.orix.diagnostics
      .notice()
      .then((result) => {
        if (active && result.ok) {
          setNotice(
            !result.value.loggingAvailable
              ? "Crash logging is unavailable. Ask the owner to check free disk space and folder permissions."
              : result.value.previousUncleanShutdown
                ? "Orix previously stopped unexpectedly. Check Sales History before retrying a payment. The owner can export diagnostics from Settings."
                : ""
          );
        }
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  return notice && !dismissed ? (
    <aside className="diagnostic-notice" role="alert">
      <p>{notice}</p>
      <button
        onClick={() => {
          setDismissed(true);
        }}
      >
        Dismiss
      </button>
    </aside>
  ) : null;
};

import { useRef, useState } from "react";
import { Dialog } from "../../components/dialog.js";

export const ResetStoreData = () => {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [backup, setBackup] = useState("");
  const running = useRef(false);
  const finish = () => {
    window.location.reload();
  };
  const close = () => {
    if (busy) return;
    if (backup) {
      finish();
      return;
    }
    setOpen(false);
    setPassword("");
    setConfirmation("");
    setError("");
  };
  const reset = async () => {
    if (running.current) return;
    running.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await window.orix.migration.resetStoreData({ password, confirmation });
      if (!response.ok) {
        setError(response.error.message);
        return;
      }
      setPassword("");
      setBackup(response.value.backupFile);
      // Prevent cached baskets or import corrections referencing deleted records.
      for (const key of Object.keys(localStorage)) {
        if (
          key.startsWith("orix.basket.") ||
          key.startsWith("orix:sql-review:") ||
          key.startsWith("orix:readiness:")
        )
          localStorage.removeItem(key);
      }
    } catch {
      setError(
        "Could not confirm the reset result. Reload Orix and check the data before retrying."
      );
    } finally {
      running.current = false;
      setBusy(false);
    }
  };
  return (
    <>
      <section className="reset-store-panel">
        <h3>Start again after testing</h3>
        <p>
          Clear this store’s trading data to import a fresh POS export. Your users, store settings,
          backups and audit history are kept.
        </p>
        <button
          className="danger"
          onClick={() => {
            setOpen(true);
          }}
        >
          Reset store data
        </button>
      </section>
      {open && (
        <Dialog label="Reset store data" onClose={close}>
          <section className="modal user-editor">
            <header>
              <h2>{backup ? "Store data cleared" : "Reset store data?"}</h2>
              <button disabled={busy} onClick={close}>
                Close
              </button>
            </header>
            <div className="user-editor-body page-stack">
              {backup ? (
                <>
                  <p>Your store is ready for a fresh import. Reload to refresh all screens.</p>
                  <p style={{ overflowWrap: "anywhere" }}>Verified backup: {backup}</p>
                </>
              ) : (
                <>
                  <p>
                    This removes all products, stock, customers, suppliers, sales, returns,
                    purchases, payments, expenses, counter sessions and previous import records.
                  </p>
                  <p>
                    Close the counter first. A verified backup is required and will be created
                    automatically. If backup creation fails, nothing is cleared.
                  </p>
                  <p>
                    Your user accounts, passwords, store settings, backups and audit history stay
                    available.
                  </p>
                  <label>
                    Owner password
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={password}
                      disabled={busy}
                      onChange={(e) => {
                        setPassword(e.target.value);
                      }}
                    />
                  </label>
                  <label>
                    Type RESET STORE DATA
                    <input
                      value={confirmation}
                      disabled={busy}
                      autoComplete="off"
                      onChange={(e) => {
                        setConfirmation(e.target.value);
                      }}
                    />
                  </label>
                </>
              )}
              {error && (
                <p role="alert" className="field-error">
                  {error}
                </p>
              )}
            </div>
            <footer>
              {backup ? (
                <button className="primary" onClick={finish}>
                  Reload Orix
                </button>
              ) : (
                <>
                  <button disabled={busy} onClick={close}>
                    Cancel
                  </button>
                  <button
                    className="danger"
                    disabled={busy || !password || confirmation !== "RESET STORE DATA"}
                    onClick={() => {
                      void reset();
                    }}
                  >
                    {busy ? "Backing up & clearing…" : "Back up & clear store data"}
                  </button>
                </>
              )}
            </footer>
          </section>
        </Dialog>
      )}
    </>
  );
};

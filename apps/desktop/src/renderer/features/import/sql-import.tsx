import { useEffect, useMemo, useRef, useState } from "react";
import type {
  LegacyStockImportPreviewDto,
  LegacyStockImportResultDto,
  LegacyStockImportProductDto,
  SqlContactCandidate
} from "@orix/electron";
import { Dialog } from "../../components/dialog.js";
import { reviewProducts } from "./review.js";

type Draft = {
  version: 1;
  sourceHash: string;
  products: LegacyStockImportProductDto[];
  contacts: SqlContactCandidate[];
  excluded: string[];
  excludedContacts: string[];
  acceptedWarnings: boolean;
};
const key = (hash: string) => `orix:sql-review:v1:${hash}`;
const money = (value: number) =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value / 100);
const contactKey = (contact: SqlContactCandidate) => `${contact.kind}:${contact.sourceId}`;

export const SqlImport = ({
  canManage,
  onBackupChange,
  showToast
}: {
  readonly canManage: boolean;
  readonly onBackupChange: () => void;
  readonly showToast: (message: string, tone?: "success" | "error") => void;
}) => {
  const [result, setResult] = useState<LegacyStockImportResultDto | null>(null);
  const posting = useRef(false);
  useEffect(() => {
    if (canManage)
      void window.orix.migration.lastImport().then((r) => {
        if (r.ok) setResult(r.value);
      });
  }, [canManage]);
  const [open, setOpen] = useState(false);
  const [preview, setPreview] = useState<LegacyStockImportPreviewDto | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"products" | "contacts" | "summary">("products");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<LegacyStockImportProductDto | null>(null);
  const [contact, setContact] = useState<SqlContactCandidate | null>(null);
  const [dirty, setDirty] = useState(false);
  const [closePrompt, setClosePrompt] = useState(false);
  const reviews = useMemo(
    () =>
      reviewProducts(
        (draft?.products ?? []).map((p) => ({
          ...p,
          sourceErrors:
            preview?.products.find((original) => original.sourceItemId === p.sourceItemId)
              ?.sourceErrors ?? []
        })),
        draft?.excluded ?? []
      ),
    [draft, preview]
  );
  const saveDraft = () => {
    if (!draft) return false;
    try {
      localStorage.setItem(key(draft.sourceHash), JSON.stringify(draft));
      setDirty(false);
      showToast("Import review saved on this computer.");
      return true;
    } catch {
      setError("Review could not be saved. Keep this screen open and try again.");
      return false;
    }
  };
  const postImport = async () => {
    if (!draft || posting.current) return;
    posting.current = true;
    setBusy(true);
    setError("");
    try {
      const response = await window.orix.migration.importLegacyStock(draft);
      if (!response.ok) {
        setError(response.error.message);
        return;
      }
      setResult(response.value);
      setDirty(false);
      setOpen(false);
      setPreview(null);
      setDraft(null);
      showToast("Import completed. Products, stock and contacts are ready.");
    } catch {
      setError(
        "Could not confirm the import result. Retry with the same SQL file; completed imports are not added twice."
      );
    } finally {
      posting.current = false;
      setBusy(false);
      onBackupChange();
    }
  };
  const downloadReport = () => {
    if (!result) return;
    const url = URL.createObjectURL(new Blob([result.reportJson], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `orix-import-${result.id}.json`;
    link.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  };
  const chooseFile = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const selected = await window.orix.migration.selectLegacyStockFiles();
      if (!selected.ok) {
        setError(selected.error.message);
        return;
      }
      if (!selected.value.sqlFile) return;
      const result = await window.orix.migration.previewLegacyStock({
        sqlFile: selected.value.sqlFile
      });
      if (!result.ok) {
        setError(result.error.message);
        return;
      }
      const source = result.value;
      let next: Draft = {
        version: 1,
        sourceHash: source.sourceHash,
        products: [...source.products],
        contacts: [...source.contacts],
        excluded: [],
        excludedContacts: [],
        acceptedWarnings: false
      };
      const saved = localStorage.getItem(key(source.sourceHash));
      if (saved) {
        try {
          const candidate = JSON.parse(saved) as Omit<Draft, "version"> & { version: number };
          if (
            candidate.version !== 1 ||
            candidate.sourceHash !== source.sourceHash ||
            !Array.isArray(candidate.products) ||
            candidate.products.length !== source.products.length ||
            !Array.isArray(candidate.contacts) ||
            !Array.isArray(candidate.excluded) ||
            !Array.isArray(candidate.excludedContacts) ||
            typeof candidate.acceptedWarnings !== "boolean" ||
            candidate.contacts.length !== source.contacts.length ||
            candidate.contacts.some(
              (row, index) =>
                row.sourceId !== source.contacts[index]?.sourceId ||
                row.kind !== source.contacts[index].kind ||
                ![row.name, row.phone, row.email, row.address, row.city].every(
                  (value) => typeof value === "string"
                )
            ) ||
            candidate.excluded.some(
              (id) => !source.products.some((row) => row.sourceItemId === id)
            ) ||
            candidate.excludedContacts.some(
              (id) => !source.contacts.some((row) => contactKey(row) === id)
            ) ||
            candidate.products.some(
              (row, index) =>
                row.sourceItemId !== source.products[index]?.sourceItemId ||
                typeof row.name !== "string" ||
                typeof row.categoryName !== "string" ||
                typeof row.unitName !== "string" ||
                (row.barcode !== null && typeof row.barcode !== "string") ||
                ![
                  row.purchasePriceMinor,
                  row.salePriceMinor,
                  row.minimumStock,
                  row.openingStock
                ].every(Number.isFinite)
            )
          )
            throw new Error("Invalid draft");
          next = { ...candidate, version: 1 };
          showToast("Saved review restored for this SQL file.");
        } catch {
          setError("The saved review could not be read. Original source values have been loaded.");
        }
      }
      setPreview(source);
      setDraft(next);
      setDirty(false);
      setStep("products");
      setPage(1);
      setQuery("");
      setFilter("all");
    } catch {
      setError("Could not open the export. Your store has not been changed.");
    } finally {
      setBusy(false);
    }
  };
  const update = (next: Draft) => {
    setDraft({ ...next, acceptedWarnings: false });
    setDirty(true);
  };
  const included =
    draft?.products.filter((row) => !draft.excluded.includes(row.sourceItemId)) ?? [];
  const blocked = included.filter((row) => reviews.get(row.sourceItemId)?.errors.length);
  const stockValueSafe = Number.isSafeInteger(
    included.reduce((sum, row) => sum + Math.round(row.openingStock * row.purchasePriceMinor), 0)
  );
  const importBlockedReason =
    blocked.length > 0
      ? `${String(blocked.length)} selected ${blocked.length === 1 ? "item needs" : "items need"} correction before importing.`
      : preview?.blockers.length
        ? preview.blockers.join(" ")
        : included.length +
              (draft?.contacts.length ?? 0) -
              (draft?.excludedContacts.length ?? 0) ===
            0
          ? "Select at least one product or contact to import."
          : !stockValueSafe
            ? "Combined stock value exceeds the supported limit. Review opening quantities and purchase costs before importing."
            : !draft?.acceptedWarnings
              ? "Confirm the opening quantities and warnings before importing."
              : "";
  const reviewBlocked = () => {
    setStep("products");
    setFilter("blocked");
    setQuery("");
    setPage(1);
  };
  const warned = included.filter((row) => reviews.get(row.sourceItemId)?.warnings.length);
  const filtered =
    draft?.products.filter((row) => {
      const omitted = draft.excluded.includes(row.sourceItemId);
      const review = reviews.get(row.sourceItemId);
      const matches = `${row.name} ${row.barcode ?? ""} ${row.sourceItemId}`
        .toLowerCase()
        .includes(query.toLowerCase());
      return (
        matches &&
        (filter === "all" ||
          (filter === "excluded"
            ? omitted
            : !omitted &&
              (filter === "blocked"
                ? (review?.errors.length ?? 0) > 0
                : filter === "review"
                  ? !review?.errors.length && (review?.warnings.length ?? 0) > 0
                  : !review?.errors.length && !review?.warnings.length)))
      );
    }) ?? [];
  const totalPages = Math.max(1, Math.ceil(filtered.length / 25));
  const close = () => {
    if (busy) return;
    if (dirty) setClosePrompt(true);
    else setOpen(false);
  };
  if (!canManage) return <p>Only owners can import old POS data.</p>;
  if (editing && draft)
    return (
      <Dialog
        label="Edit import product"
        onClose={() => {
          setEditing(null);
        }}
      >
        <ProductEditor
          product={editing}
          onClose={() => {
            setEditing(null);
          }}
          onSave={(row) => {
            update({
              ...draft,
              products: draft.products.map((p) => (p.sourceItemId === row.sourceItemId ? row : p))
            });
            setEditing(null);
          }}
        />
      </Dialog>
    );
  if (contact && draft)
    return (
      <Dialog
        label="Edit import contact"
        onClose={() => {
          setContact(null);
        }}
      >
        <ContactEditor
          contact={contact}
          onClose={() => {
            setContact(null);
          }}
          onSave={(row) => {
            update({
              ...draft,
              contacts: draft.contacts.map((p) => (contactKey(p) === contactKey(row) ? row : p))
            });
            setContact(null);
          }}
        />
      </Dialog>
    );
  if (!open)
    return (
      <div className="page-stack">
        <p>
          Bring products, opening stock and contacts from a previous POS SQL export into a review.
          Your store stays unchanged until a verified import is confirmed.
        </p>
        <button
          className="primary"
          onClick={() => {
            setOpen(true);
          }}
        >
          {draft ? "Resume import review" : "Start import"}
        </button>
        {result && (
          <section className="page-stack" aria-label="Last import result">
            <h3>Last import completed</h3>
            <p>
              {new Date(result.importedAt).toLocaleString()} · {result.sourceName}
            </p>
            <p>
              {result.createdProducts} products · {result.createdCustomers} customers ·{" "}
              {result.createdSuppliers} suppliers
            </p>
            <p>
              Opening stock at cost: <strong>{money(result.openingCostMinor)}</strong>
            </p>
            <p>
              Products are in Items and Stock. Contacts are in Customer Book and Suppliers.
              Historical sales and previous debts were not imported.
            </p>
            <p style={{ overflowWrap: "anywhere" }}>Backup: {result.backupFile}</p>
            <button onClick={downloadReport}>Download import report</button>
          </section>
        )}
        <small>
          Saved reviews can be restored by choosing the same SQL file. CSV files are no longer
          needed.
        </small>
      </div>
    );
  return (
    <Dialog label="Import from old POS" onClose={close} className="modal-backdrop import-backdrop">
      <section className="modal import-review" aria-busy={busy}>
        <header>
          <div>
            <h2>Import from old POS</h2>
            <p>Review and correct your data before it enters Orix.</p>
          </div>
          <button disabled={busy} onClick={close}>
            Close
          </button>
        </header>
        <div className="import-review-body" inert={posting.current}>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          {!preview || !draft ? (
            <div className="page-stack">
              <h3>Choose your old POS export</h3>
              <p>
                Select one previous POS .sql file, up to 64 MB. We read its data without running SQL
                commands.
              </p>
              <button className="primary" disabled={busy} onClick={() => void chooseFile()}>
                {busy ? "Reading SQL export…" : "Choose SQL file"}
              </button>
            </div>
          ) : (
            <>
              <div className="import-source">
                <strong>{preview.sourceName}</strong>
                <span>
                  {preview.storeName} · {preview.products.length.toLocaleString()} active products ·{" "}
                  {preview.archivedProducts} archived products retained in source
                </span>
                <span>
                  SQL time: {preview.sourceTimezone ?? "Not declared"} · Dates displayed in your
                  computer’s local time
                </span>
                {preview.latestSaleAt && (
                  <span>
                    Latest recorded sale: {new Date(preview.latestSaleAt).toLocaleString("en-PK")}.
                    Confirm the export is current before using its stock.
                  </span>
                )}
              </div>
              {preview.blockers.length > 0 && (
                <details className="import-problems">
                  <summary>
                    {preview.blockers.length} source mapping issues need resolution before import
                  </summary>
                  <ul>
                    {preview.blockers.map((message, i) => (
                      <li key={i}>{message}</li>
                    ))}
                  </ul>
                </details>
              )}
              <button disabled={busy || dirty} onClick={() => void chooseFile()}>
                Choose another SQL file
              </button>
              <nav className="import-steps" aria-label="Import review steps">
                {(
                  [
                    ["products", "1. Products & stock"],
                    ["contacts", "2. Contacts"],
                    ["summary", "3. Review summary"]
                  ] as const
                ).map(([id, label]) => (
                  <button
                    key={id}
                    aria-current={step === id ? "step" : undefined}
                    className={step === id ? "primary" : ""}
                    onClick={() => {
                      setStep(id);
                    }}
                  >
                    {label}
                  </button>
                ))}
              </nav>
              {step === "products" && (
                <>
                  <div className="import-toolbar">
                    <label>
                      Search products
                      <input
                        value={query}
                        onChange={(e) => {
                          setQuery(e.target.value);
                          setPage(1);
                        }}
                        placeholder="Name, barcode or source ID"
                      />
                    </label>
                    {query && (
                      <button
                        onClick={() => {
                          setQuery("");
                          setPage(1);
                        }}
                      >
                        Clear search
                      </button>
                    )}
                    <label>
                      Show
                      <select
                        aria-label="Product review status"
                        value={filter}
                        onChange={(e) => {
                          setFilter(e.target.value);
                          setPage(1);
                        }}
                      >
                        <option value="all">All products</option>
                        <option value="ready">Ready without warnings</option>
                        <option value="blocked">Blocked</option>
                        <option value="review">Needs review (warnings only)</option>
                        <option value="excluded">Excluded</option>
                      </select>
                    </label>
                  </div>
                  <p>
                    {included.length} included · {blocked.length} blocked · {warned.length} with
                    warnings · {draft.excluded.length} excluded
                  </p>
                  <div className="import-table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Product / barcode</th>
                          <th>Cost / selling price</th>
                          <th>Opening stock</th>
                          <th>Review</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered
                          .slice(
                            (Math.min(page, totalPages) - 1) * 25,
                            Math.min(page, totalPages) * 25
                          )
                          .map((row) => {
                            const excluded = draft.excluded.includes(row.sourceItemId);
                            const review = reviews.get(row.sourceItemId);
                            const original = preview.products.find(
                              (p) => p.sourceItemId === row.sourceItemId
                            );
                            const changed = JSON.stringify(row) !== JSON.stringify(original);
                            return (
                              <tr key={row.sourceItemId}>
                                <td>
                                  <strong>{row.name || "Unnamed product"}</strong>
                                  <small>
                                    {row.barcode?.trim() ? row.barcode : "No barcode"} · Source #
                                    {row.sourceItemId}
                                    {changed ? " · Edited" : ""}
                                  </small>
                                </td>
                                <td>
                                  {money(row.purchasePriceMinor)}
                                  <small>{money(row.salePriceMinor)}</small>
                                </td>
                                <td>
                                  {row.openingStock} {row.unitName}
                                </td>
                                <td>
                                  {excluded ? (
                                    "Excluded"
                                  ) : (
                                    <>
                                      <strong>
                                        {review?.errors.length
                                          ? "Correction required"
                                          : review?.warnings.length
                                            ? "Review warnings"
                                            : "Ready"}
                                      </strong>
                                      {[...(review?.errors ?? []), ...(review?.warnings ?? [])].map(
                                        (message) => (
                                          <small key={message}>{message}</small>
                                        )
                                      )}
                                    </>
                                  )}
                                </td>
                                <td>
                                  <div className="import-actions">
                                    <button
                                      onClick={() => {
                                        setEditing(row);
                                      }}
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => {
                                        update({
                                          ...draft,
                                          excluded: excluded
                                            ? draft.excluded.filter((id) => id !== row.sourceItemId)
                                            : [...draft.excluded, row.sourceItemId]
                                        });
                                      }}
                                    >
                                      {excluded ? "Include" : "Exclude"}
                                    </button>
                                    {changed && original && (
                                      <button
                                        onClick={() => {
                                          update({
                                            ...draft,
                                            products: draft.products.map((p) =>
                                              p.sourceItemId === row.sourceItemId ? original : p
                                            )
                                          });
                                        }}
                                      >
                                        Reset
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                  {filtered.length === 0 && <p role="status">No products match this filter.</p>}
                  <div className="import-pagination">
                    <span>
                      {filtered.length} matching products · Page {Math.min(page, totalPages)} of{" "}
                      {totalPages}
                    </span>
                    <button
                      disabled={page <= 1}
                      onClick={() => {
                        setPage(page - 1);
                      }}
                    >
                      Previous
                    </button>
                    <button
                      disabled={page >= totalPages}
                      onClick={() => {
                        setPage(page + 1);
                      }}
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
              {step === "contacts" && (
                <>
                  <p>
                    Import contact details only. No debt or credit balance is inferred from old
                    transactions.
                  </p>
                  {draft.contacts.length === 0 ? (
                    <p>No customer or supplier contacts found.</p>
                  ) : (
                    <div className="import-table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>Contact</th>
                            <th>Type</th>
                            <th>Phone / city</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {draft.contacts.map((row) => (
                            <tr key={contactKey(row)}>
                              <td>{row.name}</td>
                              <td>
                                {row.kind === "supplier" ? "Supplier" : "Customer"}
                                {draft.excludedContacts.includes(contactKey(row))
                                  ? " · Excluded"
                                  : ""}
                              </td>
                              <td>
                                {row.phone || "No phone"}
                                <small>{row.city}</small>
                              </td>
                              <td>
                                <button
                                  onClick={() => {
                                    setContact(row);
                                  }}
                                >
                                  Edit contact
                                </button>{" "}
                                <button
                                  onClick={() => {
                                    update({
                                      ...draft,
                                      excludedContacts: draft.excludedContacts.includes(
                                        contactKey(row)
                                      )
                                        ? draft.excludedContacts.filter(
                                            (id) => id !== contactKey(row)
                                          )
                                        : [...draft.excludedContacts, contactKey(row)]
                                    });
                                  }}
                                >
                                  {draft.excludedContacts.includes(contactKey(row))
                                    ? "Include"
                                    : "Exclude"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
              {step === "summary" && (
                <div className="page-stack">
                  <h3>Review summary</h3>
                  {blocked.length > 0 && (
                    <section aria-label="Items blocking import" className="card">
                      <h4>{blocked.length} selected items block import</h4>
                      <p>
                        Correct the highlighted fields or exclude these items. Your edits and
                        exclusions are kept while you review.
                      </p>
                      <ul>
                        {blocked.slice(0, 5).map((row) => (
                          <li key={row.sourceItemId}>
                            <strong>
                              {row.name} ·{" "}
                              {row.barcode
                                ? `Barcode ${row.barcode}`
                                : `Source item ${row.sourceItemId}`}
                            </strong>
                            <p>
                              Opening quantity: {row.openingStock.toLocaleString("en-PK")} ·
                              Purchase cost: {money(row.purchasePriceMinor)}
                            </p>
                            <p>{reviews.get(row.sourceItemId)?.errors.join(" ")}</p>
                            <button
                              onClick={() => {
                                setEditing(row);
                              }}
                            >
                              Review item
                            </button>
                          </li>
                        ))}
                      </ul>
                      {blocked.length > 5 && <p>{blocked.length - 5} more blocked items.</p>}
                      <button onClick={reviewBlocked}>Review blocked items</button>
                    </section>
                  )}
                  <p>
                    {included.length} products selected; {blocked.length} still have blocking
                    errors. {draft.contacts.length - draft.excludedContacts.length} contacts
                    selected.
                  </p>
                  <p>
                    Selected opening stock at cost:{" "}
                    <strong>
                      {money(
                        included.reduce(
                          (sum, row) => sum + Math.round(row.openingStock * row.purchasePriceMinor),
                          0
                        )
                      )}
                    </strong>
                    . This is provisional while corrections remain.
                  </p>
                  {preview.warnings.map((warning) => (
                    <p key={warning}>{warning}</p>
                  ))}
                  {
                    <label className="check-row">
                      <input
                        type="checkbox"
                        checked={draft.acceptedWarnings}
                        onChange={(e) => {
                          setDraft({ ...draft, acceptedWarnings: e.target.checked });
                          setDirty(true);
                        }}
                      />
                      I verified opening quantities and reviewed the warnings on {warned.length}{" "}
                      products. I understand historical transactions and outstanding balances will
                      not be imported.
                    </label>
                  }
                  <p role="status">
                    A verified backup will be created first. Import adds the selected records
                    together; an error cancels the entire import. Do this when the counter is not in
                    use.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
        {draft && (
          <footer>
            <span>{dirty ? "Unsaved review changes" : "Review changes saved or unchanged"}</span>
            {step === "summary" && importBlockedReason && (
              <p id="import-blocked-reason" role="status">
                {importBlockedReason}
              </p>
            )}
            <div className="import-actions">
              <button disabled={busy} onClick={saveDraft}>
                Save draft
              </button>
              {step === "summary" && (
                <button
                  className="primary"
                  aria-describedby={importBlockedReason ? "import-blocked-reason" : undefined}
                  disabled={busy || Boolean(importBlockedReason)}
                  onClick={() => {
                    void postImport();
                  }}
                >
                  {busy ? "Backing up & importing…" : "Create backup & import"}
                </button>
              )}
              {step !== "products" && (
                <button
                  disabled={busy}
                  onClick={() => {
                    setStep(step === "summary" ? "contacts" : "products");
                  }}
                >
                  Back
                </button>
              )}
              {step !== "summary" && (
                <button
                  className="primary"
                  onClick={() => {
                    setStep(step === "products" ? "contacts" : "summary");
                  }}
                >
                  Continue
                </button>
              )}
            </div>
          </footer>
        )}
        {closePrompt && (
          <div className="import-close-prompt" role="alert">
            <p>Save your review changes before closing?</p>
            <button
              onClick={() => {
                if (saveDraft()) {
                  setClosePrompt(false);
                  setOpen(false);
                }
              }}
            >
              Save and close
            </button>
            <button
              onClick={() => {
                setClosePrompt(false);
              }}
            >
              Keep reviewing
            </button>
            <button
              onClick={() => {
                setClosePrompt(false);
                setDirty(false);
                setDraft(null);
                setPreview(null);
                setOpen(false);
              }}
            >
              Discard unsaved changes
            </button>
          </div>
        )}
      </section>
    </Dialog>
  );
};

const ProductEditor = ({
  product,
  onClose,
  onSave
}: {
  readonly product: LegacyStockImportProductDto;
  readonly onClose: () => void;
  readonly onSave: (row: LegacyStockImportProductDto) => void;
}) => {
  const [row, setRow] = useState(product);
  const [values, setValues] = useState({
    cost: (product.purchasePriceMinor / 100).toFixed(2),
    price: (product.salePriceMinor / 100).toFixed(2),
    stock: String(product.openingStock),
    minimum: String(product.minimumStock)
  });
  const valid = Object.values(values).every(
    (value) => value.trim() !== "" && Number.isFinite(Number(value))
  );
  return (
    <div className="import-editor">
      <section className="card">
        <h3>Edit {product.name || "product"}</h3>
        <p>Corrections affect this review only. Original source values stay unchanged.</p>
        <div className="form-grid">
          {(
            [
              ["name", "Name"],
              ["barcode", "Barcode"],
              ["categoryName", "Category"],
              ["unitName", "Unit"]
            ] as const
          ).map(([field, label]) => (
            <label key={field}>
              {label}
              <input
                value={row[field] ?? ""}
                onChange={(e) => {
                  setRow({ ...row, [field]: e.target.value });
                }}
              />
            </label>
          ))}
          {(
            [
              ["cost", "Purchase cost"],
              ["price", "Selling price"],
              ["stock", "Opening quantity"],
              ["minimum", "Minimum stock"]
            ] as const
          ).map(([field, label]) => (
            <label key={field}>
              {label}
              <input
                inputMode="decimal"
                value={values[field]}
                onChange={(e) => {
                  setValues({ ...values, [field]: e.target.value });
                }}
              />
            </label>
          ))}
        </div>
        {!valid && <p role="alert">Enter a number in each price and stock field.</p>}
        <div className="import-actions">
          <button onClick={onClose}>Cancel edit</button>
          <button
            className="primary"
            disabled={!valid}
            onClick={() => {
              onSave({
                ...row,
                barcode: row.barcode?.trim() ? row.barcode.trim() : null,
                purchasePriceMinor: Math.round(Number(values.cost) * 100),
                salePriceMinor: Math.round(Number(values.price) * 100),
                openingStock: Number(values.stock),
                minimumStock: Number(values.minimum)
              });
            }}
          >
            Apply correction
          </button>
        </div>
      </section>
    </div>
  );
};
const ContactEditor = ({
  contact,
  onClose,
  onSave
}: {
  readonly contact: SqlContactCandidate;
  readonly onClose: () => void;
  readonly onSave: (row: SqlContactCandidate) => void;
}) => {
  const [row, setRow] = useState(contact);
  return (
    <div className="import-editor">
      <section className="card">
        <h3>Edit contact</h3>
        <div className="form-grid">
          {(
            [
              ["name", "Name"],
              ["phone", "Phone"],
              ["email", "Email"],
              ["address", "Address"],
              ["city", "City"]
            ] as const
          ).map(([field, label]) => (
            <label key={field}>
              {label}
              <input
                value={row[field]}
                onChange={(e) => {
                  setRow({ ...row, [field]: e.target.value });
                }}
              />
            </label>
          ))}
        </div>
        <div className="import-actions">
          <button onClick={onClose}>Cancel edit</button>
          <button
            className="primary"
            disabled={!row.name.trim()}
            onClick={() => {
              onSave(row);
            }}
          >
            Apply contact correction
          </button>
        </div>
      </section>
    </div>
  );
};

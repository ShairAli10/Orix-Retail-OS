/** Display formatting only; persisted enum values and audit records remain intact. */
export function displayLabel(value: string): string {
  const text = value
    .replace(/([a-z\d])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .trim()
    .toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : "Not specified";
}
export function activitySummary(value: string | null): string {
  if (!value?.trim()) return "No additional details.";
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    return value.trim().startsWith("{") || value.trim().startsWith("[")
      ? "Details unavailable."
      : value;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
    return "No additional details.";
  const fields = parsed as Record<string, unknown>;
  const parts: string[] = [];
  for (const [key, label] of [
    ["name", "Name"],
    ["amountMinor", "Amount"],
    ["method", "Payment"],
    ["paymentMethod", "Payment"],
    ["referenceNumber", "Reference"],
    ["notes", "Notes"],
    ["reason", "Reason"]
  ]) {
    if (!key || !label) continue;
    const item = fields[key];
    if (key === "amountMinor" && typeof item === "number" && Number.isFinite(item))
      parts.push(
        `${label}: Rs ${(item / 100).toLocaleString("en-PK", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      );
    else if (typeof item === "string" && item.trim())
      parts.push(
        `${label}: ${key === "method" || key === "paymentMethod" ? displayLabel(item) : item}`
      );
  }
  return parts.join(" · ") || "No additional details.";
}

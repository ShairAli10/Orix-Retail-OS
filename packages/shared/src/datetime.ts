import { DomainError } from "./errors.js";
import type { Brand } from "./ids.js";

export type UtcIsoDateTime = Brand<string, "UtcIsoDateTime">;

export const nowUtc = (): UtcIsoDateTime => new Date().toISOString() as UtcIsoDateTime;

export const toUtcIsoDateTime = (date: Date): UtcIsoDateTime =>
  date.toISOString() as UtcIsoDateTime;

export const parseUtcIsoDateTime = (value: string): UtcIsoDateTime => {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw new DomainError({
      code: "datetime.invalid_utc_iso",
      message: "Date/time must be a valid UTC ISO timestamp."
    });
  }

  return value as UtcIsoDateTime;
};

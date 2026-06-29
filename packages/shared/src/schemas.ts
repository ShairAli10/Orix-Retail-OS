import { z } from "zod";
import { DEFAULT_CURRENCY_CODE } from "./constants.js";

export const uuidSchema = z.string().uuid();

export const utcIsoDateTimeSchema = z
  .string()
  .datetime({ offset: true })
  .refine((value) => value.endsWith("Z"), "Timestamp must be UTC.");

export const moneyMinorSchema = z.number().int().safe();

export const moneySchema = z.object({
  amountMinor: moneyMinorSchema,
  currencyCode: z.string().min(3).default(DEFAULT_CURRENCY_CODE)
});

export const quantitySchema = z.string().regex(/^(0|[1-9]\d*)(\.\d{1,6})?$/);

export const auditActorSchema = z.object({
  userId: uuidSchema.optional(),
  systemActor: z.string().optional()
});

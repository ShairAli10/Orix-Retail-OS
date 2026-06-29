import { DomainError } from "./errors.js";
import { asUuid, type Uuid } from "./ids.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export const createUuid = (): Uuid => asUuid(globalThis.crypto.randomUUID());

export const isUuid = (value: string): boolean => UUID_PATTERN.test(value);

export const parseUuid = (value: string): Uuid => {
  if (!isUuid(value)) {
    throw new DomainError({
      code: "uuid.invalid",
      message: "Value must be a valid UUID."
    });
  }

  return asUuid(value);
};

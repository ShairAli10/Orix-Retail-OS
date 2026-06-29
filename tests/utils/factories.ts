import { createUuid, Money, Quantity } from "@orix/shared";

export const createTestUuid = () => createUuid();

export const createTestMoney = (amountMinor = 100): Money => Money.fromMinor(amountMinor, "PKR");

export const createTestQuantity = (value = "1"): Quantity => Quantity.fromString(value);

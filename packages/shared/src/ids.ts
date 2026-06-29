export type Brand<TValue, TBrand extends string> = TValue & {
  readonly __brand: TBrand;
};

export type Uuid = Brand<string, "Uuid">;
export type StoreId = Brand<Uuid, "StoreId">;
export type BranchId = Brand<Uuid, "BranchId">;
export type UserId = Brand<Uuid, "UserId">;
export type RoleId = Brand<Uuid, "RoleId">;
export type PermissionId = Brand<Uuid, "PermissionId">;
export type ProductId = Brand<Uuid, "ProductId">;
export type CustomerId = Brand<Uuid, "CustomerId">;
export type SupplierId = Brand<Uuid, "SupplierId">;
export type CashAccountId = Brand<Uuid, "CashAccountId">;
export type BusinessDayId = Brand<Uuid, "BusinessDayId">;
export type SaleId = Brand<Uuid, "SaleId">;
export type PurchaseId = Brand<Uuid, "PurchaseId">;
export type LedgerTransactionId = Brand<Uuid, "LedgerTransactionId">;
export type InventoryTransactionId = Brand<Uuid, "InventoryTransactionId">;

export const asUuid = (value: string): Uuid => value as Uuid;

export const asStoreId = (value: Uuid): StoreId => value as StoreId;
export const asBranchId = (value: Uuid): BranchId => value as BranchId;
export const asUserId = (value: Uuid): UserId => value as UserId;
export const asProductId = (value: Uuid): ProductId => value as ProductId;

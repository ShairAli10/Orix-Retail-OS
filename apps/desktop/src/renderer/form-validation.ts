export type ProductFormField =
  | "name"
  | "categoryId"
  | "unitId"
  | "purchasePrice"
  | "salePrice"
  | "openingStock"
  | "minimumStock";

export type SetupFormField =
  | "storeName"
  | "ownerName"
  | "email"
  | "currency"
  | "timezone"
  | "branchName"
  | "adminFullName"
  | "username"
  | "password"
  | "confirmPassword"
  | "pin";

export type LoginFormField = "username" | "password" | "pin";

export type UserFormField = "fullName" | "username" | "password" | "pin" | "roleNames";

export type SettingsField = "storeDisplayName" | "receiptHeader" | "receiptFooter";

export type CatalogFormField = "name" | "abbreviation";

export type StockAdjustmentField = "productId" | "quantity" | "unitCost" | "occurredAt";

export type OpeningStockField = "rows";

export type CustomerFormField = "name" | "email" | "creditLimit" | "openingBalance";

export type PaymentFormField = "amount" | "paidAt";

export type SupplierFormField = "name" | "email" | "openingBalance";

export type PurchaseFormField =
  "supplierId" | "purchaseDate" | "discount" | "tax" | "freight" | "otherCharges" | "items";

type SetupValidationInput = {
  readonly storeName: string;
  readonly ownerName: string;
  readonly email: string;
  readonly currency: string;
  readonly timezone: string;
  readonly branchName: string;
  readonly adminFullName: string;
  readonly username: string;
  readonly password: string;
  readonly confirmPassword: string;
  readonly pin: string;
};

type LoginValidationInput = {
  readonly username: string;
  readonly password: string;
  readonly pin: string;
  readonly mode: "password" | "pin";
};

type CustomerValidationInput = {
  readonly name: string;
  readonly email: string;
  readonly creditLimit: string;
  readonly openingBalance: string;
};

type PaymentValidationInput = {
  readonly amount: string;
  readonly paidAt: string;
};

type SupplierValidationInput = {
  readonly name: string;
  readonly email: string;
  readonly openingBalance: string;
};

type PurchaseItemValidationInput = {
  readonly productId: string;
  readonly unitId: string;
  readonly quantity: string;
  readonly unitCost: string;
  readonly discount: string;
  readonly tax: string;
};

type PurchaseValidationInput = {
  readonly supplierId: string;
  readonly purchaseDate: string;
  readonly discount: string;
  readonly tax: string;
  readonly freight: string;
  readonly otherCharges: string;
  readonly items: readonly PurchaseItemValidationInput[];
};

type ProductValidationInput = {
  readonly name: string;
  readonly categoryId: string;
  readonly unitId: string;
  readonly purchasePrice: string;
  readonly salePrice: string;
  readonly openingStock: string;
  readonly minimumStock: string;
};

type CatalogValidationInput = {
  readonly kind: string;
  readonly name: string;
  readonly abbreviation: string;
};

type StockAdjustmentValidationInput = {
  readonly productId: string;
  readonly quantity: string;
  readonly unitCost: string;
  readonly occurredAt: string;
};

type OpeningStockValidationInput = {
  readonly productId: string;
  readonly quantity: string;
  readonly unitCost: string;
  readonly occurredAt: string;
};

type SettingsValidationInput = {
  readonly storeDisplayName: string;
  readonly receiptHeader: string;
  readonly receiptFooter: string;
};

type UserValidationInput = {
  readonly id?: string;
  readonly fullName: string;
  readonly username: string;
  readonly password: string;
  readonly pin: string;
  readonly roleNames: readonly string[];
};

const isBlank = (value: string): boolean => value.trim().length === 0;

const isValidEmail = (value: string): boolean =>
  isBlank(value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isNumericInput = (value: string): boolean =>
  !isBlank(value) && Number.isFinite(Number(value));

const isNonNegativeInput = (value: string): boolean => isNumericInput(value) && Number(value) >= 0;

const isPositiveInput = (value: string): boolean => isNumericInput(value) && Number(value) > 0;

const firstError = (...errors: readonly (string | null)[]): string | null =>
  errors.find((error): error is string => error !== null) ?? null;

const requiredText = (value: string, label: string): string | null =>
  isBlank(value) ? `${label} is required.` : null;

const optionalEmail = (value: string): string | null =>
  isValidEmail(value) ? null : "Enter a valid email address.";

const nonNegativeNumber = (value: string, label: string): string | null =>
  isNonNegativeInput(value) ? null : `${label} must be 0 or more.`;

const positiveNumber = (value: string, label: string): string | null =>
  isPositiveInput(value) ? null : `${label} must be greater than 0.`;

const validDateText = (value: string, label: string): string | null =>
  isBlank(value) || Number.isNaN(new Date(value).getTime()) ? `${label} is required.` : null;

export const validateSetupStep = (form: SetupValidationInput, step: number): string | null =>
  firstError(...Object.values(setupStepErrors(form, step)));

export const setupStepErrors = (
  form: SetupValidationInput,
  step: number
): Partial<Record<SetupFormField, string>> => {
  if (step === 1) {
    return {
      ...(requiredText(form.storeName, "Store name") === null
        ? {}
        : { storeName: requiredText(form.storeName, "Store name") ?? "" }),
      ...(requiredText(form.ownerName, "Owner name") === null
        ? {}
        : { ownerName: requiredText(form.ownerName, "Owner name") ?? "" }),
      ...(optionalEmail(form.email) === null ? {} : { email: optionalEmail(form.email) ?? "" }),
      ...(requiredText(form.currency, "Currency") === null
        ? {}
        : { currency: requiredText(form.currency, "Currency") ?? "" }),
      ...(requiredText(form.timezone, "Timezone") === null
        ? {}
        : { timezone: requiredText(form.timezone, "Timezone") ?? "" })
    };
  }
  if (step === 2) {
    return {
      ...(requiredText(form.branchName, "Default branch name") === null
        ? {}
        : { branchName: requiredText(form.branchName, "Default branch name") ?? "" })
    };
  }
  if (step === 3) {
    return {
      ...(requiredText(form.adminFullName, "Admin full name") === null
        ? {}
        : { adminFullName: requiredText(form.adminFullName, "Admin full name") ?? "" }),
      ...(requiredText(form.username, "Username") === null
        ? {}
        : { username: requiredText(form.username, "Username") ?? "" }),
      ...(form.password.length < 8 ? { password: "Password must be at least 8 characters." } : {}),
      ...(form.password !== form.confirmPassword
        ? { confirmPassword: "Password and confirmation must match." }
        : {}),
      ...(/^\d{4}$/.test(form.pin) ? {} : { pin: "PIN must be exactly 4 digits." })
    };
  }
  return {};
};

export const validateSetupForm = (form: SetupValidationInput): string | null =>
  firstError(validateSetupStep(form, 1), validateSetupStep(form, 2), validateSetupStep(form, 3));

export const validateLoginForm = (form: LoginValidationInput, locked: boolean): string | null =>
  firstError(...Object.values(loginFormErrors(form, locked)));

export const loginFormErrors = (
  form: LoginValidationInput,
  locked: boolean
): Partial<Record<LoginFormField, string>> => ({
  ...(locked || requiredText(form.username, "Username") === null
    ? {}
    : { username: requiredText(form.username, "Username") ?? "" }),
  ...(form.mode === "pin" && !/^\d{4}$/.test(form.pin) ? { pin: "Enter your 4 digit PIN." } : {}),
  ...(form.mode === "password" && requiredText(form.password, "Password") !== null
    ? { password: requiredText(form.password, "Password") ?? "" }
    : {})
});

export const validateCustomerForm = (form: CustomerValidationInput): string | null =>
  firstError(...Object.values(customerFormErrors(form)));

export const customerFormErrors = (
  form: CustomerValidationInput
): Partial<Record<CustomerFormField, string>> => ({
  ...(requiredText(form.name, "Customer name") === null
    ? {}
    : { name: requiredText(form.name, "Customer name") ?? "" }),
  ...(optionalEmail(form.email) === null ? {} : { email: optionalEmail(form.email) ?? "" }),
  ...(nonNegativeNumber(form.creditLimit, "Credit limit") === null
    ? {}
    : { creditLimit: nonNegativeNumber(form.creditLimit, "Credit limit") ?? "" }),
  ...(nonNegativeNumber(form.openingBalance, "Opening balance") === null
    ? {}
    : { openingBalance: nonNegativeNumber(form.openingBalance, "Opening balance") ?? "" })
});

export const validateCustomerPaymentForm = (form: PaymentValidationInput): string | null =>
  firstError(...Object.values(paymentFormErrors(form)));

export const paymentFormErrors = (
  form: PaymentValidationInput
): Partial<Record<PaymentFormField, string>> => ({
  ...(positiveNumber(form.amount, "Payment amount") === null
    ? {}
    : { amount: positiveNumber(form.amount, "Payment amount") ?? "" }),
  ...(validDateText(form.paidAt, "Payment date") === null
    ? {}
    : { paidAt: validDateText(form.paidAt, "Payment date") ?? "" })
});

export const validateSupplierForm = (form: SupplierValidationInput): string | null =>
  firstError(...Object.values(supplierFormErrors(form)));

export const supplierFormErrors = (
  form: SupplierValidationInput
): Partial<Record<SupplierFormField, string>> => ({
  ...(requiredText(form.name, "Supplier name") === null
    ? {}
    : { name: requiredText(form.name, "Supplier name") ?? "" }),
  ...(optionalEmail(form.email) === null ? {} : { email: optionalEmail(form.email) ?? "" }),
  ...(nonNegativeNumber(form.openingBalance, "Opening balance") === null
    ? {}
    : { openingBalance: nonNegativeNumber(form.openingBalance, "Opening balance") ?? "" })
});

export const validateSupplierPaymentForm = (form: PaymentValidationInput): string | null =>
  firstError(...Object.values(paymentFormErrors(form)));

export const validatePurchaseForm = (form: PurchaseValidationInput): string | null => {
  const headerError = firstError(...Object.values(purchaseFormErrors(form)));
  if (headerError !== null) return headerError;
  const invalidItem = form.items.find((item) => purchaseItemError(item) !== null);
  return invalidItem === undefined
    ? null
    : "Each purchase item needs a product, unit, quantity greater than 0, and valid amounts.";
};

export const purchaseFormErrors = (
  form: PurchaseValidationInput
): Partial<Record<PurchaseFormField, string>> => ({
  ...(requiredText(form.supplierId, "Supplier") === null
    ? {}
    : { supplierId: requiredText(form.supplierId, "Supplier") ?? "" }),
  ...(validDateText(form.purchaseDate, "Purchase date") === null
    ? {}
    : { purchaseDate: validDateText(form.purchaseDate, "Purchase date") ?? "" }),
  ...(nonNegativeNumber(form.discount, "Purchase discount") === null
    ? {}
    : { discount: nonNegativeNumber(form.discount, "Purchase discount") ?? "" }),
  ...(nonNegativeNumber(form.tax, "Tax") === null
    ? {}
    : { tax: nonNegativeNumber(form.tax, "Tax") ?? "" }),
  ...(nonNegativeNumber(form.freight, "Freight") === null
    ? {}
    : { freight: nonNegativeNumber(form.freight, "Freight") ?? "" }),
  ...(nonNegativeNumber(form.otherCharges, "Other charges") === null
    ? {}
    : { otherCharges: nonNegativeNumber(form.otherCharges, "Other charges") ?? "" }),
  ...(form.items.length === 0 ? { items: "Add at least one purchase item." } : {})
});

export const purchaseItemError = (item: PurchaseItemValidationInput): string | null =>
  firstError(
    requiredText(item.productId, "Product"),
    requiredText(item.unitId, "Unit"),
    positiveNumber(item.quantity, "Quantity"),
    nonNegativeNumber(item.unitCost, "Cost"),
    nonNegativeNumber(item.discount, "Discount"),
    nonNegativeNumber(item.tax, "Tax")
  );

export const validateProductForm = (form: ProductValidationInput): string | null =>
  firstError(...Object.values(productFormErrors(form)));

export const productFormErrors = (
  form: ProductValidationInput
): Partial<Record<ProductFormField, string>> => ({
  ...(requiredText(form.name, "Item name") === null
    ? {}
    : { name: requiredText(form.name, "Item name") ?? "" }),
  ...(requiredText(form.categoryId, "Category") === null
    ? {}
    : { categoryId: requiredText(form.categoryId, "Category") ?? "" }),
  ...(requiredText(form.unitId, "Sold as") === null
    ? {}
    : { unitId: requiredText(form.unitId, "Sold as") ?? "" }),
  ...(nonNegativeNumber(form.purchasePrice, "Buy price") === null
    ? {}
    : { purchasePrice: nonNegativeNumber(form.purchasePrice, "Buy price") ?? "" }),
  ...(nonNegativeNumber(form.salePrice, "Sale price") === null
    ? {}
    : { salePrice: nonNegativeNumber(form.salePrice, "Sale price") ?? "" }),
  ...(nonNegativeNumber(form.openingStock, "Stock now") === null
    ? {}
    : { openingStock: nonNegativeNumber(form.openingStock, "Stock now") ?? "" }),
  ...(nonNegativeNumber(form.minimumStock, "Low stock alert") === null
    ? {}
    : { minimumStock: nonNegativeNumber(form.minimumStock, "Low stock alert") ?? "" })
});

export const validateCatalogForm = (form: CatalogValidationInput): string | null =>
  firstError(...Object.values(catalogFormErrors(form)));

export const catalogFormErrors = (
  form: CatalogValidationInput
): Partial<Record<CatalogFormField, string>> => ({
  ...(requiredText(form.name, "Name") === null
    ? {}
    : { name: requiredText(form.name, "Name") ?? "" }),
  ...(form.kind !== "unit" || requiredText(form.abbreviation, "Abbreviation") === null
    ? {}
    : { abbreviation: requiredText(form.abbreviation, "Abbreviation") ?? "" })
});

export const validateStockAdjustmentForm = (form: StockAdjustmentValidationInput): string | null =>
  firstError(...Object.values(stockAdjustmentErrors(form)));

export const stockAdjustmentErrors = (
  form: StockAdjustmentValidationInput
): Partial<Record<StockAdjustmentField, string>> => ({
  ...(requiredText(form.productId, "Product") === null
    ? {}
    : { productId: requiredText(form.productId, "Product") ?? "" }),
  ...(positiveNumber(form.quantity, "Quantity") === null
    ? {}
    : { quantity: positiveNumber(form.quantity, "Quantity") ?? "" }),
  ...(nonNegativeNumber(form.unitCost, "Unit cost") === null
    ? {}
    : { unitCost: nonNegativeNumber(form.unitCost, "Unit cost") ?? "" }),
  ...(validDateText(form.occurredAt, "Adjustment date") === null
    ? {}
    : { occurredAt: validDateText(form.occurredAt, "Adjustment date") ?? "" })
});

export const validateOpeningStockRows = (
  entries: readonly OpeningStockValidationInput[]
): string | null => {
  const errors = openingStockErrors(entries);
  if (errors.rows !== undefined) return errors.rows;
  const invalidEntry = entries.find((entry) => openingStockRowError(entry) !== null);
  return invalidEntry === undefined
    ? null
    : "Each opening stock row needs a product, quantity greater than 0, unit cost, and date.";
};

export const openingStockErrors = (
  entries: readonly OpeningStockValidationInput[]
): Partial<Record<OpeningStockField, string>> => ({
  ...(entries.length === 0 ? { rows: "Add at least one opening stock row." } : {})
});

export const openingStockRowError = (entry: OpeningStockValidationInput): string | null =>
  firstError(
    requiredText(entry.productId, "Product"),
    positiveNumber(entry.quantity, "Quantity"),
    nonNegativeNumber(entry.unitCost, "Unit cost"),
    validDateText(entry.occurredAt, "Opening stock date")
  );

export const validateSettingsDraft = (draft: SettingsValidationInput): string | null =>
  firstError(...Object.values(settingsErrors(draft)));

export const settingsErrors = (
  draft: SettingsValidationInput
): Partial<Record<SettingsField, string>> => ({
  ...(requiredText(draft.storeDisplayName, "Store display name") === null
    ? {}
    : { storeDisplayName: requiredText(draft.storeDisplayName, "Store display name") ?? "" }),
  ...(requiredText(draft.receiptHeader, "Receipt header") === null
    ? {}
    : { receiptHeader: requiredText(draft.receiptHeader, "Receipt header") ?? "" }),
  ...(requiredText(draft.receiptFooter, "Receipt footer") === null
    ? {}
    : { receiptFooter: requiredText(draft.receiptFooter, "Receipt footer") ?? "" })
});

export const validateUserForm = (form: UserValidationInput): string | null =>
  firstError(...Object.values(userFormErrors(form)));

export const userFormErrors = (
  form: UserValidationInput
): Partial<Record<UserFormField, string>> => ({
  ...(requiredText(form.fullName, "Full name") === null
    ? {}
    : { fullName: requiredText(form.fullName, "Full name") ?? "" }),
  ...(requiredText(form.username, "Username") === null
    ? {}
    : { username: requiredText(form.username, "Username") ?? "" }),
  ...(form.id === undefined && form.password.length < 8
    ? { password: "Password must be at least 8 characters." }
    : {}),
  ...(form.id !== undefined && form.password.length > 0 && form.password.length < 8
    ? { password: "New password must be at least 8 characters." }
    : {}),
  ...(form.id === undefined && !/^\d{4}$/.test(form.pin)
    ? { pin: "PIN must be exactly 4 digits." }
    : {}),
  ...(form.id !== undefined && form.pin.length > 0 && !/^\d{4}$/.test(form.pin)
    ? { pin: "PIN must be exactly 4 digits." }
    : {}),
  ...(form.roleNames.length === 0 ? { roleNames: "Select at least one role." } : {})
});

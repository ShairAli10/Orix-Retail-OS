import { describe, expect, it } from "vitest";
import {
  catalogFormErrors,
  customerFormErrors,
  loginFormErrors,
  openingStockRowError,
  paymentFormErrors,
  productFormErrors,
  purchaseItemError,
  settingsErrors,
  setupStepErrors,
  stockAdjustmentErrors,
  supplierFormErrors,
  userFormErrors,
  validateOpeningStockRows,
  validatePurchaseForm,
  validateSetupForm
} from "./form-validation.js";

describe("renderer form validation", () => {
  it("validates first-run setup across all steps", () => {
    const invalidSetup = {
      storeName: "",
      ownerName: "",
      email: "bad-email",
      currency: "",
      timezone: "",
      branchName: "",
      adminFullName: "",
      username: "",
      password: "short",
      confirmPassword: "different",
      pin: "12"
    };

    expect(setupStepErrors(invalidSetup, 1)).toMatchObject({
      storeName: "Store name is required.",
      ownerName: "Owner name is required.",
      email: "Enter a valid email address."
    });
    expect(validateSetupForm(invalidSetup)).toBe("Store name is required.");
  });

  it("validates login modes", () => {
    expect(
      loginFormErrors({ username: "", password: "", pin: "", mode: "password" }, false)
    ).toMatchObject({
      username: "Username is required.",
      password: "Password is required."
    });

    expect(
      loginFormErrors({ username: "owner", password: "", pin: "123", mode: "pin" }, false)
    ).toMatchObject({
      pin: "Enter your 4 digit PIN."
    });
  });

  it("validates item and catalog forms", () => {
    expect(
      productFormErrors({
        name: "",
        categoryId: "",
        unitId: "",
        purchasePrice: "-1",
        salePrice: "abc",
        openingStock: "0",
        minimumStock: "0"
      })
    ).toMatchObject({
      name: "Item name is required.",
      categoryId: "Category is required.",
      unitId: "Sold as is required.",
      purchasePrice: "Buy price must be 0 or more.",
      salePrice: "Sale price must be 0 or more."
    });

    expect(catalogFormErrors({ kind: "unit", name: "", abbreviation: "" })).toMatchObject({
      name: "Name is required.",
      abbreviation: "Abbreviation is required."
    });
  });

  it("validates customer supplier and payment forms", () => {
    expect(
      customerFormErrors({
        name: "",
        email: "customer",
        creditLimit: "-1",
        openingBalance: "x"
      })
    ).toMatchObject({
      name: "Customer name is required.",
      email: "Enter a valid email address.",
      creditLimit: "Credit limit must be 0 or more.",
      openingBalance: "Opening balance must be 0 or more."
    });

    expect(supplierFormErrors({ name: "", email: "supplier", openingBalance: "-2" })).toMatchObject(
      {
        name: "Supplier name is required.",
        email: "Enter a valid email address.",
        openingBalance: "Opening balance must be 0 or more."
      }
    );

    expect(paymentFormErrors({ amount: "0", paidAt: "" })).toMatchObject({
      amount: "Payment amount must be greater than 0.",
      paidAt: "Payment date is required."
    });
  });

  it("validates purchase headers and line items", () => {
    const invalidPurchase = {
      supplierId: "",
      purchaseDate: "",
      discount: "-1",
      tax: "0",
      freight: "abc",
      otherCharges: "0",
      items: []
    };

    expect(validatePurchaseForm(invalidPurchase)).toBe("Supplier is required.");
    expect(
      purchaseItemError({
        productId: "",
        unitId: "",
        quantity: "0",
        unitCost: "-1",
        discount: "0",
        tax: "0"
      })
    ).toBe("Product is required.");
  });

  it("validates inventory forms", () => {
    expect(
      stockAdjustmentErrors({
        productId: "",
        quantity: "0",
        unitCost: "-1",
        occurredAt: ""
      })
    ).toMatchObject({
      productId: "Product is required.",
      quantity: "Quantity must be greater than 0.",
      unitCost: "Unit cost must be 0 or more.",
      occurredAt: "Adjustment date is required."
    });

    expect(validateOpeningStockRows([])).toBe("Add at least one opening stock row.");
    expect(
      openingStockRowError({
        productId: "",
        quantity: "0",
        unitCost: "0",
        occurredAt: ""
      })
    ).toBe("Product is required.");
  });

  it("validates settings and users", () => {
    expect(
      settingsErrors({
        storeDisplayName: "",
        receiptHeader: "",
        receiptFooter: ""
      })
    ).toMatchObject({
      storeDisplayName: "Store display name is required.",
      receiptHeader: "Receipt header is required.",
      receiptFooter: "Receipt footer is required."
    });

    expect(
      userFormErrors({
        fullName: "",
        username: "",
        password: "short",
        pin: "12",
        roleNames: []
      })
    ).toMatchObject({
      fullName: "Full name is required.",
      username: "Username is required.",
      password: "Password must be at least 8 characters.",
      pin: "PIN must be exactly 4 digits.",
      roleNames: "Select at least one role."
    });
  });
});

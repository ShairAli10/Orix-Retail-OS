import type {
  AppContextDto,
  AppSettingsDto,
  AuthStatusDto,
  AuthUserDto,
  BackupRecordDto,
  BackupStatusDto,
  CatalogItemDto,
  CatalogItemKind,
  CustomerActivityDto,
  CustomerDetailDto,
  CustomerListItemDto,
  CustomerListRequest,
  CustomerPaymentPayload,
  CustomerStatementDto,
  CustomerStatementRequest,
  CustomerType,
  CustomerWritePayload,
  DashboardDto,
  InventoryAdjustmentPayload,
  InventoryItemDto,
  InventoryListRequest,
  InventoryMovementDto,
  InventoryMovementListRequest,
  InventoryOverviewDto,
  MigrationIssueDto,
  OpeningStockEntryPayload,
  LegacyStockImportPreviewDto,
  LegacyStockImportResultDto,
  ProductCatalogDto,
  ProductDetailDto,
  ProductFormPayload,
  ProductIpcError,
  ProductListItemDto,
  ProductListRequest,
  ProductStatusFilter,
  PurchaseDetailDto,
  PurchaseItemPayload,
  PurchaseListItemDto,
  PurchaseListRequest,
  PurchaseReturnPayload,
  PurchaseWritePayload,
  ReportsSummaryDto,
  RoleName,
  CashRegisterDto,
  ReceiptDto,
  SaleDetailDto,
  SaleItemPayload,
  SaleListItemDto,
  SaleListRequest,
  SalePaymentType,
  SaleReturnCondition,
  SaleReturnPayload,
  SaleWritePayload,
  SalesDashboardDto,
  SetupStorePayload,
  SupplierActivityDto,
  SupplierDetailDto,
  SupplierListItemDto,
  SupplierListRequest,
  SupplierPaymentPayload,
  SupplierStatementDto,
  SupplierStatementRequest,
  SupplierWritePayload,
  UserSavePayload
} from "@orix/electron";
import { uiClassNames } from "@orix/ui";
import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { OrixPreloadApi } from "../preload/index.js";
import {
  catalogFormErrors,
  customerFormErrors,
  loginFormErrors,
  openingStockErrors,
  openingStockRowError,
  paymentFormErrors,
  productFormErrors,
  purchaseFormErrors,
  purchaseItemError,
  settingsErrors,
  setupStepErrors,
  stockAdjustmentErrors,
  supplierFormErrors,
  userFormErrors,
  validateCatalogForm,
  validateCustomerForm,
  validateCustomerPaymentForm,
  validateLoginForm,
  validateOpeningStockRows,
  validateProductForm,
  validatePurchaseForm,
  validateSettingsDraft,
  validateSetupForm,
  validateSetupStep,
  validateStockAdjustmentForm,
  validateSupplierForm,
  validateSupplierPaymentForm,
  validateUserForm
} from "./form-validation.js";
import { resolveThemePreference } from "./preferences.js";
import { pathForRoute, routeFromPath, routes, type RouteId } from "./routing.js";
import "./styles.css";

declare global {
  interface Window {
    readonly orix: OrixPreloadApi;
  }
}

type ProductFormState = {
  readonly id?: string;
  readonly name: string;
  readonly barcode: string;
  readonly categoryId: string;
  readonly brandId: string;
  readonly unitId: string;
  readonly purchasePrice: string;
  readonly salePrice: string;
  readonly openingStock: string;
  readonly minimumStock: string;
  readonly description: string;
  readonly active: boolean;
  readonly expectedUpdatedAt?: string | null;
};

type SetupWizardState = {
  readonly storeName: string;
  readonly businessName: string;
  readonly ownerName: string;
  readonly phone: string;
  readonly email: string;
  readonly address: string;
  readonly logoDataUrl: string | null;
  readonly currency: string;
  readonly timezone: string;
  readonly taxEnabled: boolean;
  readonly branchName: string;
  readonly adminFullName: string;
  readonly username: string;
  readonly password: string;
  readonly confirmPassword: string;
  readonly pin: string;
};

type LoginState = {
  readonly username: string;
  readonly password: string;
  readonly pin: string;
  readonly rememberMe: boolean;
  readonly mode: "password" | "pin";
};

type UserFormState = {
  readonly id?: string;
  readonly fullName: string;
  readonly username: string;
  readonly password: string;
  readonly pin: string;
  readonly roleNames: readonly RoleName[];
  readonly status: "active" | "disabled";
};

type CatalogFormState = {
  readonly id?: string;
  readonly kind: CatalogItemKind;
  readonly name: string;
  readonly code: string;
  readonly abbreviation: string;
};

type InventoryColumn =
  | "barcode"
  | "sku"
  | "product"
  | "category"
  | "currentStock"
  | "availableStock"
  | "minimumStock"
  | "maximumStock"
  | "purchasePrice"
  | "retailPrice"
  | "inventoryValue"
  | "status"
  | "actions";

type StockAdjustmentForm = {
  readonly productId: string;
  readonly direction: "increase" | "decrease";
  readonly quantity: string;
  readonly unitCost: string;
  readonly reason: InventoryAdjustmentPayload["reason"];
  readonly occurredAt: string;
  readonly notes: string;
};

type OpeningStockForm = {
  readonly productId: string;
  readonly quantity: string;
  readonly unitCost: string;
  readonly occurredAt: string;
  readonly notes: string;
};

type CustomerFormState = {
  readonly id?: string;
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly address: string;
  readonly city: string;
  readonly cnic: string;
  readonly tags: string;
  readonly customerType: CustomerType;
  readonly creditLimit: string;
  readonly openingBalance: string;
  readonly openingBalanceDate: string;
  readonly notes: string;
  readonly expectedUpdatedAt?: string | null;
};

type CustomerPaymentFormState = {
  readonly customerId: string;
  readonly amount: string;
  readonly paymentMethod: CustomerPaymentPayload["paymentMethod"];
  readonly paidAt: string;
  readonly referenceNumber: string;
  readonly receiptNumber: string;
  readonly notes: string;
};

type SupplierFormState = {
  readonly id?: string;
  readonly name: string;
  readonly phone: string;
  readonly email: string;
  readonly address: string;
  readonly city: string;
  readonly ntn: string;
  readonly strn: string;
  readonly tags: string;
  readonly creditTerms: string;
  readonly openingBalance: string;
  readonly openingBalanceDate: string;
  readonly notes: string;
  readonly expectedUpdatedAt?: string | null;
};

type SupplierPaymentFormState = {
  readonly supplierId: string;
  readonly amount: string;
  readonly paymentMethod: SupplierPaymentPayload["paymentMethod"];
  readonly paidAt: string;
  readonly referenceNumber: string;
  readonly receiptNumber: string;
  readonly notes: string;
};

type PurchaseItemFormState = {
  readonly productId: string;
  readonly unitId: string;
  readonly quantity: string;
  readonly unitCost: string;
  readonly discount: string;
  readonly tax: string;
};

type PurchaseFormState = {
  readonly id?: string;
  readonly supplierId: string;
  readonly invoiceNumber: string;
  readonly purchaseNumber: string;
  readonly purchaseDate: string;
  readonly dueDate: string;
  readonly discount: string;
  readonly tax: string;
  readonly freight: string;
  readonly otherCharges: string;
  readonly notes: string;
  readonly items: readonly PurchaseItemFormState[];
  readonly expectedUpdatedAt?: string | null;
};

type PurchaseReturnFormState = {
  readonly purchase: PurchaseDetailDto;
  readonly reason: string;
  readonly quantities: Readonly<Record<string, string>>;
};

type PosCartItem = {
  readonly productId: string;
  readonly productName: string;
  readonly barcode: string | null;
  readonly unitId: string;
  readonly quantity: number;
  readonly unitPriceMinor: number;
  readonly discountMinor: number;
  readonly taxMinor: number;
  readonly currentStock: number;
};

type SaleFormState = {
  readonly id?: string;
  readonly customerId: string;
  readonly saleNumber: string;
  readonly saleDate: string;
  readonly paymentType: SalePaymentType;
  readonly discount: string;
  readonly tax: string;
  readonly cashReceived: string;
  readonly notes: string;
  readonly holdReason: string;
  readonly items: readonly PosCartItem[];
  readonly expectedUpdatedAt?: string | null;
};

type SaleReturnFormState = {
  readonly sale: SaleDetailDto;
  readonly reason: string;
  readonly refundMethod: SaleReturnPayload["refundMethod"];
  readonly quantities: Readonly<Record<string, string>>;
  readonly conditions: Readonly<Record<string, SaleReturnCondition>>;
};

type ToastState = {
  readonly message: string;
  readonly tone: "success" | "error";
};

type IconName =
  | "barcode"
  | "cart"
  | "cash"
  | "chevronLeft"
  | "chevronRight"
  | "clock"
  | "credit"
  | "folder"
  | "home"
  | "package"
  | "pause"
  | "play"
  | "plus"
  | "receipt"
  | "refresh"
  | "search"
  | "settings"
  | "trash"
  | "truck"
  | "upload"
  | "user"
  | "users"
  | "warehouse";

type ErrorBoundaryState = {
  readonly hasError: boolean;
};

const themePreferenceStorageKey = "orix.themePreference";

const isThemePreference = (value: string | null): value is AppSettingsDto["theme"] =>
  value === "light" || value === "dark" || value === "system";

const readCachedThemePreference = (): AppSettingsDto["theme"] => {
  const value = localStorage.getItem(themePreferenceStorageKey);
  return isThemePreference(value) ? value : "system";
};

const emptyProductForm: ProductFormState = {
  name: "",
  barcode: "",
  categoryId: "",
  brandId: "",
  unitId: "",
  purchasePrice: "0",
  salePrice: "0",
  openingStock: "0",
  minimumStock: "0",
  description: "",
  active: true
};

const emptySetupForm: SetupWizardState = {
  storeName: "",
  businessName: "",
  ownerName: "",
  phone: "",
  email: "",
  address: "",
  logoDataUrl: null,
  currency: "PKR",
  timezone: "Asia/Karachi",
  taxEnabled: false,
  branchName: "Main Branch",
  adminFullName: "",
  username: "owner",
  password: "",
  confirmPassword: "",
  pin: ""
};

const roleOptions: readonly RoleName[] = [
  "Owner",
  "Manager",
  "Cashier",
  "Inventory Manager",
  "Accountant",
  "Viewer"
];

const emptyCustomerForm: CustomerFormState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  cnic: "",
  tags: "",
  customerType: "regular",
  creditLimit: "0",
  openingBalance: "0",
  openingBalanceDate: new Date().toISOString().slice(0, 10),
  notes: ""
};

const emptySupplierForm: SupplierFormState = {
  name: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  ntn: "",
  strn: "",
  tags: "",
  creditTerms: "Due on receipt",
  openingBalance: "0",
  openingBalanceDate: new Date().toISOString().slice(0, 10),
  notes: ""
};

const emptyPurchaseItem: PurchaseItemFormState = {
  productId: "",
  unitId: "",
  quantity: "1",
  unitCost: "0",
  discount: "0",
  tax: "0"
};

const emptyPurchaseForm: PurchaseFormState = {
  supplierId: "",
  invoiceNumber: "",
  purchaseNumber: "",
  purchaseDate: new Date().toISOString().slice(0, 10),
  dueDate: "",
  discount: "0",
  tax: "0",
  freight: "0",
  otherCharges: "0",
  notes: "",
  items: [emptyPurchaseItem]
};

const emptySaleForm: SaleFormState = {
  customerId: "",
  saleNumber: "",
  saleDate: new Date().toISOString().slice(0, 16),
  paymentType: "cash",
  discount: "0",
  tax: "0",
  cashReceived: "0",
  notes: "",
  holdReason: "",
  items: []
};

const routePermissions: Record<RouteId, AppContextDto["permissions"][number]> = {
  dashboard: "dashboard.view",
  pos: "pos.view",
  inventory: "inventory.view",
  products: "products.view",
  customers: "customers.view",
  suppliers: "suppliers.view",
  purchases: "purchases.view",
  sales: "sales.view",
  expenses: "expenses.view",
  reports: "reports.view",
  settings: "settings.view",
  about: "about.view"
};

const money = (minor: number): string =>
  new Intl.NumberFormat("en-PK", {
    style: "currency",
    currency: "PKR",
    maximumFractionDigits: 2
  }).format(minor / 100);

const toMinor = (value: string): number => Math.round(Number(value || "0") * 100);

const fromMinor = (value: number): string => (value / 100).toFixed(2);

const errorMessage = (error: ProductIpcError | undefined): string =>
  error?.message ?? "Something went wrong.";

const noop = (): void => {
  // Intentionally empty callback for read-only receipt previews.
};

class ErrorBoundary extends Component<{ readonly children: ReactNode }, ErrorBoundaryState> {
  public constructor(props: { readonly children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="fatal-state">
          <h1>Something went wrong</h1>
          <p>Restart Orix Retail OS and try again. Your local data is still stored safely.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  const [route, setRoute] = useState<RouteId>(() => routeFromPath(window.location.pathname));
  const [authStatus, setAuthStatus] = useState<AuthStatusDto | null>(null);
  const [context, setContext] = useState<AppContextDto | null>(null);
  const [settings, setSettings] = useState<AppSettingsDto | null>(null);
  const [startupError, setStartupError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem("orix.sidebarCollapsed") === "true"
  );
  const [toast, setToast] = useState<ToastState | null>(null);
  const [clock, setClock] = useState(() => new Date());

  const navigate = useCallback((nextRoute: RouteId) => {
    const path = pathForRoute(nextRoute);
    window.history.pushState({ route: nextRoute }, "", path);
    setRoute(nextRoute);
  }, []);

  const showToast = useCallback((message: string, tone: ToastState["tone"] = "success") => {
    setToast({ message, tone });
    window.setTimeout(() => {
      setToast(null);
    }, 3200);
  }, []);

  const applyThemePreference = useCallback((theme: AppSettingsDto["theme"]) => {
    const resolved = resolveThemePreference(
      theme,
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
    document.documentElement.dataset.theme = resolved;
  }, []);

  const rememberThemePreference = useCallback(
    (theme: AppSettingsDto["theme"]) => {
      localStorage.setItem(themePreferenceStorageKey, theme);
      applyThemePreference(theme);
    },
    [applyThemePreference]
  );

  const loadStartupSettings = useCallback(async () => {
    const response = await window.orix.settings.get();
    if (response.ok) {
      setSettings(response.value);
      rememberThemePreference(response.value.theme);
    }
  }, [rememberThemePreference]);

  const loadAuthStatus = useCallback(async () => {
    try {
      const response = await window.orix.auth.status();
      if (response.ok) {
        setStartupError(null);
        setAuthStatus(response.value);
      } else {
        setStartupError(response.error.message);
        showToast(response.error.message, "error");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to start Orix Retail OS.";
      setStartupError(message);
      showToast(message, "error");
    }
  }, [showToast]);

  const loadShell = useCallback(async () => {
    if (authStatus?.authenticated !== true) {
      return;
    }
    const [contextResponse, settingsResponse] = await Promise.all([
      window.orix.app.context(),
      window.orix.settings.get()
    ]);
    if (contextResponse.ok) {
      setContext(contextResponse.value);
    } else {
      showToast(contextResponse.error.message, "error");
    }
    if (settingsResponse.ok) {
      setSettings(settingsResponse.value);
      rememberThemePreference(settingsResponse.value.theme);
    } else {
      showToast(settingsResponse.error.message, "error");
    }
  }, [authStatus?.authenticated, rememberThemePreference, showToast]);

  useEffect(() => {
    void loadAuthStatus();
  }, [loadAuthStatus]);

  useEffect(() => {
    rememberThemePreference(readCachedThemePreference());
  }, [rememberThemePreference]);

  useEffect(() => {
    if (authStatus !== null && !authStatus.needsSetup) {
      void loadStartupSettings();
    }
  }, [authStatus, loadStartupSettings]);

  useEffect(() => {
    if (authStatus?.authenticated === true) {
      void loadShell();
    }
  }, [authStatus?.authenticated, loadShell]);

  useEffect(() => {
    const onPopState = () => {
      setRoute(routeFromPath(window.location.pathname));
    };
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("popstate", onPopState);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClock(new Date());
    }, 1000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("orix.sidebarCollapsed", String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  useEffect(() => {
    applyThemePreference(settings?.theme ?? readCachedThemePreference());
  }, [applyThemePreference, settings?.theme]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystemThemeChange = () => {
      if ((settings?.theme ?? readCachedThemePreference()) === "system") {
        applyThemePreference("system");
      }
    };
    media.addEventListener("change", onSystemThemeChange);
    return () => {
      media.removeEventListener("change", onSystemThemeChange);
    };
  }, [applyThemePreference, settings?.theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) {
        return;
      }
      if (event.key === "1") {
        event.preventDefault();
        navigate("dashboard");
      } else if (event.key === "2") {
        event.preventDefault();
        navigate("pos");
      } else if (event.key === "3") {
        event.preventDefault();
        navigate("products");
      } else if (event.key === "4") {
        event.preventDefault();
        navigate("inventory");
      } else if (event.key === ",") {
        event.preventDefault();
        navigate("settings");
      } else if (event.key.toLowerCase() === "l") {
        event.preventDefault();
        void window.orix.auth.lock().then((response) => {
          if (response.ok) {
            setAuthStatus(response.value);
          }
        });
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [navigate]);

  const hasPermission = useCallback(
    (permission: AppContextDto["permissions"][number]) =>
      context?.permissions.includes(permission) ?? false,
    [context?.permissions]
  );

  const renderedPage = useMemo(() => {
    const active = routes.find((item) => item.id === route);
    if (active?.ready === false) {
      return <DashboardPage onNavigate={navigate} showToast={showToast} />;
    }
    if (route === "dashboard") {
      return <DashboardPage onNavigate={navigate} showToast={showToast} />;
    }
    if (route === "pos") {
      return (
        <PosModule
          context={context}
          permissions={context?.permissions ?? []}
          settings={settings}
          showToast={showToast}
        />
      );
    }
    if (route === "products") {
      return <ProductModule showToast={showToast} />;
    }
    if (route === "inventory") {
      return <InventoryModule showToast={showToast} />;
    }
    if (route === "customers") {
      return <CustomerModule permissions={context?.permissions ?? []} showToast={showToast} />;
    }
    if (route === "suppliers") {
      return <SupplierModule permissions={context?.permissions ?? []} showToast={showToast} />;
    }
    if (route === "purchases") {
      return <PurchaseModule permissions={context?.permissions ?? []} showToast={showToast} />;
    }
    if (route === "sales") {
      return (
        <SalesModule
          context={context}
          permissions={context?.permissions ?? []}
          settings={settings}
          showToast={showToast}
        />
      );
    }
    if (route === "reports") {
      return <ReportsModule showToast={showToast} />;
    }
    if (route === "settings") {
      return (
        <SettingsPage
          settings={settings}
          canManageUsers={hasPermission("users.manage")}
          canManageMigration={hasPermission("settings.manage")}
          onSaved={(nextSettings) => {
            setSettings(nextSettings);
            rememberThemePreference(nextSettings.theme);
            showToast("Settings saved.");
          }}
          onThemePreview={rememberThemePreference}
          showToast={showToast}
        />
      );
    }
    if (route === "about") {
      return <AboutPage version={context?.applicationVersion ?? "0.0.0"} />;
    }
    return <DashboardPage onNavigate={navigate} showToast={showToast} />;
  }, [context?.applicationVersion, hasPermission, navigate, route, settings, showToast]);

  if (authStatus === null) {
    return (
      <StartupScreen
        error={startupError}
        onRetry={() => {
          void loadAuthStatus();
        }}
      />
    );
  }

  if (authStatus.needsSetup) {
    return (
      <SetupWizard
        onComplete={(nextStatus) => {
          setAuthStatus(nextStatus);
          showToast("Store setup completed.");
        }}
        showToast={showToast}
      />
    );
  }

  if (!authStatus.authenticated) {
    return (
      <LoginScreen
        authStatus={authStatus}
        locked={authStatus.locked && context !== null}
        currentUser={context?.currentUser ?? authStatus.rememberedUsername ?? ""}
        onAuthenticated={(nextStatus) => {
          setAuthStatus(nextStatus);
        }}
        showToast={showToast}
      />
    );
  }

  return (
    <ErrorBoundary>
      <main className="desktop-shell">
        <TitleBar context={context} clock={clock} onNavigate={navigate} />
        <div className="desktop-body">
          <Sidebar
            activeRoute={route}
            collapsed={sidebarCollapsed}
            onNavigate={navigate}
            onToggle={() => {
              setSidebarCollapsed((value) => !value);
            }}
            permissions={context?.permissions ?? []}
          />
          <section className="main-content">{renderedPage}</section>
        </div>
        <StatusBar context={context} />
        {toast === null ? null : <Toast toast={toast} />}
      </main>
    </ErrorBoundary>
  );
};

const SetupWizard = ({
  onComplete,
  showToast
}: {
  readonly onComplete: (status: AuthStatusDto) => void;
  readonly showToast: (message: string, tone?: ToastState["tone"]) => void;
}) => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<SetupWizardState>(emptySetupForm);
  const [submittedSteps, setSubmittedSteps] = useState<ReadonlySet<number>>(() => new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errors = submittedSteps.has(step) ? setupStepErrors(form, step) : {};

  const finish = async () => {
    setSubmittedSteps(new Set([1, 2, 3]));
    const validationError = validateSetupForm(form);
    if (validationError !== null) {
      setError(validationError);
      showToast(validationError, "error");
      return;
    }
    setSaving(true);
    setError(null);
    const payload: SetupStorePayload = { ...form };
    const response = await window.orix.auth.setupStore(payload);
    if (response.ok) {
      onComplete(response.value);
    } else {
      setError(response.error.message);
      showToast(response.error.message, "error");
    }
    setSaving(false);
  };

  return (
    <main className="auth-layout">
      <section className="auth-panel setup-panel">
        <div className="brand-lockup">
          <div className="brand-mark">OR</div>
          <div>
            <p className="eyebrow">First Run Setup</p>
            <h1>Prepare your store</h1>
          </div>
        </div>
        <div className="stepper" aria-label="Setup progress">
          {[1, 2, 3, 4].map((item) => (
            <span className={item <= step ? "active" : ""} key={item}>
              {item}
            </span>
          ))}
        </div>
        {error === null ? null : <div className="form-error">{error}</div>}
        {step === 1 ? (
          <div className="form-grid">
            <Field
              label="Store Name *"
              value={form.storeName}
              error={errors.storeName}
              required
              onChange={(storeName) => {
                setForm({ ...form, storeName });
              }}
            />
            <Field
              label="Business Name"
              value={form.businessName}
              onChange={(businessName) => {
                setForm({ ...form, businessName });
              }}
            />
            <Field
              label="Owner Name *"
              value={form.ownerName}
              error={errors.ownerName}
              required
              onChange={(ownerName) => {
                setForm({ ...form, ownerName });
              }}
            />
            <Field
              label="Phone"
              value={form.phone}
              onChange={(phone) => {
                setForm({ ...form, phone });
              }}
            />
            <Field
              label="Email"
              type="email"
              value={form.email}
              error={errors.email}
              onChange={(email) => {
                setForm({ ...form, email });
              }}
            />
            <Field
              label="Currency"
              value={form.currency}
              error={errors.currency}
              required
              onChange={(currency) => {
                setForm({ ...form, currency });
              }}
            />
            <Field
              label="Timezone"
              value={form.timezone}
              error={errors.timezone}
              required
              onChange={(timezone) => {
                setForm({ ...form, timezone });
              }}
            />
            <label className="wide">
              Address
              <textarea
                value={form.address}
                onChange={(event) => {
                  setForm({ ...form, address: event.target.value });
                }}
              />
            </label>
            <label className="wide">
              Logo
              <input
                type="file"
                accept="image/*"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file === undefined) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    setForm({
                      ...form,
                      logoDataUrl: typeof reader.result === "string" ? reader.result : null
                    });
                  };
                  reader.readAsDataURL(file);
                }}
              />
            </label>
            <label className="check-row wide">
              <input
                type="checkbox"
                checked={form.taxEnabled}
                onChange={(event) => {
                  setForm({ ...form, taxEnabled: event.target.checked });
                }}
              />
              Tax enabled
            </label>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="form-grid">
            <Field
              label="Default Branch Name *"
              value={form.branchName}
              error={errors.branchName}
              required
              onChange={(branchName) => {
                setForm({ ...form, branchName });
              }}
            />
          </div>
        ) : null}
        {step === 3 ? (
          <div className="form-grid">
            <Field
              label="Full Name *"
              value={form.adminFullName}
              error={errors.adminFullName}
              required
              onChange={(adminFullName) => {
                setForm({ ...form, adminFullName });
              }}
            />
            <Field
              label="Username *"
              value={form.username}
              error={errors.username}
              required
              onChange={(username) => {
                setForm({ ...form, username });
              }}
            />
            <Field
              label="Password *"
              type="password"
              value={form.password}
              error={errors.password}
              required
              onChange={(password) => {
                setForm({ ...form, password });
              }}
            />
            <Field
              label="Confirm Password *"
              type="password"
              value={form.confirmPassword}
              error={errors.confirmPassword}
              required
              onChange={(confirmPassword) => {
                setForm({ ...form, confirmPassword });
              }}
            />
            <Field
              label="PIN *"
              value={form.pin}
              error={errors.pin}
              required
              maxLength={4}
              helperText="Use 4 digits for quick login."
              onChange={(pin) => {
                setForm({ ...form, pin: pin.replace(/\D/g, "").slice(0, 4) });
              }}
            />
          </div>
        ) : null}
        {step === 4 ? (
          <div className="summary-card">
            <Detail label="Store" value={form.storeName || "Not set"} />
            <Detail label="Branch" value={form.branchName || "Not set"} />
            <Detail label="Admin" value={form.adminFullName || "Not set"} />
            <Detail label="Currency" value={form.currency} />
            <Detail label="Timezone" value={form.timezone} />
          </div>
        ) : null}
        <footer className="dialog-actions">
          <button
            disabled={step === 1 || saving}
            onClick={() => {
              setStep((value) => Math.max(1, value - 1));
            }}
          >
            Back
          </button>
          {step < 4 ? (
            <button
              className="primary"
              onClick={() => {
                setSubmittedSteps((previous) => new Set([...previous, step]));
                const validationError = validateSetupStep(form, step);
                if (validationError !== null) {
                  setError(validationError);
                  showToast(validationError, "error");
                  return;
                }
                setError(null);
                setStep((value) => Math.min(4, value + 1));
              }}
            >
              Next
            </button>
          ) : (
            <button className="primary" disabled={saving} onClick={() => void finish()}>
              {saving ? "Finishing..." : "Finish Setup"}
            </button>
          )}
        </footer>
      </section>
    </main>
  );
};

const LoginScreen = ({
  authStatus,
  locked,
  currentUser,
  onAuthenticated,
  showToast
}: {
  readonly authStatus: AuthStatusDto;
  readonly locked: boolean;
  readonly currentUser: string;
  readonly onAuthenticated: (status: AuthStatusDto) => void;
  readonly showToast: (message: string, tone?: ToastState["tone"]) => void;
}) => {
  const [form, setForm] = useState<LoginState>({
    username: authStatus.rememberedUsername ?? "",
    password: "",
    pin: "",
    rememberMe: authStatus.rememberedUsername !== null,
    mode: authStatus.rememberedUsername === null ? "password" : "pin"
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const errors = submitted ? loginFormErrors(form, locked) : {};

  const submit = async () => {
    setSubmitted(true);
    const validationError = validateLoginForm(form, locked);
    if (validationError !== null) {
      setError(validationError);
      showToast(validationError, "error");
      return;
    }
    setSubmitting(true);
    setError(null);
    const response =
      locked && form.username === (authStatus.rememberedUsername ?? form.username)
        ? await window.orix.auth.unlock(
            form.mode === "pin" ? { pin: form.pin } : { password: form.password }
          )
        : await window.orix.auth.login({
            username: form.username,
            rememberMe: form.rememberMe,
            ...(form.mode === "pin" ? { pin: form.pin } : { password: form.password })
          });
    if (response.ok) {
      onAuthenticated(response.value);
    } else {
      setError(response.error.message);
      showToast(response.error.message, "error");
    }
    setSubmitting(false);
  };

  return (
    <main className="auth-layout">
      <section className="auth-panel login-panel">
        <div className="login-brand">
          {authStatus.storeLogoDataUrl === null ? (
            <div className="brand-mark">OR</div>
          ) : (
            <img src={authStatus.storeLogoDataUrl} alt="" />
          )}
          <div>
            <p className="eyebrow">Offline</p>
            <h1>{authStatus.storeName ?? "Orix Retail OS"}</h1>
          </div>
        </div>
        <h2>{locked ? "Application locked" : "Sign in"}</h2>
        {locked ? <p className="muted-text">Unlock as {currentUser || "current user"}.</p> : null}
        {error === null ? null : <div className="form-error">{error}</div>}
        {!locked ? (
          <Field
            label="Username"
            value={form.username}
            error={errors.username}
            required
            onChange={(username) => {
              setForm({ ...form, username });
            }}
          />
        ) : null}
        <div className="segmented">
          <button
            className={form.mode === "pin" ? "active" : ""}
            onClick={() => {
              setForm({ ...form, mode: "pin" });
            }}
          >
            PIN
          </button>
          <button
            className={form.mode === "password" ? "active" : ""}
            onClick={() => {
              setForm({ ...form, mode: "password" });
            }}
          >
            Password
          </button>
        </div>
        {form.mode === "pin" ? (
          <Field
            label="4 digit PIN"
            value={form.pin}
            error={errors.pin}
            required
            maxLength={4}
            onChange={(pin) => {
              setForm({ ...form, pin: pin.replace(/\D/g, "").slice(0, 4) });
            }}
          />
        ) : (
          <label>
            Password
            <div className="password-row">
              <input
                type={showPassword ? "text" : "password"}
                value={form.password}
                aria-invalid={errors.password === undefined ? undefined : true}
                onChange={(event) => {
                  setForm({ ...form, password: event.target.value });
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") void submit();
                }}
              />
              <button
                onClick={() => {
                  setShowPassword((value) => !value);
                }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {errors.password === undefined ? null : (
              <small className="field-error">{errors.password}</small>
            )}
          </label>
        )}
        {!locked ? (
          <label className="check-row">
            <input
              type="checkbox"
              checked={form.rememberMe}
              onChange={(event) => {
                setForm({ ...form, rememberMe: event.target.checked });
              }}
            />
            Remember me
          </label>
        ) : null}
        <button className="primary auth-submit" disabled={submitting} onClick={() => void submit()}>
          {submitting ? "Checking..." : locked ? "Unlock" : "Login"}
        </button>
        <button disabled>Forgot Password</button>
        {locked ? (
          <button
            onClick={() => {
              setForm({ ...form, username: "", password: "", pin: "", mode: "password" });
            }}
          >
            Switch User
          </button>
        ) : null}
      </section>
    </main>
  );
};

const StartupScreen = ({
  error,
  onRetry
}: {
  readonly error: string | null;
  readonly onRetry: () => void;
}) => (
  <main className="auth-layout">
    <section className="auth-panel login-panel">
      <div className="brand-lockup">
        <div className="brand-mark">OR</div>
        <div>
          <p className="eyebrow">Starting</p>
          <h1>Orix Retail OS</h1>
        </div>
      </div>
      {error === null ? (
        <LoadingState label="Starting Orix Retail OS" />
      ) : (
        <>
          <div className="form-error">{error}</div>
          <button className="primary" onClick={onRetry}>
            Retry Startup
          </button>
        </>
      )}
    </section>
  </main>
);

const CustomerModule = ({
  permissions,
  showToast
}: {
  readonly permissions: readonly AppContextDto["permissions"][number][];
  readonly showToast: (message: string, tone?: ToastState["tone"]) => void;
}) => {
  const [customers, setCustomers] = useState<readonly CustomerListItemDto[]>([]);
  const [query, setQuery] = useState<CustomerListRequest>({
    page: 1,
    pageSize: 12,
    sortBy: "name",
    sortDirection: "asc",
    status: "active",
    customerType: "all"
  });
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<CustomerFormState | null>(null);
  const [profile, setProfile] = useState<CustomerDetailDto | null>(null);
  const [statement, setStatement] = useState<CustomerStatementDto | null>(null);
  const [activity, setActivity] = useState<readonly CustomerActivityDto[]>([]);
  const [statementQuery, setStatementQuery] = useState<
    Omit<CustomerStatementRequest, "customerId">
  >({
    page: 1,
    pageSize: 30,
    transactionType: "all"
  });
  const [paymentForm, setPaymentForm] = useState<CustomerPaymentFormState | null>(null);
  const [tab, setTab] = useState<
    "overview" | "statement" | "payments" | "purchases" | "notes" | "activity"
  >("overview");
  const [visibleColumns, setVisibleColumns] = useState(
    () =>
      new Set([
        "avatar",
        "name",
        "phone",
        "city",
        "balance",
        "creditLimit",
        "lastPurchase",
        "status",
        "actions"
      ])
  );

  const canCreate = permissions.includes("customers.create");
  const canEdit = permissions.includes("customers.edit");
  const canDelete = permissions.includes("customers.delete");
  const canPay = permissions.includes("customers.payments");
  const canExport = permissions.includes("customers.export");
  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    const response = await window.orix.customers.list(query);
    if (response.ok) {
      setCustomers(response.value.items);
      setTotalItems(response.value.totalItems);
    } else {
      showToast(response.error.message, "error");
    }
    setLoading(false);
  }, [query, showToast]);

  const loadProfile = useCallback(
    async (id: string) => {
      const response = await window.orix.customers.get(id);
      if (response.ok && response.value !== undefined) {
        setProfile(response.value);
        const activityResponse = await window.orix.customers.activity(id);
        if (activityResponse.ok) {
          setActivity(activityResponse.value.items);
        } else {
          setActivity([]);
          showToast(activityResponse.error.message, "error");
        }
      } else {
        showToast(response.ok ? "Customer was not found." : response.error.message, "error");
      }
    },
    [showToast]
  );

  const loadStatement = useCallback(async () => {
    if (profile === null) return;
    const response = await window.orix.customers.statement({
      ...statementQuery,
      customerId: profile.id
    });
    if (response.ok) {
      setStatement(response.value);
    } else {
      showToast(response.error.message, "error");
    }
  }, [profile, showToast, statementQuery]);

  useEffect(() => {
    void loadCustomers();
  }, [loadCustomers]);

  useEffect(() => {
    if (profile !== null) {
      void loadStatement();
    }
  }, [loadStatement, profile]);

  const saveCustomer = async () => {
    if (form === null) return;
    const validationError = validateCustomerForm(form);
    if (validationError !== null) {
      showToast(validationError, "error");
      return;
    }
    const payload: CustomerWritePayload = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      city: form.city || null,
      cnic: form.cnic || null,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
      customerType: form.customerType,
      creditLimitMinor: toMinor(form.creditLimit),
      openingBalanceMinor: toMinor(form.openingBalance),
      openingBalanceDate: form.openingBalanceDate || null,
      notes: form.notes || null,
      ...(form.id === undefined ? {} : { id: form.id }),
      ...(form.expectedUpdatedAt === undefined ? {} : { expectedUpdatedAt: form.expectedUpdatedAt })
    };
    const response = await window.orix.customers.save(payload);
    if (response.ok) {
      setForm(null);
      showToast("Customer saved.");
      await loadCustomers();
      setProfile(response.value.customer);
    } else {
      showToast(response.error.message, "error");
    }
  };

  const editCustomer = (customer: CustomerDetailDto) => {
    setForm({
      id: customer.id,
      name: customer.name,
      phone: customer.phone ?? "",
      email: customer.email ?? "",
      address: customer.address ?? "",
      city: customer.city ?? "",
      cnic: customer.cnic ?? "",
      tags: customer.tags.join(", "),
      customerType: customer.customerType,
      creditLimit: fromMinor(customer.creditLimitMinor),
      openingBalance: fromMinor(customer.openingBalanceMinor),
      openingBalanceDate: customer.openingBalanceDate?.slice(0, 10) ?? "",
      notes: customer.notes ?? "",
      expectedUpdatedAt: customer.updatedAt
    });
  };

  const archiveOrRestore = async (customer: CustomerListItemDto) => {
    const response =
      customer.archivedAt === null
        ? await window.orix.customers.archive(customer.id)
        : await window.orix.customers.restore(customer.id);
    if (response.ok) {
      showToast(customer.archivedAt === null ? "Customer archived." : "Customer restored.");
      await loadCustomers();
    } else {
      showToast(response.error.message, "error");
    }
  };

  const recordPayment = async () => {
    if (paymentForm === null) return;
    const validationError = validateCustomerPaymentForm(paymentForm);
    if (validationError !== null) {
      showToast(validationError, "error");
      return;
    }
    const response = await window.orix.customers.recordPayment({
      customerId: paymentForm.customerId,
      amountMinor: toMinor(paymentForm.amount),
      paymentMethod: paymentForm.paymentMethod,
      paidAt: paymentForm.paidAt,
      referenceNumber: paymentForm.referenceNumber || null,
      receiptNumber: paymentForm.receiptNumber || null,
      notes: paymentForm.notes || null
    });
    if (response.ok) {
      setPaymentForm(null);
      showToast("Payment recorded.");
      await loadCustomers();
      if (profile !== null) {
        await loadProfile(profile.id);
        await loadStatement();
      }
    } else {
      showToast(response.error.message, "error");
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Name", "Phone", "City", "Outstanding Balance", "Credit Limit", "Status"],
      ...customers.map((customer) => [
        customer.name,
        customer.phone ?? "",
        customer.city ?? "",
        fromMinor(customer.outstandingBalanceMinor),
        fromMinor(customer.creditLimitMinor),
        customer.status
      ])
    ];
    const blob = new Blob(
      [
        rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n")
      ],
      {
        type: "text/csv;charset=utf-8"
      }
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "customers.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="page-stack customers-module">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Digital Account Book</p>
          <h1>Customers</h1>
        </div>
        <div className="topbar-actions">
          <button disabled={!canExport} onClick={exportCsv}>
            Export CSV
          </button>
          <button
            onClick={() => {
              window.print();
            }}
          >
            Print
          </button>
          <button
            className="primary"
            disabled={!canCreate}
            onClick={() => {
              setForm(emptyCustomerForm);
            }}
          >
            New Customer
          </button>
        </div>
      </div>
      <div className="filters customer-filters">
        <input
          placeholder="Search name, phone, tags, customer ID"
          value={query.search ?? ""}
          onChange={(event) => {
            setQuery({ ...query, search: event.target.value, page: 1 });
          }}
        />
        <select
          value={query.status}
          onChange={(event) => {
            setQuery({
              ...query,
              status: event.target.value as NonNullable<CustomerListRequest["status"]>,
              page: 1
            });
          }}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
        <select
          value={query.customerType}
          onChange={(event) => {
            setQuery({
              ...query,
              customerType: event.target.value as NonNullable<CustomerListRequest["customerType"]>,
              page: 1
            });
          }}
        >
          <option value="all">All types</option>
          <option value="walk-in">Walk-in</option>
          <option value="regular">Regular</option>
          <option value="wholesale">Wholesale</option>
          <option value="vip">VIP</option>
        </select>
        <CustomerColumnPicker
          columns={[
            "avatar",
            "name",
            "phone",
            "city",
            "balance",
            "creditLimit",
            "lastPurchase",
            "status",
            "actions"
          ]}
          visible={visibleColumns}
          onChange={setVisibleColumns}
        />
      </div>
      <div className="table-wrap customer-table">
        <table>
          <thead>
            <tr>
              {visibleColumns.has("avatar") ? <th>Avatar</th> : null}
              {visibleColumns.has("name") ? (
                <CustomerSortableTh
                  label="Customer Name"
                  sortBy="name"
                  query={query}
                  setQuery={setQuery}
                />
              ) : null}
              {visibleColumns.has("phone") ? (
                <CustomerSortableTh
                  label="Phone"
                  sortBy="phone"
                  query={query}
                  setQuery={setQuery}
                />
              ) : null}
              {visibleColumns.has("city") ? (
                <CustomerSortableTh label="City" sortBy="city" query={query} setQuery={setQuery} />
              ) : null}
              {visibleColumns.has("balance") ? (
                <CustomerSortableTh
                  label="Outstanding Balance"
                  sortBy="balance"
                  query={query}
                  setQuery={setQuery}
                />
              ) : null}
              {visibleColumns.has("creditLimit") ? (
                <CustomerSortableTh
                  label="Credit Limit"
                  sortBy="creditLimit"
                  query={query}
                  setQuery={setQuery}
                />
              ) : null}
              {visibleColumns.has("lastPurchase") ? (
                <CustomerSortableTh
                  label="Last Purchase"
                  sortBy="lastPurchase"
                  query={query}
                  setQuery={setQuery}
                />
              ) : null}
              {visibleColumns.has("status") ? (
                <CustomerSortableTh
                  label="Status"
                  sortBy="status"
                  query={query}
                  setQuery={setQuery}
                />
              ) : null}
              {visibleColumns.has("actions") ? <th>Quick Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="state-cell">
                  Loading customers...
                </td>
              </tr>
            ) : customers.length === 0 ? (
              <tr>
                <td colSpan={9} className="state-cell">
                  No customers yet. Add your first account-book customer.
                </td>
              </tr>
            ) : (
              customers.map((customer) => (
                <tr key={customer.id} onDoubleClick={() => void loadProfile(customer.id)}>
                  {visibleColumns.has("avatar") ? (
                    <td>
                      <span className="avatar">{initials(customer.name)}</span>
                    </td>
                  ) : null}
                  {visibleColumns.has("name") ? <td className="strong">{customer.name}</td> : null}
                  {visibleColumns.has("phone") ? <td>{customer.phone ?? "-"}</td> : null}
                  {visibleColumns.has("city") ? <td>{customer.city ?? "-"}</td> : null}
                  {visibleColumns.has("balance") ? (
                    <td className={customer.outstandingBalanceMinor > 0 ? "money-danger" : ""}>
                      {money(customer.outstandingBalanceMinor)}
                    </td>
                  ) : null}
                  {visibleColumns.has("creditLimit") ? (
                    <td>{money(customer.creditLimitMinor)}</td>
                  ) : null}
                  {visibleColumns.has("lastPurchase") ? (
                    <td>
                      {customer.lastPurchaseAt === null
                        ? "-"
                        : new Date(customer.lastPurchaseAt).toLocaleDateString("en-PK")}
                    </td>
                  ) : null}
                  {visibleColumns.has("status") ? (
                    <td>
                      <span
                        className={`pill ${customer.status === "active" ? "success" : "muted"}`}
                      >
                        {customer.status}
                      </span>
                    </td>
                  ) : null}
                  {visibleColumns.has("actions") ? (
                    <td>
                      <div className="row-actions">
                        <button onClick={() => void loadProfile(customer.id)}>View</button>
                        <button
                          disabled={!canPay}
                          onClick={() => {
                            setPaymentForm(paymentFormFor(customer));
                          }}
                        >
                          Payment
                        </button>
                        <button
                          disabled={!canDelete}
                          onClick={() => void archiveOrRestore(customer)}
                        >
                          {customer.archivedAt === null ? "Archive" : "Restore"}
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={query.page}
        totalPages={totalPages}
        onPage={(page) => {
          setQuery({ ...query, page });
        }}
      />
      {form === null ? null : (
        <CustomerForm
          form={form}
          canEdit={canEdit || form.id === undefined}
          onChange={setForm}
          onClose={() => {
            setForm(null);
          }}
          onSave={() => void saveCustomer()}
        />
      )}
      {paymentForm === null ? null : (
        <CustomerPaymentDialog
          form={paymentForm}
          onChange={setPaymentForm}
          onClose={() => {
            setPaymentForm(null);
          }}
          onSave={() => void recordPayment()}
        />
      )}
      {profile === null ? null : (
        <CustomerProfileDrawer
          customer={profile}
          statement={statement}
          activity={activity}
          tab={tab}
          setTab={setTab}
          statementQuery={statementQuery}
          setStatementQuery={setStatementQuery}
          canEdit={canEdit}
          canPay={canPay}
          onEdit={() => {
            editCustomer(profile);
          }}
          onPayment={() => {
            setPaymentForm(paymentFormFor(profile));
          }}
          onClose={() => {
            setActivity([]);
            setProfile(null);
          }}
        />
      )}
    </section>
  );
};

const CustomerColumnPicker = ({
  columns,
  visible,
  onChange
}: {
  readonly columns: readonly string[];
  readonly visible: ReadonlySet<string>;
  readonly onChange: (visible: Set<string>) => void;
}) => (
  <select
    value=""
    onChange={(event) => {
      if (event.target.value.length === 0) return;
      const next = new Set(visible);
      if (next.has(event.target.value)) next.delete(event.target.value);
      else next.add(event.target.value);
      onChange(next);
    }}
  >
    <option value="">Columns</option>
    {columns.map((column) => (
      <option key={column} value={column}>
        {visible.has(column) ? "Hide" : "Show"} {column}
      </option>
    ))}
  </select>
);

const CustomerSortableTh = ({
  label,
  sortBy,
  query,
  setQuery
}: {
  readonly label: string;
  readonly sortBy: CustomerListRequest["sortBy"];
  readonly query: CustomerListRequest;
  readonly setQuery: (query: CustomerListRequest) => void;
}) => (
  <th>
    <button
      className="sort-button"
      onClick={() => {
        setQuery({
          ...query,
          sortBy,
          sortDirection: query.sortBy === sortBy && query.sortDirection === "asc" ? "desc" : "asc"
        });
      }}
    >
      {label} {query.sortBy === sortBy ? (query.sortDirection === "asc" ? "↑" : "↓") : ""}
    </button>
  </th>
);

const CustomerForm = ({
  form,
  canEdit,
  onChange,
  onClose,
  onSave
}: {
  readonly form: CustomerFormState;
  readonly canEdit: boolean;
  readonly onChange: (form: CustomerFormState) => void;
  readonly onClose: () => void;
  readonly onSave: () => void;
}) => {
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? customerFormErrors(form) : {};

  return (
    <div className="modal-backdrop">
      <section className="modal customer-modal">
        <header>
          <h2>{form.id === undefined ? "New Customer" : "Edit Customer"}</h2>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="form-grid">
          <Field
            label="Customer Name *"
            value={form.name}
            error={errors.name}
            required
            onChange={(name) => {
              onChange({ ...form, name });
            }}
          />
          <Field
            label="Phone"
            value={form.phone}
            onChange={(phone) => {
              onChange({ ...form, phone });
            }}
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            error={errors.email}
            onChange={(email) => {
              onChange({ ...form, email });
            }}
          />
          <Field
            label="City"
            value={form.city}
            onChange={(city) => {
              onChange({ ...form, city });
            }}
          />
          <Field
            label="CNIC"
            value={form.cnic}
            onChange={(cnic) => {
              onChange({ ...form, cnic });
            }}
          />
          <label>
            Customer Type
            <select
              value={form.customerType}
              onChange={(event) => {
                onChange({ ...form, customerType: event.target.value as CustomerType });
              }}
            >
              <option value="walk-in">Walk-in</option>
              <option value="regular">Regular</option>
              <option value="wholesale">Wholesale</option>
              <option value="vip">VIP</option>
            </select>
          </label>
          <Field
            label="Credit Limit"
            type="number"
            value={form.creditLimit}
            error={errors.creditLimit}
            min={0}
            onChange={(creditLimit) => {
              onChange({ ...form, creditLimit });
            }}
          />
          <Field
            label="Opening Balance"
            type="number"
            value={form.openingBalance}
            error={errors.openingBalance}
            min={0}
            onChange={(openingBalance) => {
              onChange({ ...form, openingBalance });
            }}
          />
          <label>
            Opening Date
            <input
              type="date"
              value={form.openingBalanceDate}
              onChange={(event) => {
                onChange({ ...form, openingBalanceDate: event.target.value });
              }}
            />
          </label>
          <Field
            label="Tags"
            value={form.tags}
            onChange={(tags) => {
              onChange({ ...form, tags });
            }}
          />
          <label className="wide">
            Address
            <textarea
              value={form.address}
              onChange={(event) => {
                onChange({ ...form, address: event.target.value });
              }}
            />
          </label>
          <label className="wide">
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => {
                onChange({ ...form, notes: event.target.value });
              }}
            />
          </label>
        </div>
        <footer>
          <button onClick={onClose}>Cancel</button>
          <button
            className="primary"
            disabled={!canEdit}
            onClick={() => {
              setSubmitted(true);
              onSave();
            }}
          >
            Save Customer
          </button>
        </footer>
      </section>
    </div>
  );
};

const CustomerPaymentDialog = ({
  form,
  onChange,
  onClose,
  onSave
}: {
  readonly form: CustomerPaymentFormState;
  readonly onChange: (form: CustomerPaymentFormState) => void;
  readonly onClose: () => void;
  readonly onSave: () => void;
}) => {
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? paymentFormErrors(form) : {};

  return (
    <div className="modal-backdrop">
      <section className="modal">
        <header>
          <h2>Record Payment</h2>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="form-grid">
          <Field
            label="Amount *"
            type="number"
            value={form.amount}
            error={errors.amount}
            min={0}
            required
            onChange={(amount) => {
              onChange({ ...form, amount });
            }}
          />
          <label>
            Method
            <select
              value={form.paymentMethod}
              onChange={(event) => {
                onChange({
                  ...form,
                  paymentMethod: event.target.value as CustomerPaymentFormState["paymentMethod"]
                });
              }}
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">EasyPaisa</option>
              <option value="card">Card</option>
            </select>
          </label>
          <label
            className={errors.paidAt === undefined ? "field-control" : "field-control has-error"}
          >
            Paid At
            <input
              type="datetime-local"
              value={form.paidAt}
              aria-invalid={errors.paidAt === undefined ? undefined : true}
              onChange={(event) => {
                onChange({ ...form, paidAt: event.target.value });
              }}
            />
            {errors.paidAt === undefined ? null : (
              <small className="field-error">{errors.paidAt}</small>
            )}
          </label>
          <Field
            label="Reference Number"
            value={form.referenceNumber}
            onChange={(referenceNumber) => {
              onChange({ ...form, referenceNumber });
            }}
          />
          <Field
            label="Receipt Number"
            value={form.receiptNumber}
            onChange={(receiptNumber) => {
              onChange({ ...form, receiptNumber });
            }}
          />
          <label className="wide">
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => {
                onChange({ ...form, notes: event.target.value });
              }}
            />
          </label>
        </div>
        <footer>
          <button onClick={onClose}>Cancel</button>
          <button
            className="primary"
            onClick={() => {
              setSubmitted(true);
              onSave();
            }}
          >
            Record Payment
          </button>
        </footer>
      </section>
    </div>
  );
};

const CustomerProfileDrawer = ({
  customer,
  statement,
  activity,
  tab,
  setTab,
  statementQuery,
  setStatementQuery,
  canEdit,
  canPay,
  onEdit,
  onPayment,
  onClose
}: {
  readonly customer: CustomerDetailDto;
  readonly statement: CustomerStatementDto | null;
  readonly activity: readonly CustomerActivityDto[];
  readonly tab: "overview" | "statement" | "payments" | "purchases" | "notes" | "activity";
  readonly setTab: (
    tab: "overview" | "statement" | "payments" | "purchases" | "notes" | "activity"
  ) => void;
  readonly statementQuery: Omit<CustomerStatementRequest, "customerId">;
  readonly setStatementQuery: (query: Omit<CustomerStatementRequest, "customerId">) => void;
  readonly canEdit: boolean;
  readonly canPay: boolean;
  readonly onEdit: () => void;
  readonly onPayment: () => void;
  readonly onClose: () => void;
}) => (
  <div className="drawer-backdrop">
    <aside className="drawer customer-profile">
      <header>
        <div className="customer-profile-head">
          <span className="avatar large">{initials(customer.name)}</span>
          <div>
            <h2>{customer.name}</h2>
            <span>
              {customer.phone ?? "No phone"} · {customer.city ?? "No city"}
            </span>
          </div>
        </div>
        <button onClick={onClose}>Close</button>
      </header>
      <div className="profile-actions">
        <button disabled>WhatsApp</button>
        <button disabled={!canPay} onClick={onPayment}>
          Record Payment
        </button>
        <button disabled={!canEdit} onClick={onEdit}>
          Edit
        </button>
        <button
          onClick={() => {
            window.print();
          }}
        >
          Print Statement
        </button>
      </div>
      <div className="profile-stats">
        <Metric label="Outstanding" value={money(customer.outstandingBalanceMinor)} />
        <Metric label="Credit Limit" value={money(customer.creditLimitMinor)} />
        <Metric label="Status" value={customer.status} />
      </div>
      <div className="inventory-tabs">
        {(["overview", "statement", "payments", "notes", "activity"] as const).map((item) => (
          <button
            className={tab === item ? "active" : ""}
            key={item}
            onClick={() => {
              setTab(item);
            }}
          >
            {item === "statement" ? "account book" : item}
          </button>
        ))}
      </div>
      {tab === "overview" ? (
        <section className="detail-section">
          <Detail label="Customer Type" value={customer.customerType} />
          <Detail label="Email" value={customer.email ?? "-"} />
          <Detail label="CNIC" value={customer.cnic ?? "-"} />
          <Detail label="Tags" value={customer.tags.join(", ") || "-"} />
          <Detail label="Opening Balance" value={money(customer.openingBalanceMinor)} />
        </section>
      ) : null}
      {tab === "statement" || tab === "payments" ? (
        <section className="statement-panel">
          <div className="filters">
            <input
              placeholder="Search statement"
              value={statementQuery.search ?? ""}
              onChange={(event) => {
                setStatementQuery({ ...statementQuery, search: event.target.value, page: 1 });
              }}
            />
            <select
              value={statementQuery.transactionType}
              onChange={(event) => {
                setStatementQuery({
                  ...statementQuery,
                  transactionType: event.target.value as NonNullable<
                    CustomerStatementRequest["transactionType"]
                  >,
                  page: 1
                });
              }}
            >
              <option value="all">All</option>
              <option value="opening-balance">Opening Balance</option>
              <option value="payment">Payments</option>
              <option value="sale">Sales</option>
            </select>
          </div>
          <div className="statement-summary">
            <span>Opening {money(statement?.openingBalanceMinor ?? 0)}</span>
            <strong>
              Closing {money(statement?.closingBalanceMinor ?? customer.outstandingBalanceMinor)}
            </strong>
            <span>
              Generated{" "}
              {statement === null ? "-" : new Date(statement.generatedAt).toLocaleString("en-PK")}
            </span>
          </div>
          <table className="statement-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Description</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Running Balance</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {statement?.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="state-cell">
                    No account-book entries yet.
                  </td>
                </tr>
              ) : (
                statement?.items.map((line) => (
                  <tr key={line.id}>
                    <td>{new Date(line.date).toLocaleDateString("en-PK")}</td>
                    <td>{line.reference}</td>
                    <td>{line.description}</td>
                    <td>{line.debitMinor === 0 ? "-" : money(line.debitMinor)}</td>
                    <td>{line.creditMinor === 0 ? "-" : money(line.creditMinor)}</td>
                    <td>{money(line.runningBalanceMinor)}</td>
                    <td>{line.userName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      ) : null}
      {tab === "notes" ? (
        <p className="muted-text">{customer.notes ?? "No notes recorded."}</p>
      ) : null}
      {tab === "activity" ? (
        activity.length === 0 ? (
          <EmptyState
            title="No customer activity"
            description="Customer changes, payments, and statement actions will appear here."
          />
        ) : (
          <div className="activity-list">
            {activity.map((item) => (
              <div className="activity-item" key={item.id}>
                <strong>{item.action}</strong>
                <span>{new Date(item.occurredAt).toLocaleString("en-PK")}</span>
                <p>{item.details}</p>
              </div>
            ))}
          </div>
        )
      ) : null}
    </aside>
  </div>
);

const initials = (name: string): string =>
  name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const paymentFormFor = (
  customer: CustomerListItemDto | CustomerDetailDto
): CustomerPaymentFormState => ({
  customerId: customer.id,
  amount: fromMinor(Math.max(0, customer.outstandingBalanceMinor)),
  paymentMethod: "cash",
  paidAt: new Date().toISOString().slice(0, 16),
  referenceNumber: "",
  receiptNumber: "",
  notes: ""
});

const PosModule = ({
  context,
  permissions,
  settings,
  showToast
}: {
  readonly context: AppContextDto | null;
  readonly permissions: readonly AppContextDto["permissions"][number][];
  readonly settings: AppSettingsDto | null;
  readonly showToast: (message: string, tone?: ToastState["tone"]) => void;
}) => {
  const [products, setProducts] = useState<readonly ProductListItemDto[]>([]);
  const [customers, setCustomers] = useState<readonly CustomerListItemDto[]>([]);
  const [cashRegister, setCashRegister] = useState<CashRegisterDto | null>(null);
  const [salesDashboard, setSalesDashboard] = useState<SalesDashboardDto | null>(null);
  const [form, setForm] = useState<SaleFormState>(emptySaleForm);
  const [search, setSearch] = useState("");
  const [barcode, setBarcode] = useState("");
  const [receipt, setReceipt] = useState<ReceiptDto | null>(null);
  const [heldSales, setHeldSales] = useState<readonly SaleListItemDto[]>([]);
  const [showHeld, setShowHeld] = useState(false);
  const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
  const [saleProcessing, setSaleProcessing] = useState<"complete" | "hold" | "cancel-held" | null>(
    null
  );
  const [lastSaleError, setLastSaleError] = useState<string | null>(null);
  const [printStatus, setPrintStatus] = useState<"idle" | "sent">("idle");
  const canCreate = permissions.includes("sales.create");
  const canComplete = permissions.includes("sales.complete");
  const canCancel = permissions.includes("sales.cancel");
  const canPrint = permissions.includes("sales.print");

  const loadPosData = useCallback(async () => {
    const [productsResponse, customersResponse, cashResponse, salesResponse, heldResponse] =
      await Promise.all([
        window.orix.products.list({
          page: 1,
          pageSize: 500,
          sortBy: "name",
          sortDirection: "asc",
          status: "active"
        }),
        window.orix.customers.list({
          page: 1,
          pageSize: 500,
          sortBy: "name",
          sortDirection: "asc",
          status: "active",
          customerType: "all"
        }),
        window.orix.cashRegister.summary(),
        window.orix.sales.dashboard(),
        window.orix.sales.list({
          page: 1,
          pageSize: 20,
          sortBy: "createdAt",
          sortDirection: "desc",
          status: "held"
        })
      ]);
    if (productsResponse.ok) setProducts(productsResponse.value.items);
    if (customersResponse.ok) setCustomers(customersResponse.value.items);
    if (cashResponse.ok) setCashRegister(cashResponse.value);
    if (salesResponse.ok) setSalesDashboard(salesResponse.value);
    if (heldResponse.ok) setHeldSales(heldResponse.value.items);
  }, []);

  useEffect(() => {
    void loadPosData();
  }, [loadPosData]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setForm(emptySaleForm);
      }
      if (event.ctrlKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        document.getElementById("pos-search")?.focus();
      }
      if (event.ctrlKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        document.getElementById("pos-barcode")?.focus();
      }
      if (event.key === "F2") {
        event.preventDefault();
        document.getElementById("pos-customer")?.focus();
      }
      if (event.key === "F4") {
        event.preventDefault();
        void holdSale();
      }
      if (event.key === "F5") {
        event.preventDefault();
        setShowHeld(true);
      }
      if (event.key === "F8") {
        event.preventDefault();
        setShowCompleteConfirm(true);
      }
      if (event.ctrlKey && event.key.toLowerCase() === "p" && receipt !== null) {
        event.preventDefault();
        setPrintStatus("sent");
        window.print();
      }
      if (event.key === "Escape") {
        setReceipt(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  });

  const searchTerm = search.trim().toLowerCase();
  const searchResults =
    searchTerm.length < 2
      ? []
      : products
          .filter((product) => {
            const term = search.trim().toLowerCase();
            return (
              product.name.toLowerCase().includes(term) ||
              (product.barcode ?? "").toLowerCase().includes(term) ||
              (product.categoryName ?? "").toLowerCase().includes(term) ||
              (product.brandName ?? "").toLowerCase().includes(term)
            );
          })
          .slice(0, 8);

  const addProduct = (product: ProductListItemDto) => {
    if (product.archivedAt !== null || product.status !== "active") {
      showToast("Product is not active.", "error");
      return;
    }
    const existing = form.items.find((item) => item.productId === product.id);
    if (existing !== undefined) {
      updateCartQuantity(product.id, existing.quantity + 1);
      setSearch("");
      return;
    }
    setForm({
      ...form,
      items: [
        ...form.items,
        {
          productId: product.id,
          productName: product.name,
          barcode: product.barcode,
          unitId: product.unitId,
          quantity: 1,
          unitPriceMinor: product.salePriceMinor,
          discountMinor: 0,
          taxMinor: 0,
          currentStock: product.currentStock
        }
      ]
    });
    setSearch("");
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    setForm({
      ...form,
      items: form.items
        .map((item) =>
          item.productId === productId ? { ...item, quantity: Math.max(1, quantity) } : item
        )
        .filter((item) => item.quantity > 0)
    });
  };

  const scanBarcode = () => {
    const product = products.find((item) => item.barcode === barcode.trim());
    if (product === undefined) {
      showToast("No product found for this barcode.", "error");
      return;
    }
    addProduct(product);
    setBarcode("");
  };

  const updateBarcode = (value: string) => {
    setBarcode(value);
    const product = products.find((item) => item.barcode === value.trim());
    if (product !== undefined) {
      addProduct(product);
      setBarcode("");
    }
  };

  const toSalePayload = (): SaleWritePayload => ({
    customerId: form.customerId || null,
    saleNumber: form.saleNumber || null,
    saleDate: form.saleDate,
    paymentType: form.paymentType,
    discountMinor: toMinor(form.discount),
    taxMinor: toMinor(form.tax),
    cashReceivedMinor: toMinor(form.cashReceived),
    notes: form.notes || null,
    holdReason: form.holdReason || null,
    items: form.items.map((item): SaleItemPayload => ({
      productId: item.productId,
      unitId: item.unitId,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      discountMinor: item.discountMinor,
      taxMinor: item.taxMinor
    })),
    ...(form.id === undefined ? {} : { id: form.id }),
    ...(form.expectedUpdatedAt === undefined ? {} : { expectedUpdatedAt: form.expectedUpdatedAt })
  });

  const holdSale = async () => {
    if (!canCreate) return;
    if (form.items.length === 0) {
      showToast("Add at least one item before holding a sale.", "error");
      return;
    }
    setSaleProcessing("hold");
    const response = await window.orix.sales.hold({
      ...toSalePayload(),
      holdReason: form.holdReason || "Held from POS"
    });
    if (response.ok) {
      showToast("Sale held.");
      setForm(emptySaleForm);
      setLastSaleError(null);
      await loadPosData();
    } else {
      const message = posSaleErrorMessage(response.error.message, response.error.fields);
      setLastSaleError(message);
      showToast(message, "error");
    }
    setSaleProcessing(null);
  };

  const completeSale = async () => {
    if (!canComplete) return;
    const blockingMessage = posBlockingMessage(form, totals.totalMinor);
    if (blockingMessage !== null) {
      setLastSaleError(blockingMessage);
      showToast(blockingMessage, "error");
      return;
    }
    setSaleProcessing("complete");
    setShowCompleteConfirm(false);
    const response = await window.orix.sales.complete(toSalePayload());
    if (response.ok) {
      setReceipt(response.value.receipt);
      setForm(emptySaleForm);
      setLastSaleError(null);
      setPrintStatus("idle");
      showToast("Sale completed.");
      await loadPosData();
    } else {
      const message = posSaleErrorMessage(response.error.message, response.error.fields);
      setLastSaleError(message);
      showToast(message, "error");
    }
    setSaleProcessing(null);
  };

  const resumeSale = async (sale: SaleListItemDto) => {
    const response = await window.orix.sales.get(sale.id);
    if (!response.ok || response.value === undefined) {
      showToast(response.ok ? "Held sale was not found." : response.error.message, "error");
      return;
    }
    const detail = response.value;
    setForm({
      id: detail.id,
      customerId: detail.customerId ?? "",
      saleNumber: detail.saleNumber,
      saleDate: detail.saleDate.slice(0, 16),
      paymentType: detail.paymentType,
      discount: fromMinor(detail.discountMinor),
      tax: fromMinor(detail.taxMinor),
      cashReceived: fromMinor(detail.paidMinor),
      notes: detail.notes ?? "",
      holdReason: detail.holdReason ?? "",
      items: detail.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        barcode: item.barcode,
        unitId: item.unitId,
        quantity: item.quantity,
        unitPriceMinor: item.unitPriceMinor,
        discountMinor: item.discountMinor,
        taxMinor: item.taxMinor,
        currentStock: products.find((product) => product.id === item.productId)?.currentStock ?? 0
      })),
      expectedUpdatedAt: detail.updatedAt
    });
    setShowHeld(false);
  };

  const cancelHeldSale = async (sale: SaleListItemDto) => {
    if (!canCancel) return;
    setSaleProcessing("cancel-held");
    const response = await window.orix.sales.cancel(sale.id, "Cancelled from POS");
    if (response.ok) {
      showToast("Held sale deleted.");
      await loadPosData();
    } else {
      showToast(response.error.message, "error");
    }
    setSaleProcessing(null);
  };

  const totals = saleTotals(form);
  const change = Math.max(0, toMinor(form.cashReceived) - totals.totalMinor);
  const creditBalance =
    form.paymentType === "credit"
      ? totals.totalMinor
      : form.paymentType === "mixed"
        ? Math.max(0, totals.totalMinor - toMinor(form.cashReceived))
        : 0;
  const selectedCustomer = customers.find((customer) => customer.id === form.customerId);
  const blockingMessage = posBlockingMessage(form, totals.totalMinor);

  return (
    <section className="pos-module">
      <div className="pos-left">
        <div className="pos-register-head card">
          <div className="pos-register-title">
            <span className="pos-register-icon">
              <Icon name="cash" />
            </span>
            <div>
              <p className="eyebrow">Sell</p>
              <h1>Checkout</h1>
            </div>
          </div>
          <div className="pos-toolbar">
            <label className="pos-input-shell pos-search-shell">
              <Icon name="search" />
              <input
                id="pos-search"
                placeholder="Search item name, barcode, category, brand"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                }}
              />
              {searchTerm.length >= 2 ? (
                <div className="pos-search-dropdown">
                  {searchResults.length === 0 ? (
                    <div className="pos-search-empty">No matching items</div>
                  ) : (
                    searchResults.map((product) => (
                      <button
                        className="pos-result-item"
                        key={product.id}
                        onClick={() => {
                          addProduct(product);
                        }}
                      >
                        <span className="product-image-placeholder">
                          <Icon name="package" />
                        </span>
                        <span>
                          <strong>{product.name}</strong>
                          <small>
                            {product.barcode ?? "No barcode"} · Stock {product.currentStock}
                          </small>
                        </span>
                        <strong>{money(product.salePriceMinor)}</strong>
                        <Icon name="plus" />
                      </button>
                    ))
                  )}
                </div>
              ) : null}
            </label>
            <label className="pos-input-shell barcode-entry">
              <Icon name="barcode" />
              <input
                id="pos-barcode"
                placeholder="Scan barcode"
                value={barcode}
                onChange={(event) => {
                  updateBarcode(event.target.value);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") scanBarcode();
                }}
              />
              <button className="icon-button" aria-label="Add scanned item" onClick={scanBarcode}>
                <Icon name="plus" />
              </button>
            </label>
          </div>
          <div className="pos-quick-stats">
            <span>{form.items.length} items in cart</span>
            <span>
              {searchTerm.length < 2
                ? "Type 2 letters to search"
                : `${String(searchResults.length)} matches`}
            </span>
            <span>Cash {money(cashRegister?.expectedCashMinor ?? 0)}</span>
          </div>
        </div>
        <div className="cart-panel card">
          <div className="section-title">
            <h2>
              <Icon name="cart" />
              Cart
              <span className="pill muted">{form.items.length} items</span>
            </h2>
            <button
              className="icon-button"
              aria-label="Start new sale"
              onClick={() => {
                setForm(emptySaleForm);
              }}
            >
              <Icon name="refresh" />
            </button>
          </div>
          {form.items.length === 0 ? (
            <EmptyState
              title="Cart is empty"
              description="Scan a barcode or search and select an item above."
            />
          ) : (
            <div className="cart-lines">
              <div className="cart-line cart-line-head">
                <span>Item</span>
                <span>Qty</span>
                <span>Total</span>
                <span />
              </div>
              {form.items.map((item) => (
                <div className="cart-line" key={item.productId}>
                  <div className="cart-item-info">
                    <strong>{item.productName}</strong>
                    <small>{item.barcode ?? "Manual item"}</small>
                  </div>
                  <div className="quantity-control">
                    <button
                      className="icon-button"
                      aria-label={`Decrease ${item.productName}`}
                      onClick={() => {
                        updateCartQuantity(item.productId, item.quantity - 1);
                      }}
                    >
                      -
                    </button>
                    <input
                      aria-label={`${item.productName} quantity`}
                      value={String(item.quantity)}
                      onChange={(event) => {
                        updateCartQuantity(item.productId, Number(event.target.value || "1"));
                      }}
                    />
                    <button
                      className="icon-button"
                      aria-label={`Increase ${item.productName}`}
                      onClick={() => {
                        updateCartQuantity(item.productId, item.quantity + 1);
                      }}
                    >
                      <Icon name="plus" />
                    </button>
                  </div>
                  <strong className="cart-line-total">
                    {money(item.quantity * item.unitPriceMinor)}
                  </strong>
                  <button
                    className="icon-button danger"
                    aria-label={`Remove ${item.productName}`}
                    onClick={() => {
                      setForm({
                        ...form,
                        items: form.items.filter((line) => line.productId !== item.productId)
                      });
                    }}
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <aside className="pos-right">
        <div className="card pos-card pos-customer-card">
          <h2>
            <Icon name="user" />
            Customer
          </h2>
          <select
            id="pos-customer"
            value={form.customerId}
            onChange={(event) => {
              setForm({ ...form, customerId: event.target.value });
            }}
          >
            <option value="">Walk-in Customer</option>
            {customers.map((customer) => (
              <option value={customer.id} key={customer.id}>
                {customer.name} {customer.phone === null ? "" : `· ${customer.phone}`}
              </option>
            ))}
          </select>
        </div>
        <div className="card pos-card totals-card">
          <div className="pos-total-banner">
            <span>Total to pay</span>
            <strong>{money(totals.totalMinor)}</strong>
          </div>
          <div className="pos-payment-grid">
            <Detail label="Subtotal" value={money(totals.subtotalMinor)} />
            <label>
              Discount
              <input
                value={form.discount}
                onChange={(event) => {
                  setForm({ ...form, discount: event.target.value });
                }}
              />
            </label>
            <label>
              Tax
              <input
                value={form.tax}
                onChange={(event) => {
                  setForm({ ...form, tax: event.target.value });
                }}
              />
            </label>
          </div>
          <label>
            Payment
            <select
              value={form.paymentType}
              onChange={(event) => {
                setForm({ ...form, paymentType: event.target.value as SalePaymentType });
              }}
            >
              <option value="cash">Cash</option>
              <option value="credit">Credit</option>
              <option value="mixed">Cash + Credit</option>
            </select>
          </label>
          <label>
            Cash received
            <input
              value={form.cashReceived}
              onChange={(event) => {
                setForm({ ...form, cashReceived: event.target.value });
              }}
            />
          </label>
          <div className="cash-shortcuts">
            {[
              ["Exact", totals.totalMinor],
              ["+100", totals.totalMinor + 10000],
              ["+500", totals.totalMinor + 50000],
              ["+1000", totals.totalMinor + 100000]
            ].map(([label, amount]) => (
              <button
                key={label}
                onClick={() => {
                  setForm({ ...form, cashReceived: fromMinor(Number(amount)) });
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="pos-change-row">
            <Detail label="Change" value={money(change)} />
            <Detail label="Credit" value={money(creditBalance)} />
          </div>
          {blockingMessage === null && lastSaleError === null ? (
            <div className="pos-ready-note">
              <Icon name="receipt" />
              Ready for checkout
            </div>
          ) : (
            <div className="pos-warning-note">{blockingMessage ?? lastSaleError}</div>
          )}
          <textarea
            placeholder="Sale notes"
            value={form.notes}
            onChange={(event) => {
              setForm({ ...form, notes: event.target.value });
            }}
          />
          <div className="pos-actions">
            <button
              disabled={!canCreate || saleProcessing !== null}
              onClick={() => void holdSale()}
            >
              <Icon name="pause" />
              {saleProcessing === "hold" ? "Holding" : "Hold"}
            </button>
            <button
              disabled={saleProcessing !== null}
              onClick={() => {
                setShowHeld(true);
              }}
            >
              <Icon name="play" />
              Held {heldSales.length > 0 ? `(${String(heldSales.length)})` : ""}
            </button>
            <button
              className="primary"
              disabled={!canComplete || saleProcessing !== null || blockingMessage !== null}
              onClick={() => {
                setShowCompleteConfirm(true);
              }}
            >
              <Icon name="receipt" />
              {saleProcessing === "complete" ? "Completing" : "Complete Sale"}
            </button>
          </div>
        </div>
        <div className="pos-insight-strip">
          <div>
            <Icon name="cash" />
            <span>Cash Drawer</span>
            <strong>{money(cashRegister?.expectedCashMinor ?? 0)}</strong>
          </div>
          <div>
            <Icon name="clock" />
            <span>Sales Today</span>
            <strong>{salesDashboard?.salesCount ?? 0}</strong>
          </div>
        </div>
      </aside>
      <footer className="shortcut-bar">
        F8 Complete · F4 Hold · F5 Held Sales · F2 Customer · Ctrl+B Barcode · Ctrl+F Search
      </footer>
      {showCompleteConfirm ? (
        <div className="modal-backdrop">
          <section className="modal sale-confirm-modal">
            <header>
              <div>
                <p className="eyebrow">Confirm sale</p>
                <h2>Complete this checkout?</h2>
              </div>
              <button
                className="icon-button"
                aria-label="Close confirmation"
                onClick={() => {
                  setShowCompleteConfirm(false);
                }}
              >
                ×
              </button>
            </header>
            <div className="sale-confirm-total">
              <span>Total to collect</span>
              <strong>{money(totals.totalMinor)}</strong>
            </div>
            <div className="sale-confirm-grid">
              <Detail label="Customer" value={selectedCustomer?.name ?? "Walk-in Customer"} />
              <Detail label="Payment" value={form.paymentType} />
              <Detail label="Items" value={String(form.items.length)} />
              <Detail label="Cash received" value={money(toMinor(form.cashReceived))} />
              <Detail label="Change" value={money(change)} />
              <Detail label="Credit" value={money(creditBalance)} />
            </div>
            <div className="sale-confirm-lines">
              {form.items.slice(0, 5).map((item) => (
                <div key={item.productId}>
                  <span>{item.productName}</span>
                  <strong>
                    {item.quantity} × {money(item.unitPriceMinor)}
                  </strong>
                </div>
              ))}
              {form.items.length > 5 ? <small>+{form.items.length - 5} more items</small> : null}
            </div>
            <footer>
              <button
                onClick={() => {
                  setShowCompleteConfirm(false);
                }}
              >
                Review Sale
              </button>
              <button
                className="primary"
                disabled={saleProcessing !== null || blockingMessage !== null}
                onClick={() => void completeSale()}
              >
                <Icon name="receipt" />
                {saleProcessing === "complete" ? "Saving Sale" : "Confirm Sale"}
              </button>
            </footer>
          </section>
        </div>
      ) : null}
      {showHeld ? (
        <div className="modal-backdrop">
          <section className="modal customer-modal">
            <header>
              <h2>Held Sales</h2>
              <button
                onClick={() => {
                  setShowHeld(false);
                }}
              >
                Close
              </button>
            </header>
            <div className="activity-list">
              {heldSales.length === 0 ? (
                <EmptyState
                  title="No held sales"
                  description="Held carts appear here for quick resume."
                />
              ) : (
                heldSales.map((sale) => (
                  <div className="held-sale-row" key={sale.id}>
                    <div>
                      <strong>{sale.saleNumber}</strong>
                      <span>{sale.customerName ?? "Walk-in Customer"}</span>
                      <small>
                        {sale.itemCount} items · {new Date(sale.saleDate).toLocaleString("en-PK")}
                      </small>
                    </div>
                    <strong>{money(sale.totalMinor)}</strong>
                    <button
                      disabled={saleProcessing !== null}
                      onClick={() => void resumeSale(sale)}
                    >
                      Resume
                    </button>
                    <button
                      disabled={!canCancel || saleProcessing !== null}
                      onClick={() => void cancelHeldSale(sale)}
                    >
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      ) : null}
      {receipt === null ? null : (
        <ReceiptPreview
          context={context}
          receipt={receipt}
          settings={settings}
          canPrint={canPrint}
          printStatus={printStatus}
          onPrint={() => {
            setPrintStatus("sent");
          }}
          onClose={() => {
            setReceipt(null);
            setPrintStatus("idle");
          }}
        />
      )}
    </section>
  );
};

const ReceiptPreview = ({
  context,
  receipt,
  settings,
  canPrint,
  printStatus,
  onPrint,
  onClose
}: {
  readonly context: AppContextDto | null;
  readonly receipt: ReceiptDto;
  readonly settings: AppSettingsDto | null;
  readonly canPrint: boolean;
  readonly printStatus: "idle" | "sent";
  readonly onPrint: () => void;
  readonly onClose: () => void;
}) => {
  const configuredHeader = settings?.receiptHeader.trim();
  const configuredFooter = settings?.receiptFooter.trim();
  const configuredStoreName = settings?.storeDisplayName.trim();
  const header =
    configuredHeader !== undefined && configuredHeader.length > 0
      ? configuredHeader
      : configuredStoreName !== undefined && configuredStoreName.length > 0
        ? configuredStoreName
        : context?.storeName !== undefined && context.storeName.length > 0
          ? context.storeName
          : "Orix Retail OS";
  const storeName =
    configuredStoreName !== undefined && configuredStoreName.length > 0
      ? configuredStoreName
      : context?.storeName;
  const footer =
    configuredFooter !== undefined && configuredFooter.length > 0
      ? configuredFooter
      : "Thank you for shopping with us.";
  const contactLine = [context?.storePhone, context?.storeEmail].filter(
    (value): value is string => value !== null && value !== undefined && value.trim().length > 0
  );

  return (
    <div className="modal-backdrop">
      <section className="modal receipt-modal">
        <header>
          <div>
            <p className="eyebrow">Sale completed</p>
            <h2>Receipt Preview</h2>
          </div>
          <button className="icon-button" aria-label="Close receipt" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="receipt-success">
          <Icon name="receipt" />
          <span>
            {printStatus === "sent" ? "Receipt sent to system printer" : "Sale saved successfully"}
          </span>
          <strong>{money(receipt.totalMinor)}</strong>
        </div>
        <div className="receipt-paper">
          <div className="receipt-center receipt-brand">
            <strong>{header}</strong>
            {storeName === undefined || storeName === header ? null : <span>{storeName}</span>}
            {context?.storeAddress === null || context?.storeAddress === undefined ? null : (
              <span>{context.storeAddress}</span>
            )}
            {contactLine.length === 0 ? null : <span>{contactLine.join(" | ")}</span>}
            <span>{context?.currentBranch ?? "Main Branch"}</span>
          </div>
          <div className="receipt-meta">
            <ReceiptDetail label="Invoice" value={receipt.saleNumber} />
            <ReceiptDetail
              label="Date"
              value={new Date(receipt.saleDate).toLocaleString("en-PK")}
            />
            <ReceiptDetail label="Cashier" value={receipt.cashierName} />
            <ReceiptDetail label="Customer" value={receipt.customerName} />
          </div>
          <table className="receipt-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item) => (
                <tr key={item.name}>
                  <td>{item.name}</td>
                  <td>{item.quantity}</td>
                  <td>{money(item.unitPriceMinor)}</td>
                  <td>{money(item.lineTotalMinor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="receipt-totals">
            <ReceiptDetail label="Subtotal" value={money(receipt.subtotalMinor)} />
            <ReceiptDetail label="Discount" value={money(receipt.discountMinor)} />
            <ReceiptDetail label="Total" value={money(receipt.totalMinor)} strong />
            <ReceiptDetail label="Paid" value={money(receipt.paidMinor)} />
            <ReceiptDetail label="Change" value={money(receipt.changeDueMinor)} />
            <ReceiptDetail label="Payment" value={receipt.paymentType} />
          </div>
          <div className="receipt-center receipt-footer">
            <span>{footer}</span>
            <strong>Powered by ORIX TECH</strong>
            <small>Retail software for modern shops</small>
          </div>
        </div>
        <footer>
          <button onClick={onClose}>New Sale</button>
          <button
            className="primary"
            disabled={!canPrint}
            onClick={() => {
              onPrint();
              window.print();
            }}
          >
            <Icon name="receipt" />
            {printStatus === "sent" ? "Print Again" : "Print Receipt"}
          </button>
        </footer>
      </section>
    </div>
  );
};

const ReceiptDetail = ({
  label,
  value,
  strong = false
}: {
  readonly label: string;
  readonly value: string;
  readonly strong?: boolean;
}) => (
  <div className={`receipt-detail ${strong ? "strong" : ""}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const SalesModule = ({
  context,
  permissions,
  settings,
  showToast
}: {
  readonly context: AppContextDto | null;
  readonly permissions: readonly AppContextDto["permissions"][number][];
  readonly settings: AppSettingsDto | null;
  readonly showToast: (message: string, tone?: ToastState["tone"]) => void;
}) => {
  const [sales, setSales] = useState<readonly SaleListItemDto[]>([]);
  const [query, setQuery] = useState<SaleListRequest>({
    page: 1,
    pageSize: 14,
    sortBy: "saleDate",
    sortDirection: "desc",
    status: "all"
  });
  const [totalItems, setTotalItems] = useState(0);
  const [detail, setDetail] = useState<SaleDetailDto | null>(null);
  const [receipt, setReceipt] = useState<ReceiptDto | null>(null);
  const canPrint = permissions.includes("sales.print");
  const canReturn = permissions.includes("sales.return");
  const [returnForm, setReturnForm] = useState<SaleReturnFormState | null>(null);
  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));

  const loadSales = useCallback(async () => {
    const response = await window.orix.sales.list(query);
    if (response.ok) {
      setSales(response.value.items);
      setTotalItems(response.value.totalItems);
    } else {
      showToast(response.error.message, "error");
    }
  }, [query, showToast]);

  useEffect(() => {
    void loadSales();
  }, [loadSales]);

  const loadDetail = async (id: string) => {
    const response = await window.orix.sales.get(id);
    if (response.ok && response.value !== undefined) setDetail(response.value);
    else showToast(response.ok ? "Sale was not found." : response.error.message, "error");
  };

  const reprint = async (id: string) => {
    const response = await window.orix.sales.receipt(id);
    if (response.ok) setReceipt(response.value);
    else showToast(response.error.message, "error");
  };

  const openReturn = async (id: string) => {
    const response = await window.orix.sales.get(id);
    if (!response.ok || response.value === undefined) {
      showToast(response.ok ? "Sale was not found." : response.error.message, "error");
      return;
    }
    const sale = response.value;
    setReturnForm({
      sale,
      reason: "",
      refundMethod: sale.customerId === null ? "cash" : "customer-credit",
      quantities: Object.fromEntries(
        sale.items
          .filter((item) => item.quantity - item.returnedQuantity > 0)
          .map((item) => [item.id, "0"])
      ),
      conditions: Object.fromEntries(sale.items.map((item) => [item.id, "sellable"]))
    });
  };

  const submitReturn = async () => {
    if (returnForm === null) return;
    const items = returnForm.sale.items
      .map((item) => ({
        saleItemId: item.id,
        quantity: Number(returnForm.quantities[item.id] ?? "0"),
        condition: returnForm.conditions[item.id] ?? "sellable"
      }))
      .filter((item) => item.quantity > 0);
    const payload: SaleReturnPayload = {
      saleId: returnForm.sale.id,
      reason: returnForm.reason,
      refundMethod: returnForm.refundMethod,
      items
    };
    const response = await window.orix.sales.returnSale(payload);
    if (response.ok) {
      setReturnForm(null);
      showToast(`Return ${response.value.return.returnNumber} posted.`);
      await loadSales();
      await loadDetail(returnForm.sale.id);
    } else {
      showToast(response.error.message, "error");
    }
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Sales Register</p>
          <h1>Sales</h1>
        </div>
        <button onClick={() => void loadSales()}>Refresh</button>
      </div>
      <div className="filters customer-filters">
        <input
          placeholder="Search invoice or customer"
          value={query.search ?? ""}
          onChange={(event) => {
            setQuery({ ...query, search: event.target.value, page: 1 });
          }}
        />
        <select
          value={query.status}
          onChange={(event) => {
            setQuery({
              ...query,
              status: event.target.value as NonNullable<SaleListRequest["status"]>,
              page: 1
            });
          }}
        >
          <option value="all">All</option>
          <option value="held">Held</option>
          <option value="draft">Draft</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>
      <div className="table-wrap customer-table">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Items</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sales.length === 0 ? (
              <tr>
                <td colSpan={9} className="state-cell">
                  No sales yet.
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr key={sale.id} onDoubleClick={() => void loadDetail(sale.id)}>
                  <td className="strong">{sale.saleNumber}</td>
                  <td>{sale.customerName ?? "Walk-in"}</td>
                  <td>{new Date(sale.saleDate).toLocaleDateString("en-PK")}</td>
                  <td>{sale.itemCount}</td>
                  <td>{money(sale.totalMinor)}</td>
                  <td>{money(sale.paidMinor)}</td>
                  <td>{sale.paymentType}</td>
                  <td>
                    <span
                      className={`pill ${sale.status === "completed" ? "success" : sale.status === "cancelled" ? "danger" : "warning"}`}
                    >
                      {sale.status}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => void loadDetail(sale.id)}>View</button>
                      <button
                        disabled={!canPrint || sale.status !== "completed"}
                        onClick={() => void reprint(sale.id)}
                      >
                        Reprint
                      </button>
                      <button
                        disabled={!canReturn || sale.status !== "completed"}
                        onClick={() => void openReturn(sale.id)}
                      >
                        Return
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={query.page}
        totalPages={totalPages}
        onPage={(page) => {
          setQuery({ ...query, page });
        }}
      />
      {detail === null ? null : (
        <SaleDetailsDrawer
          sale={detail}
          onClose={() => {
            setDetail(null);
          }}
        />
      )}
      {receipt === null ? null : (
        <ReceiptPreview
          context={context}
          receipt={receipt}
          settings={settings}
          canPrint={canPrint}
          printStatus="idle"
          onPrint={noop}
          onClose={() => {
            setReceipt(null);
          }}
        />
      )}
      {returnForm === null ? null : (
        <SaleReturnDialog
          form={returnForm}
          onChange={setReturnForm}
          onClose={() => {
            setReturnForm(null);
          }}
          onSubmit={() => void submitReturn()}
        />
      )}
    </section>
  );
};

const SaleDetailsDrawer = ({
  sale,
  onClose
}: {
  readonly sale: SaleDetailDto;
  readonly onClose: () => void;
}) => (
  <div className="drawer-backdrop">
    <aside className="drawer customer-profile">
      <header>
        <div>
          <p className="eyebrow">Sale Details</p>
          <h2>{sale.saleNumber}</h2>
          <span>{sale.customerName ?? "Walk-in Customer"}</span>
        </div>
        <button onClick={onClose}>Close</button>
      </header>
      <div className="profile-stats">
        <Metric label="Total" value={money(sale.totalMinor)} />
        <Metric label="Paid" value={money(sale.paidMinor)} />
        <Metric label="Status" value={sale.status} />
      </div>
      <section className="detail-section">
        <Detail label="Cashier" value={sale.cashierName} />
        <Detail label="Payment" value={sale.paymentType} />
        <Detail label="Change" value={money(sale.changeDueMinor)} />
        <Detail label="Notes" value={sale.notes ?? "-"} />
      </section>
      <table className="statement-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Qty</th>
            <th>Rate</th>
            <th>Discount</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items.map((item) => (
            <tr key={item.id}>
              <td>{item.productName}</td>
              <td>{item.quantity}</td>
              <td>{money(item.unitPriceMinor)}</td>
              <td>{money(item.discountMinor)}</td>
              <td>{money(item.lineTotalMinor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </aside>
  </div>
);

const SaleReturnDialog = ({
  form,
  onChange,
  onClose,
  onSubmit
}: {
  readonly form: SaleReturnFormState;
  readonly onChange: (form: SaleReturnFormState) => void;
  readonly onClose: () => void;
  readonly onSubmit: () => void;
}) => {
  const selectedItems = form.sale.items
    .map((item) => ({
      item,
      quantity: Number(form.quantities[item.id] ?? "0"),
      condition: form.conditions[item.id] ?? "sellable"
    }))
    .filter((entry) => entry.quantity > 0);
  const totalMinor = selectedItems.reduce(
    (total, entry) => total + entry.quantity * entry.item.unitPriceMinor,
    0
  );
  const canSubmit = form.reason.trim().length >= 3 && totalMinor > 0;
  return (
    <div className="modal-backdrop">
      <section className="modal return-modal">
        <header>
          <div>
            <p className="eyebrow">Sales Return</p>
            <h2>{form.sale.saleNumber}</h2>
            <span>{form.sale.customerName ?? "Walk-in Customer"}</span>
          </div>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="return-summary">
          <Metric label="Refund" value={money(totalMinor)} />
          <label>
            Refund Method
            <select
              value={form.refundMethod}
              onChange={(event) => {
                onChange({
                  ...form,
                  refundMethod: event.target.value as SaleReturnPayload["refundMethod"]
                });
              }}
            >
              <option value="cash">Cash refund</option>
              <option value="customer-credit" disabled={form.sale.customerId === null}>
                Reduce customer balance
              </option>
            </select>
          </label>
        </div>
        <div className="return-lines">
          {form.sale.items.map((item) => {
            const available = item.quantity - item.returnedQuantity;
            return (
              <div className="return-line" key={item.id}>
                <div>
                  <strong>{item.productName}</strong>
                  <span>
                    Sold {item.quantity} · Returned {item.returnedQuantity} · Available {available}
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={available}
                  value={form.quantities[item.id] ?? "0"}
                  disabled={available <= 0}
                  onChange={(event) => {
                    onChange({
                      ...form,
                      quantities: { ...form.quantities, [item.id]: event.target.value }
                    });
                  }}
                />
                <select
                  value={form.conditions[item.id] ?? "sellable"}
                  disabled={available <= 0}
                  onChange={(event) => {
                    onChange({
                      ...form,
                      conditions: {
                        ...form.conditions,
                        [item.id]: event.target.value as SaleReturnCondition
                      }
                    });
                  }}
                >
                  <option value="sellable">Return to stock</option>
                  <option value="damaged">Do not restock</option>
                </select>
              </div>
            );
          })}
        </div>
        <label>
          Reason *
          <textarea
            value={form.reason}
            placeholder="Example: Customer returned damaged item"
            onChange={(event) => {
              onChange({ ...form, reason: event.target.value });
            }}
          />
        </label>
        <footer>
          <button onClick={onClose}>Back</button>
          <button className="primary" disabled={!canSubmit} onClick={onSubmit}>
            Post Return
          </button>
        </footer>
      </section>
    </div>
  );
};

const saleTotals = (
  form: SaleFormState
): { readonly subtotalMinor: number; readonly totalMinor: number } => {
  const subtotalMinor = form.items.reduce(
    (total, item) =>
      total + item.quantity * item.unitPriceMinor - item.discountMinor + item.taxMinor,
    0
  );
  return {
    subtotalMinor,
    totalMinor: subtotalMinor - toMinor(form.discount) + toMinor(form.tax)
  };
};

const posBlockingMessage = (form: SaleFormState, totalMinor: number): string | null => {
  const cashReceivedMinor = toMinor(form.cashReceived);
  if (form.items.length === 0) return "Scan or search an item to start checkout.";
  if (totalMinor <= 0) return "Sale total must be greater than zero.";
  if (Number.isNaN(cashReceivedMinor) || cashReceivedMinor < 0) {
    return "Enter a valid cash received amount.";
  }
  if (form.paymentType === "cash" && cashReceivedMinor < totalMinor) {
    return `Cash received is short by ${money(totalMinor - cashReceivedMinor)}.`;
  }
  if (form.paymentType === "credit" && form.customerId.trim() === "") {
    return "Select a customer before completing a credit sale.";
  }
  if (form.paymentType === "mixed") {
    if (form.customerId.trim() === "") {
      return "Select a customer before completing a cash + credit sale.";
    }
    if (cashReceivedMinor <= 0) return "Enter the cash portion for this mixed payment.";
    if (cashReceivedMinor >= totalMinor) {
      return "For full cash payment, choose Cash instead of Cash + Credit.";
    }
  }
  const overstocked = form.items.find((item) => item.currentStock < item.quantity);
  if (overstocked !== undefined) {
    return `${overstocked.productName} has only ${String(overstocked.currentStock)} in stock.`;
  }
  return null;
};

const posSaleErrorMessage = (message: string, fields: readonly string[] | undefined): string => {
  if (fields?.includes("cashReceivedMinor")) {
    return "Check the cash received amount before completing this sale.";
  }
  if (fields?.includes("customerId")) {
    return "Select a customer for credit or mixed payment.";
  }
  if (fields?.includes("items")) {
    return "Add at least one item before completing this sale.";
  }
  if (message.toLowerCase().includes("insufficient stock")) {
    return `${message} Adjust quantity or update stock before completing.`;
  }
  return message;
};

const SupplierModule = ({
  permissions,
  showToast
}: {
  readonly permissions: readonly AppContextDto["permissions"][number][];
  readonly showToast: (message: string, tone?: ToastState["tone"]) => void;
}) => {
  const [suppliers, setSuppliers] = useState<readonly SupplierListItemDto[]>([]);
  const [query, setQuery] = useState<SupplierListRequest>({
    page: 1,
    pageSize: 12,
    sortBy: "name",
    sortDirection: "asc",
    status: "active"
  });
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<SupplierFormState | null>(null);
  const [profile, setProfile] = useState<SupplierDetailDto | null>(null);
  const [statement, setStatement] = useState<SupplierStatementDto | null>(null);
  const [activity, setActivity] = useState<readonly SupplierActivityDto[]>([]);
  const [paymentForm, setPaymentForm] = useState<SupplierPaymentFormState | null>(null);
  const [tab, setTab] = useState<"overview" | "statement" | "payments" | "purchases" | "activity">(
    "overview"
  );
  const [statementQuery, setStatementQuery] = useState<
    Omit<SupplierStatementRequest, "supplierId">
  >({
    page: 1,
    pageSize: 30,
    transactionType: "all"
  });
  const canCreate = permissions.includes("suppliers.create");
  const canEdit = permissions.includes("suppliers.edit");
  const canDelete = permissions.includes("suppliers.delete");
  const canPay = permissions.includes("suppliers.payments");
  const canExport = permissions.includes("suppliers.export");
  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));

  const loadSuppliers = useCallback(async () => {
    setLoading(true);
    const response = await window.orix.suppliers.list(query);
    if (response.ok) {
      setSuppliers(response.value.items);
      setTotalItems(response.value.totalItems);
    } else {
      showToast(response.error.message, "error");
    }
    setLoading(false);
  }, [query, showToast]);

  const loadProfile = useCallback(
    async (id: string) => {
      const response = await window.orix.suppliers.get(id);
      if (response.ok && response.value !== undefined) {
        setProfile(response.value);
        const activityResponse = await window.orix.suppliers.activity(id);
        setActivity(activityResponse.ok ? activityResponse.value.items : []);
      } else {
        showToast(response.ok ? "Supplier was not found." : response.error.message, "error");
      }
    },
    [showToast]
  );

  const loadStatement = useCallback(async () => {
    if (profile === null) return;
    const response = await window.orix.suppliers.statement({
      ...statementQuery,
      supplierId: profile.id
    });
    if (response.ok) setStatement(response.value);
    else showToast(response.error.message, "error");
  }, [profile, showToast, statementQuery]);

  useEffect(() => {
    void loadSuppliers();
  }, [loadSuppliers]);

  useEffect(() => {
    if (profile !== null) void loadStatement();
  }, [loadStatement, profile]);

  const saveSupplier = async () => {
    if (form === null) return;
    const validationError = validateSupplierForm(form);
    if (validationError !== null) {
      showToast(validationError, "error");
      return;
    }
    const payload: SupplierWritePayload = {
      name: form.name,
      phone: form.phone || null,
      email: form.email || null,
      address: form.address || null,
      city: form.city || null,
      ntn: form.ntn || null,
      strn: form.strn || null,
      tags: form.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
      creditTerms: form.creditTerms || null,
      openingBalanceMinor: toMinor(form.openingBalance),
      openingBalanceDate: form.openingBalanceDate || null,
      notes: form.notes || null,
      ...(form.id === undefined ? {} : { id: form.id }),
      ...(form.expectedUpdatedAt === undefined ? {} : { expectedUpdatedAt: form.expectedUpdatedAt })
    };
    const response = await window.orix.suppliers.save(payload);
    if (response.ok) {
      setForm(null);
      showToast("Supplier saved.");
      await loadSuppliers();
      setProfile(response.value.supplier);
    } else {
      showToast(response.error.message, "error");
    }
  };

  const recordPayment = async () => {
    if (paymentForm === null) return;
    const validationError = validateSupplierPaymentForm(paymentForm);
    if (validationError !== null) {
      showToast(validationError, "error");
      return;
    }
    const response = await window.orix.suppliers.recordPayment({
      supplierId: paymentForm.supplierId,
      amountMinor: toMinor(paymentForm.amount),
      paymentMethod: paymentForm.paymentMethod,
      paidAt: paymentForm.paidAt,
      referenceNumber: paymentForm.referenceNumber || null,
      receiptNumber: paymentForm.receiptNumber || null,
      notes: paymentForm.notes || null
    });
    if (response.ok) {
      setPaymentForm(null);
      showToast("Supplier payment recorded.");
      await loadSuppliers();
      if (profile !== null) {
        await loadProfile(profile.id);
        await loadStatement();
      }
    } else {
      showToast(response.error.message, "error");
    }
  };

  const editSupplier = (supplier: SupplierDetailDto) => {
    setForm({
      id: supplier.id,
      name: supplier.name,
      phone: supplier.phone ?? "",
      email: supplier.email ?? "",
      address: supplier.address ?? "",
      city: supplier.city ?? "",
      ntn: supplier.ntn ?? "",
      strn: supplier.strn ?? "",
      tags: supplier.tags.join(", "),
      creditTerms: supplier.creditTerms ?? "",
      openingBalance: fromMinor(supplier.openingBalanceMinor),
      openingBalanceDate: supplier.openingBalanceDate?.slice(0, 10) ?? "",
      notes: supplier.notes ?? "",
      expectedUpdatedAt: supplier.updatedAt
    });
  };

  const archiveOrRestore = async (supplier: SupplierListItemDto) => {
    const response =
      supplier.archivedAt === null
        ? await window.orix.suppliers.archive(supplier.id)
        : await window.orix.suppliers.restore(supplier.id);
    if (response.ok) {
      showToast(supplier.archivedAt === null ? "Supplier archived." : "Supplier restored.");
      await loadSuppliers();
    } else {
      showToast(response.error.message, "error");
    }
  };

  const exportCsv = () => {
    const rows = [
      ["Name", "Phone", "City", "Outstanding Balance", "Credit Terms", "Status"],
      ...suppliers.map((supplier) => [
        supplier.name,
        supplier.phone ?? "",
        supplier.city ?? "",
        fromMinor(supplier.outstandingBalanceMinor),
        supplier.creditTerms ?? "",
        supplier.status
      ])
    ];
    downloadCsv("suppliers.csv", rows);
  };

  return (
    <section className="page-stack customers-module supplier-module">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Vendor Account Book</p>
          <h1>Suppliers</h1>
        </div>
        <div className="topbar-actions">
          <button disabled={!canExport} onClick={exportCsv}>
            Export CSV
          </button>
          <button
            onClick={() => {
              window.print();
            }}
          >
            Print
          </button>
          <button
            className="primary"
            disabled={!canCreate}
            onClick={() => {
              setForm(emptySupplierForm);
            }}
          >
            New Supplier
          </button>
        </div>
      </div>
      <div className="filters customer-filters">
        <input
          placeholder="Search supplier, phone, NTN, STRN, tags"
          value={query.search ?? ""}
          onChange={(event) => {
            setQuery({ ...query, search: event.target.value, page: 1 });
          }}
        />
        <select
          value={query.status}
          onChange={(event) => {
            setQuery({
              ...query,
              status: event.target.value as NonNullable<SupplierListRequest["status"]>,
              page: 1
            });
          }}
        >
          <option value="active">Active</option>
          <option value="archived">Archived</option>
          <option value="all">All</option>
        </select>
      </div>
      <div className="table-wrap customer-table">
        <table>
          <thead>
            <tr>
              <th>Avatar</th>
              <th>Supplier</th>
              <th>Phone</th>
              <th>City</th>
              <th>Outstanding</th>
              <th>Terms</th>
              <th>Last Purchase</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="state-cell">
                  Loading suppliers...
                </td>
              </tr>
            ) : suppliers.length === 0 ? (
              <tr>
                <td colSpan={9} className="state-cell">
                  No suppliers yet. Add your first vendor account.
                </td>
              </tr>
            ) : (
              suppliers.map((supplier) => (
                <tr key={supplier.id} onDoubleClick={() => void loadProfile(supplier.id)}>
                  <td>
                    <span className="avatar">{initials(supplier.name)}</span>
                  </td>
                  <td className="strong">{supplier.name}</td>
                  <td>{supplier.phone ?? "-"}</td>
                  <td>{supplier.city ?? "-"}</td>
                  <td className={supplier.outstandingBalanceMinor > 0 ? "money-danger" : ""}>
                    {money(supplier.outstandingBalanceMinor)}
                  </td>
                  <td>{supplier.creditTerms ?? "-"}</td>
                  <td>
                    {supplier.lastPurchaseAt === null
                      ? "-"
                      : new Date(supplier.lastPurchaseAt).toLocaleDateString("en-PK")}
                  </td>
                  <td>
                    <span className={`pill ${supplier.status === "active" ? "success" : "muted"}`}>
                      {supplier.status}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => void loadProfile(supplier.id)}>View</button>
                      <button
                        disabled={!canPay}
                        onClick={() => {
                          setPaymentForm(supplierPaymentFormFor(supplier));
                        }}
                      >
                        Payment
                      </button>
                      <button disabled={!canDelete} onClick={() => void archiveOrRestore(supplier)}>
                        {supplier.archivedAt === null ? "Archive" : "Restore"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={query.page}
        totalPages={totalPages}
        onPage={(page) => {
          setQuery({ ...query, page });
        }}
      />
      {form === null ? null : (
        <SupplierForm
          form={form}
          canEdit={canEdit || form.id === undefined}
          onChange={setForm}
          onClose={() => {
            setForm(null);
          }}
          onSave={() => void saveSupplier()}
        />
      )}
      {paymentForm === null ? null : (
        <SupplierPaymentDialog
          form={paymentForm}
          onChange={setPaymentForm}
          onClose={() => {
            setPaymentForm(null);
          }}
          onSave={() => void recordPayment()}
        />
      )}
      {profile === null ? null : (
        <SupplierProfileDrawer
          supplier={profile}
          statement={statement}
          activity={activity}
          tab={tab}
          setTab={setTab}
          statementQuery={statementQuery}
          setStatementQuery={setStatementQuery}
          canEdit={canEdit}
          canPay={canPay}
          onEdit={() => {
            editSupplier(profile);
          }}
          onPayment={() => {
            setPaymentForm(supplierPaymentFormFor(profile));
          }}
          onClose={() => {
            setProfile(null);
            setActivity([]);
          }}
        />
      )}
    </section>
  );
};

const SupplierForm = ({
  form,
  canEdit,
  onChange,
  onClose,
  onSave
}: {
  readonly form: SupplierFormState;
  readonly canEdit: boolean;
  readonly onChange: (form: SupplierFormState) => void;
  readonly onClose: () => void;
  readonly onSave: () => void;
}) => {
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? supplierFormErrors(form) : {};

  return (
    <div className="modal-backdrop">
      <section className="modal customer-modal">
        <header>
          <div>
            <p className="eyebrow">{form.id === undefined ? "New Supplier" : "Edit Supplier"}</p>
            <h2>{form.id === undefined ? "Create supplier" : "Update supplier"}</h2>
          </div>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="form-grid">
          <Field
            label="Supplier Name *"
            value={form.name}
            error={errors.name}
            required
            onChange={(name) => {
              onChange({ ...form, name });
            }}
          />
          <Field
            label="Phone"
            value={form.phone}
            onChange={(phone) => {
              onChange({ ...form, phone });
            }}
          />
          <Field
            label="Email"
            type="email"
            value={form.email}
            error={errors.email}
            onChange={(email) => {
              onChange({ ...form, email });
            }}
          />
          <Field
            label="City"
            value={form.city}
            onChange={(city) => {
              onChange({ ...form, city });
            }}
          />
          <Field
            label="NTN"
            value={form.ntn}
            onChange={(ntn) => {
              onChange({ ...form, ntn });
            }}
          />
          <Field
            label="STRN"
            value={form.strn}
            onChange={(strn) => {
              onChange({ ...form, strn });
            }}
          />
          <Field
            label="Credit Terms"
            value={form.creditTerms}
            onChange={(creditTerms) => {
              onChange({ ...form, creditTerms });
            }}
          />
          <Field
            label="Opening Balance"
            type="number"
            value={form.openingBalance}
            error={errors.openingBalance}
            min={0}
            onChange={(openingBalance) => {
              onChange({ ...form, openingBalance });
            }}
          />
          <label>
            Opening Date
            <input
              disabled={!canEdit}
              type="date"
              value={form.openingBalanceDate}
              onChange={(event) => {
                onChange({ ...form, openingBalanceDate: event.target.value });
              }}
            />
          </label>
          <label>
            Tags
            <input
              disabled={!canEdit}
              value={form.tags}
              onChange={(event) => {
                onChange({ ...form, tags: event.target.value });
              }}
            />
          </label>
          <label className="span-2">
            Address
            <textarea
              disabled={!canEdit}
              value={form.address}
              onChange={(event) => {
                onChange({ ...form, address: event.target.value });
              }}
            />
          </label>
          <label className="span-2">
            Notes
            <textarea
              disabled={!canEdit}
              value={form.notes}
              onChange={(event) => {
                onChange({ ...form, notes: event.target.value });
              }}
            />
          </label>
        </div>
        <footer>
          <button onClick={onClose}>Cancel</button>
          <button
            className="primary"
            disabled={!canEdit}
            onClick={() => {
              setSubmitted(true);
              onSave();
            }}
          >
            Save Supplier
          </button>
        </footer>
      </section>
    </div>
  );
};

const SupplierPaymentDialog = ({
  form,
  onChange,
  onClose,
  onSave
}: {
  readonly form: SupplierPaymentFormState;
  readonly onChange: (form: SupplierPaymentFormState) => void;
  readonly onClose: () => void;
  readonly onSave: () => void;
}) => {
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? paymentFormErrors(form) : {};

  return (
    <div className="modal-backdrop">
      <section className="modal customer-modal">
        <header>
          <div>
            <p className="eyebrow">Supplier Payment</p>
            <h2>Record payment</h2>
          </div>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="form-grid">
          <Field
            label="Amount *"
            type="number"
            value={form.amount}
            error={errors.amount}
            min={0}
            required
            onChange={(amount) => {
              onChange({ ...form, amount });
            }}
          />
          <label>
            Method
            <select
              value={form.paymentMethod}
              onChange={(event) => {
                onChange({
                  ...form,
                  paymentMethod: event.target.value as SupplierPaymentPayload["paymentMethod"]
                });
              }}
            >
              <option value="cash">Cash</option>
              <option value="bank">Bank</option>
              <option value="jazzcash">JazzCash</option>
              <option value="easypaisa">EasyPaisa</option>
              <option value="card">Card</option>
            </select>
          </label>
          <label
            className={errors.paidAt === undefined ? "field-control" : "field-control has-error"}
          >
            Paid At
            <input
              type="datetime-local"
              value={form.paidAt}
              aria-invalid={errors.paidAt === undefined ? undefined : true}
              onChange={(event) => {
                onChange({ ...form, paidAt: event.target.value });
              }}
            />
            {errors.paidAt === undefined ? null : (
              <small className="field-error">{errors.paidAt}</small>
            )}
          </label>
          <label>
            Reference
            <input
              value={form.referenceNumber}
              onChange={(event) => {
                onChange({ ...form, referenceNumber: event.target.value });
              }}
            />
          </label>
          <label>
            Receipt
            <input
              value={form.receiptNumber}
              onChange={(event) => {
                onChange({ ...form, receiptNumber: event.target.value });
              }}
            />
          </label>
          <label className="span-2">
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => {
                onChange({ ...form, notes: event.target.value });
              }}
            />
          </label>
        </div>
        <footer>
          <button onClick={onClose}>Cancel</button>
          <button
            className="primary"
            onClick={() => {
              setSubmitted(true);
              onSave();
            }}
          >
            Record Payment
          </button>
        </footer>
      </section>
    </div>
  );
};

const SupplierProfileDrawer = ({
  supplier,
  statement,
  activity,
  tab,
  setTab,
  statementQuery,
  setStatementQuery,
  canEdit,
  canPay,
  onEdit,
  onPayment,
  onClose
}: {
  readonly supplier: SupplierDetailDto;
  readonly statement: SupplierStatementDto | null;
  readonly activity: readonly SupplierActivityDto[];
  readonly tab: "overview" | "statement" | "payments" | "purchases" | "activity";
  readonly setTab: (tab: "overview" | "statement" | "payments" | "purchases" | "activity") => void;
  readonly statementQuery: Omit<SupplierStatementRequest, "supplierId">;
  readonly setStatementQuery: (query: Omit<SupplierStatementRequest, "supplierId">) => void;
  readonly canEdit: boolean;
  readonly canPay: boolean;
  readonly onEdit: () => void;
  readonly onPayment: () => void;
  readonly onClose: () => void;
}) => (
  <div className="drawer-backdrop">
    <aside className="drawer customer-profile">
      <header>
        <div className="customer-profile-head">
          <span className="avatar large">{initials(supplier.name)}</span>
          <div>
            <h2>{supplier.name}</h2>
            <span>
              {supplier.phone ?? "No phone"} · {supplier.city ?? "No city"}
            </span>
          </div>
        </div>
        <button onClick={onClose}>Close</button>
      </header>
      <div className="profile-actions">
        <button disabled={!canPay} onClick={onPayment}>
          Record Payment
        </button>
        <button disabled={!canEdit} onClick={onEdit}>
          Edit
        </button>
        <button
          onClick={() => {
            window.print();
          }}
        >
          Print Statement
        </button>
      </div>
      <div className="profile-stats">
        <Metric label="Outstanding" value={money(supplier.outstandingBalanceMinor)} />
        <Metric label="Credit Terms" value={supplier.creditTerms ?? "-"} />
        <Metric label="Status" value={supplier.status} />
      </div>
      <div className="inventory-tabs">
        {(["overview", "statement", "payments", "purchases", "activity"] as const).map((item) => (
          <button
            className={tab === item ? "active" : ""}
            key={item}
            onClick={() => {
              setTab(item);
            }}
          >
            {item}
          </button>
        ))}
      </div>
      {tab === "overview" ? (
        <section className="detail-section">
          <Detail label="Email" value={supplier.email ?? "-"} />
          <Detail label="NTN" value={supplier.ntn ?? "-"} />
          <Detail label="STRN" value={supplier.strn ?? "-"} />
          <Detail label="Tags" value={supplier.tags.join(", ") || "-"} />
          <Detail label="Opening Balance" value={money(supplier.openingBalanceMinor)} />
          <Detail label="Notes" value={supplier.notes ?? "-"} />
        </section>
      ) : null}
      {tab === "statement" || tab === "payments" ? (
        <section className="statement-panel">
          <div className="filters">
            <input
              placeholder="Search statement"
              value={statementQuery.search ?? ""}
              onChange={(event) => {
                setStatementQuery({ ...statementQuery, search: event.target.value, page: 1 });
              }}
            />
            <select
              value={statementQuery.transactionType}
              onChange={(event) => {
                setStatementQuery({
                  ...statementQuery,
                  transactionType: event.target.value as NonNullable<
                    SupplierStatementRequest["transactionType"]
                  >,
                  page: 1
                });
              }}
            >
              <option value="all">All</option>
              <option value="opening-balance">Opening Balance</option>
              <option value="payment">Payments</option>
              <option value="purchase">Purchases</option>
            </select>
          </div>
          <div className="statement-summary">
            <span>Opening {money(statement?.openingBalanceMinor ?? 0)}</span>
            <strong>
              Closing {money(statement?.closingBalanceMinor ?? supplier.outstandingBalanceMinor)}
            </strong>
            <span>
              Generated{" "}
              {statement === null ? "-" : new Date(statement.generatedAt).toLocaleString("en-PK")}
            </span>
          </div>
          <table className="statement-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Reference</th>
                <th>Description</th>
                <th>Debit</th>
                <th>Credit</th>
                <th>Running Balance</th>
                <th>User</th>
              </tr>
            </thead>
            <tbody>
              {statement?.items.length === 0 ? (
                <tr>
                  <td colSpan={7} className="state-cell">
                    No supplier account entries yet.
                  </td>
                </tr>
              ) : (
                statement?.items.map((line) => (
                  <tr key={line.id}>
                    <td>{new Date(line.date).toLocaleDateString("en-PK")}</td>
                    <td>{line.reference}</td>
                    <td>{line.description}</td>
                    <td>{line.debitMinor === 0 ? "-" : money(line.debitMinor)}</td>
                    <td>{line.creditMinor === 0 ? "-" : money(line.creditMinor)}</td>
                    <td>{money(line.runningBalanceMinor)}</td>
                    <td>{line.userName}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>
      ) : null}
      {tab === "purchases" ? (
        <EmptyState
          title="Purchase links"
          description="Supplier purchases appear in the Purchases module."
        />
      ) : null}
      {tab === "activity" ? (
        activity.length === 0 ? (
          <EmptyState
            title="No supplier activity"
            description="Supplier changes and payments will appear here."
          />
        ) : (
          <div className="activity-list">
            {activity.map((item) => (
              <div className="activity-item" key={item.id}>
                <strong>{item.action}</strong>
                <span>{new Date(item.occurredAt).toLocaleString("en-PK")}</span>
                <p>{item.details}</p>
              </div>
            ))}
          </div>
        )
      ) : null}
    </aside>
  </div>
);

const supplierPaymentFormFor = (
  supplier: SupplierListItemDto | SupplierDetailDto
): SupplierPaymentFormState => ({
  supplierId: supplier.id,
  amount: fromMinor(Math.max(0, supplier.outstandingBalanceMinor)),
  paymentMethod: "cash",
  paidAt: new Date().toISOString().slice(0, 16),
  referenceNumber: "",
  receiptNumber: "",
  notes: ""
});

const PurchaseModule = ({
  permissions,
  showToast
}: {
  readonly permissions: readonly AppContextDto["permissions"][number][];
  readonly showToast: (message: string, tone?: ToastState["tone"]) => void;
}) => {
  const [purchases, setPurchases] = useState<readonly PurchaseListItemDto[]>([]);
  const [suppliers, setSuppliers] = useState<readonly SupplierListItemDto[]>([]);
  const [products, setProducts] = useState<readonly ProductListItemDto[]>([]);
  const [catalog, setCatalog] = useState<ProductCatalogDto | null>(null);
  const [query, setQuery] = useState<PurchaseListRequest>({
    page: 1,
    pageSize: 12,
    sortBy: "purchaseDate",
    sortDirection: "desc",
    status: "all"
  });
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<PurchaseFormState | null>(null);
  const [detail, setDetail] = useState<PurchaseDetailDto | null>(null);
  const [cancelTarget, setCancelTarget] = useState<PurchaseListItemDto | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [returnForm, setReturnForm] = useState<PurchaseReturnFormState | null>(null);
  const canCreate = permissions.includes("purchases.create");
  const canEdit = permissions.includes("purchases.edit");
  const canReceive = permissions.includes("purchases.receive");
  const canCancel = permissions.includes("purchases.cancel");
  const canReturn = permissions.includes("purchases.return");
  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));

  const loadPurchases = useCallback(async () => {
    setLoading(true);
    const response = await window.orix.purchases.list(query);
    if (response.ok) {
      setPurchases(response.value.items);
      setTotalItems(response.value.totalItems);
    } else {
      showToast(response.error.message, "error");
    }
    setLoading(false);
  }, [query, showToast]);

  const loadLookups = useCallback(async () => {
    const [supplierResponse, catalogResponse, productResponse] = await Promise.all([
      window.orix.suppliers.list({
        page: 1,
        pageSize: 500,
        sortBy: "name",
        sortDirection: "asc",
        status: "active"
      }),
      window.orix.products.catalog(true),
      window.orix.products.list({
        page: 1,
        pageSize: 500,
        sortBy: "name",
        sortDirection: "asc",
        status: "active"
      })
    ]);
    if (supplierResponse.ok) setSuppliers(supplierResponse.value.items);
    if (catalogResponse.ok) setCatalog(catalogResponse.value);
    if (productResponse.ok) setProducts(productResponse.value.items);
  }, []);

  useEffect(() => {
    void loadPurchases();
  }, [loadPurchases]);

  useEffect(() => {
    void loadLookups();
  }, [loadLookups]);

  const saveDraft = async () => {
    if (form === null) return;
    const validationError = validatePurchaseForm(form);
    if (validationError !== null) {
      showToast(validationError, "error");
      return;
    }
    const payload: PurchaseWritePayload = {
      supplierId: form.supplierId,
      invoiceNumber: form.invoiceNumber || null,
      purchaseNumber: form.purchaseNumber || null,
      purchaseDate: form.purchaseDate,
      dueDate: form.dueDate || null,
      discountMinor: toMinor(form.discount),
      taxMinor: toMinor(form.tax),
      freightMinor: toMinor(form.freight),
      otherChargesMinor: toMinor(form.otherCharges),
      notes: form.notes || null,
      items: form.items.map((item): PurchaseItemPayload => ({
        productId: item.productId,
        unitId: item.unitId,
        quantity: Number(item.quantity || "0"),
        unitCostMinor: toMinor(item.unitCost),
        discountMinor: toMinor(item.discount),
        taxMinor: toMinor(item.tax)
      })),
      ...(form.id === undefined ? {} : { id: form.id }),
      ...(form.expectedUpdatedAt === undefined ? {} : { expectedUpdatedAt: form.expectedUpdatedAt })
    };
    const response = await window.orix.purchases.saveDraft(payload);
    if (response.ok) {
      setForm(null);
      setDetail(response.value.purchase);
      showToast("Purchase draft saved.");
      await loadPurchases();
    } else {
      showToast(response.error.message, "error");
    }
  };

  const loadDetail = async (id: string) => {
    const response = await window.orix.purchases.get(id);
    if (response.ok && response.value !== undefined) setDetail(response.value);
    else showToast(response.ok ? "Purchase was not found." : response.error.message, "error");
  };

  const editPurchase = async (id: string) => {
    const response = await window.orix.purchases.get(id);
    if (!response.ok || response.value === undefined) {
      showToast(response.ok ? "Purchase was not found." : response.error.message, "error");
      return;
    }
    const purchase = response.value;
    setForm({
      id: purchase.id,
      supplierId: purchase.supplierId,
      invoiceNumber: purchase.invoiceNumber ?? "",
      purchaseNumber: purchase.purchaseNumber,
      purchaseDate: purchase.purchaseDate.slice(0, 10),
      dueDate: purchase.dueDate?.slice(0, 10) ?? "",
      discount: fromMinor(purchase.discountMinor),
      tax: fromMinor(purchase.taxMinor),
      freight: fromMinor(purchase.freightMinor),
      otherCharges: fromMinor(purchase.otherChargesMinor),
      notes: purchase.notes ?? "",
      items: purchase.items.map((item) => ({
        productId: item.productId,
        unitId: item.unitId,
        quantity: String(item.quantity),
        unitCost: fromMinor(item.unitCostMinor),
        discount: fromMinor(item.discountMinor),
        tax: fromMinor(item.taxMinor)
      })),
      expectedUpdatedAt: purchase.updatedAt
    });
  };

  const receivePurchase = async (purchase: PurchaseListItemDto) => {
    const response = await window.orix.purchases.receive(purchase.id);
    if (response.ok) {
      showToast("Purchase received. Inventory and ledger updated.");
      await loadPurchases();
      setDetail(response.value.purchase);
    } else {
      showToast(response.error.message, "error");
    }
  };

  const cancelPurchase = async () => {
    if (cancelTarget === null) return;
    const response = await window.orix.purchases.cancel(cancelTarget.id, cancelReason);
    if (response.ok) {
      setCancelTarget(null);
      setCancelReason("");
      showToast("Purchase cancelled.");
      await loadPurchases();
    } else {
      showToast(response.error.message, "error");
    }
  };

  const openReturn = async (id: string) => {
    const response = await window.orix.purchases.get(id);
    if (!response.ok || response.value === undefined) {
      showToast(response.ok ? "Purchase was not found." : response.error.message, "error");
      return;
    }
    setReturnForm({
      purchase: response.value,
      reason: "",
      quantities: Object.fromEntries(
        response.value.items
          .filter((item) => item.quantity - item.returnedQuantity > 0)
          .map((item) => [item.id, "0"])
      )
    });
  };

  const submitReturn = async () => {
    if (returnForm === null) return;
    const items = returnForm.purchase.items
      .map((item) => ({
        purchaseItemId: item.id,
        quantity: Number(returnForm.quantities[item.id] ?? "0")
      }))
      .filter((item) => item.quantity > 0);
    const payload: PurchaseReturnPayload = {
      purchaseId: returnForm.purchase.id,
      reason: returnForm.reason,
      items
    };
    const response = await window.orix.purchases.returnPurchase(payload);
    if (response.ok) {
      setReturnForm(null);
      showToast(`Return ${response.value.return.returnNumber} posted.`);
      await loadPurchases();
      await loadDetail(returnForm.purchase.id);
    } else {
      showToast(response.error.message, "error");
    }
  };

  return (
    <section className="page-stack purchase-module">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Procurement</p>
          <h1>Purchases</h1>
        </div>
        <div className="topbar-actions">
          <button
            onClick={() => {
              window.print();
            }}
          >
            Print
          </button>
          <button
            className="primary"
            disabled={!canCreate}
            onClick={() => {
              setForm(emptyPurchaseForm);
            }}
          >
            New Purchase
          </button>
        </div>
      </div>
      <div className="filters customer-filters">
        <input
          placeholder="Search purchase number, supplier, invoice"
          value={query.search ?? ""}
          onChange={(event) => {
            setQuery({ ...query, search: event.target.value, page: 1 });
          }}
        />
        <select
          value={query.status}
          onChange={(event) => {
            setQuery({
              ...query,
              status: event.target.value as NonNullable<PurchaseListRequest["status"]>,
              page: 1
            });
          }}
        >
          <option value="all">All</option>
          <option value="draft">Draft</option>
          <option value="received">Posted</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={query.supplierId ?? ""}
          onChange={(event) => {
            setQuery(
              event.target.value.length === 0
                ? {
                    ...(query.search === undefined ? {} : { search: query.search }),
                    ...(query.status === undefined ? {} : { status: query.status }),
                    ...(query.dateFrom === undefined ? {} : { dateFrom: query.dateFrom }),
                    ...(query.dateTo === undefined ? {} : { dateTo: query.dateTo }),
                    page: 1,
                    pageSize: query.pageSize,
                    sortBy: query.sortBy,
                    sortDirection: query.sortDirection
                  }
                : { ...query, supplierId: event.target.value, page: 1 }
            );
          }}
        >
          <option value="">All suppliers</option>
          {suppliers.map((supplier) => (
            <option value={supplier.id} key={supplier.id}>
              {supplier.name}
            </option>
          ))}
        </select>
      </div>
      <div className="table-wrap customer-table">
        <table>
          <thead>
            <tr>
              <th>Purchase #</th>
              <th>Invoice</th>
              <th>Supplier</th>
              <th>Date</th>
              <th>Due</th>
              <th>Items</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="state-cell">
                  Loading purchases...
                </td>
              </tr>
            ) : purchases.length === 0 ? (
              <tr>
                <td colSpan={10} className="state-cell">
                  No purchases yet. Create a supplier purchase draft.
                </td>
              </tr>
            ) : (
              purchases.map((purchase) => (
                <tr key={purchase.id} onDoubleClick={() => void loadDetail(purchase.id)}>
                  <td className="strong">{purchase.purchaseNumber}</td>
                  <td>{purchase.invoiceNumber ?? "-"}</td>
                  <td>{purchase.supplierName}</td>
                  <td>{new Date(purchase.purchaseDate).toLocaleDateString("en-PK")}</td>
                  <td>
                    {purchase.dueDate === null
                      ? "-"
                      : new Date(purchase.dueDate).toLocaleDateString("en-PK")}
                  </td>
                  <td>{purchase.itemCount}</td>
                  <td>{money(purchase.totalMinor)}</td>
                  <td>
                    <span
                      className={`pill ${purchase.paymentStatus === "paid" ? "success" : "warning"}`}
                    >
                      {purchase.paymentStatus}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`pill ${purchase.status === "received" ? "success" : purchase.status === "cancelled" ? "danger" : "warning"}`}
                    >
                      {purchase.status === "received" ? "posted" : purchase.status}
                    </span>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button onClick={() => void loadDetail(purchase.id)}>View</button>
                      <button
                        disabled={!canEdit || purchase.status !== "draft"}
                        onClick={() => void editPurchase(purchase.id)}
                      >
                        Edit
                      </button>
                      <button
                        disabled={!canReceive || purchase.status !== "draft"}
                        onClick={() => void receivePurchase(purchase)}
                      >
                        Receive
                      </button>
                      <button
                        disabled={!canCancel || purchase.status !== "draft"}
                        onClick={() => {
                          setCancelTarget(purchase);
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        disabled={!canReturn || purchase.status !== "received"}
                        onClick={() => void openReturn(purchase.id)}
                      >
                        Return
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <Pagination
        page={query.page}
        totalPages={totalPages}
        onPage={(page) => {
          setQuery({ ...query, page });
        }}
      />
      {form === null ? null : (
        <PurchaseForm
          form={form}
          suppliers={suppliers}
          products={products}
          catalog={catalog}
          onChange={setForm}
          onClose={() => {
            setForm(null);
          }}
          onSave={() => void saveDraft()}
        />
      )}
      {detail === null ? null : (
        <PurchaseDetailsDrawer
          purchase={detail}
          onClose={() => {
            setDetail(null);
          }}
        />
      )}
      {cancelTarget === null ? null : (
        <div className="modal-backdrop">
          <section className="modal customer-modal">
            <header>
              <div>
                <p className="eyebrow">Cancel Draft</p>
                <h2>{cancelTarget.purchaseNumber}</h2>
              </div>
              <button
                onClick={() => {
                  setCancelTarget(null);
                }}
              >
                Close
              </button>
            </header>
            <label>
              Reason
              <textarea
                value={cancelReason}
                onChange={(event) => {
                  setCancelReason(event.target.value);
                }}
              />
            </label>
            <footer>
              <button
                onClick={() => {
                  setCancelTarget(null);
                }}
              >
                Back
              </button>
              <button className="danger-button" onClick={() => void cancelPurchase()}>
                Cancel Draft
              </button>
            </footer>
          </section>
        </div>
      )}
      {returnForm === null ? null : (
        <PurchaseReturnDialog
          form={returnForm}
          onChange={setReturnForm}
          onClose={() => {
            setReturnForm(null);
          }}
          onSubmit={() => void submitReturn()}
        />
      )}
    </section>
  );
};

const PurchaseForm = ({
  form,
  suppliers,
  products,
  catalog,
  onChange,
  onClose,
  onSave
}: {
  readonly form: PurchaseFormState;
  readonly suppliers: readonly SupplierListItemDto[];
  readonly products: readonly ProductListItemDto[];
  readonly catalog: ProductCatalogDto | null;
  readonly onChange: (form: PurchaseFormState) => void;
  readonly onClose: () => void;
  readonly onSave: () => void;
}) => {
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? purchaseFormErrors(form) : {};
  const updateItem = (index: number, patch: Partial<PurchaseItemFormState>) => {
    onChange({
      ...form,
      items: form.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item
      )
    });
  };
  return (
    <div className="modal-backdrop">
      <section className="modal purchase-modal">
        <header>
          <div>
            <p className="eyebrow">{form.id === undefined ? "New Purchase" : "Edit Draft"}</p>
            <h2>Supplier purchase</h2>
          </div>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="form-grid">
          <label
            className={
              errors.supplierId === undefined ? "field-control" : "field-control has-error"
            }
          >
            Supplier *
            <select
              value={form.supplierId}
              aria-invalid={errors.supplierId === undefined ? undefined : true}
              onChange={(event) => {
                onChange({ ...form, supplierId: event.target.value });
              }}
            >
              <option value="">Choose supplier</option>
              {suppliers.map((supplier) => (
                <option value={supplier.id} key={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
            {errors.supplierId === undefined ? null : (
              <small className="field-error">{errors.supplierId}</small>
            )}
          </label>
          <label>
            Invoice Number
            <input
              value={form.invoiceNumber}
              onChange={(event) => {
                onChange({ ...form, invoiceNumber: event.target.value });
              }}
            />
          </label>
          <label>
            Internal Number
            <input
              value={form.purchaseNumber}
              onChange={(event) => {
                onChange({ ...form, purchaseNumber: event.target.value });
              }}
            />
          </label>
          <label
            className={
              errors.purchaseDate === undefined ? "field-control" : "field-control has-error"
            }
          >
            Purchase Date
            <input
              type="date"
              value={form.purchaseDate}
              aria-invalid={errors.purchaseDate === undefined ? undefined : true}
              onChange={(event) => {
                onChange({ ...form, purchaseDate: event.target.value });
              }}
            />
            {errors.purchaseDate === undefined ? null : (
              <small className="field-error">{errors.purchaseDate}</small>
            )}
          </label>
          <label>
            Due Date
            <input
              type="date"
              value={form.dueDate}
              onChange={(event) => {
                onChange({ ...form, dueDate: event.target.value });
              }}
            />
          </label>
        </div>
        <div className="purchase-lines">
          <div className="section-title">
            <h3>Items</h3>
            <button
              onClick={() => {
                onChange({ ...form, items: [...form.items, emptyPurchaseItem] });
              }}
            >
              Add Item
            </button>
          </div>
          {errors.items === undefined ? null : (
            <small className="field-error purchase-form-error">{errors.items}</small>
          )}
          {form.items.map((item, index) => (
            <div className="purchase-line" key={`${String(index)}-${item.productId}`}>
              <select
                value={item.productId}
                onChange={(event) => {
                  const product = products.find((entry) => entry.id === event.target.value);
                  updateItem(index, {
                    productId: event.target.value,
                    unitId: product?.unitId ?? item.unitId,
                    unitCost:
                      product === undefined ? item.unitCost : fromMinor(product.purchasePriceMinor)
                  });
                }}
              >
                <option value="">Product</option>
                {products.map((product) => (
                  <option value={product.id} key={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
              <select
                value={item.unitId}
                onChange={(event) => {
                  updateItem(index, { unitId: event.target.value });
                }}
              >
                <option value="">Unit</option>
                {catalog?.units.map((unit) => (
                  <option value={unit.id} key={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
              <input
                placeholder="Qty"
                value={item.quantity}
                onChange={(event) => {
                  updateItem(index, { quantity: event.target.value });
                }}
              />
              <input
                placeholder="Cost"
                value={item.unitCost}
                onChange={(event) => {
                  updateItem(index, { unitCost: event.target.value });
                }}
              />
              <input
                placeholder="Discount"
                value={item.discount}
                onChange={(event) => {
                  updateItem(index, { discount: event.target.value });
                }}
              />
              <input
                placeholder="Tax"
                value={item.tax}
                onChange={(event) => {
                  updateItem(index, { tax: event.target.value });
                }}
              />
              <button
                onClick={() => {
                  onChange({
                    ...form,
                    items: form.items.filter((_, itemIndex) => itemIndex !== index)
                  });
                }}
              >
                Remove
              </button>
              {submitted && purchaseItemError(item) !== null ? (
                <small className="field-error purchase-line-error">{purchaseItemError(item)}</small>
              ) : null}
            </div>
          ))}
        </div>
        <div className="form-grid">
          <Field
            label="Purchase Discount"
            value={form.discount}
            type="number"
            min={0}
            error={errors.discount}
            onChange={(discount) => {
              onChange({ ...form, discount });
            }}
          />
          <Field
            label="Tax"
            value={form.tax}
            type="number"
            min={0}
            error={errors.tax}
            onChange={(tax) => {
              onChange({ ...form, tax });
            }}
          />
          <Field
            label="Freight"
            value={form.freight}
            type="number"
            min={0}
            error={errors.freight}
            onChange={(freight) => {
              onChange({ ...form, freight });
            }}
          />
          <Field
            label="Other Charges"
            value={form.otherCharges}
            type="number"
            min={0}
            error={errors.otherCharges}
            onChange={(otherCharges) => {
              onChange({ ...form, otherCharges });
            }}
          />
          <label className="span-2">
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => {
                onChange({ ...form, notes: event.target.value });
              }}
            />
          </label>
        </div>
        <footer>
          <span className="muted-text">Grand Total {money(purchaseFormTotal(form))}</span>
          <button onClick={onClose}>Cancel</button>
          <button
            className="primary"
            onClick={() => {
              setSubmitted(true);
              onSave();
            }}
          >
            Save Draft
          </button>
        </footer>
      </section>
    </div>
  );
};

const PurchaseDetailsDrawer = ({
  purchase,
  onClose
}: {
  readonly purchase: PurchaseDetailDto;
  readonly onClose: () => void;
}) => (
  <div className="drawer-backdrop">
    <aside className="drawer customer-profile">
      <header>
        <div>
          <p className="eyebrow">Purchase Details</p>
          <h2>{purchase.purchaseNumber}</h2>
          <span>{purchase.supplierName}</span>
        </div>
        <button onClick={onClose}>Close</button>
      </header>
      <div className="profile-stats">
        <Metric label="Grand Total" value={money(purchase.totalMinor)} />
        <Metric label="Payment" value={purchase.paymentStatus} />
        <Metric
          label="Status"
          value={purchase.status === "received" ? "posted" : purchase.status}
        />
      </div>
      <section className="detail-section">
        <Detail label="Invoice" value={purchase.invoiceNumber ?? "-"} />
        <Detail
          label="Purchase Date"
          value={new Date(purchase.purchaseDate).toLocaleDateString("en-PK")}
        />
        <Detail
          label="Due Date"
          value={
            purchase.dueDate === null ? "-" : new Date(purchase.dueDate).toLocaleDateString("en-PK")
          }
        />
        <Detail label="Subtotal" value={money(purchase.subtotalMinor)} />
        <Detail label="Discount" value={money(purchase.discountMinor)} />
        <Detail label="Tax" value={money(purchase.taxMinor)} />
        <Detail label="Freight" value={money(purchase.freightMinor)} />
        <Detail label="Other Charges" value={money(purchase.otherChargesMinor)} />
        <Detail label="Notes" value={purchase.notes ?? "-"} />
      </section>
      <table className="statement-table">
        <thead>
          <tr>
            <th>Product</th>
            <th>Unit</th>
            <th>Qty</th>
            <th>Cost</th>
            <th>Discount</th>
            <th>Tax</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {purchase.items.map((item) => (
            <tr key={item.id}>
              <td>{item.productName}</td>
              <td>{item.unitName}</td>
              <td>{item.quantity}</td>
              <td>{money(item.unitCostMinor)}</td>
              <td>{money(item.discountMinor)}</td>
              <td>{money(item.taxMinor)}</td>
              <td>{money(item.lineTotalMinor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </aside>
  </div>
);

const PurchaseReturnDialog = ({
  form,
  onChange,
  onClose,
  onSubmit
}: {
  readonly form: PurchaseReturnFormState;
  readonly onChange: (form: PurchaseReturnFormState) => void;
  readonly onClose: () => void;
  readonly onSubmit: () => void;
}) => {
  const selectedItems = form.purchase.items
    .map((item) => ({
      item,
      quantity: Number(form.quantities[item.id] ?? "0")
    }))
    .filter((entry) => entry.quantity > 0);
  const totalMinor = selectedItems.reduce(
    (total, entry) => total + entry.quantity * entry.item.unitCostMinor,
    0
  );
  const canSubmit = form.reason.trim().length >= 3 && totalMinor > 0;
  return (
    <div className="modal-backdrop">
      <section className="modal return-modal">
        <header>
          <div>
            <p className="eyebrow">Supplier Return</p>
            <h2>{form.purchase.purchaseNumber}</h2>
            <span>{form.purchase.supplierName}</span>
          </div>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="return-summary">
          <Metric label="Supplier Credit" value={money(totalMinor)} />
          <Metric label="Items" value={String(selectedItems.length)} />
        </div>
        <div className="return-lines">
          {form.purchase.items.map((item) => {
            const available = item.quantity - item.returnedQuantity;
            return (
              <div className="return-line" key={item.id}>
                <div>
                  <strong>{item.productName}</strong>
                  <span>
                    Received {item.quantity} · Returned {item.returnedQuantity} · Available{" "}
                    {available}
                  </span>
                </div>
                <input
                  type="number"
                  min={0}
                  max={available}
                  value={form.quantities[item.id] ?? "0"}
                  disabled={available <= 0}
                  onChange={(event) => {
                    onChange({
                      ...form,
                      quantities: { ...form.quantities, [item.id]: event.target.value }
                    });
                  }}
                />
                <span className="strong">{money(item.unitCostMinor)}</span>
              </div>
            );
          })}
        </div>
        <label>
          Reason *
          <textarea
            value={form.reason}
            placeholder="Example: Returned damaged stock to supplier"
            onChange={(event) => {
              onChange({ ...form, reason: event.target.value });
            }}
          />
        </label>
        <footer>
          <button onClick={onClose}>Back</button>
          <button className="primary" disabled={!canSubmit} onClick={onSubmit}>
            Post Return
          </button>
        </footer>
      </section>
    </div>
  );
};

const purchaseFormTotal = (form: PurchaseFormState): number =>
  form.items.reduce(
    (total, item) =>
      total +
      Number(item.quantity || "0") * toMinor(item.unitCost) -
      toMinor(item.discount) +
      toMinor(item.tax),
    0
  ) -
  toMinor(form.discount) +
  toMinor(form.tax) +
  toMinor(form.freight) +
  toMinor(form.otherCharges);

const downloadCsv = (filename: string, rows: readonly (readonly string[])[]): void => {
  const blob = new Blob(
    [rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(",")).join("\n")],
    { type: "text/csv;charset=utf-8" }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};

type ReportTab = "sales" | "cash" | "inventory" | "low-stock" | "receivables" | "payables";

const ReportsModule = ({
  showToast
}: {
  readonly showToast: (message: string, tone?: ToastState["tone"]) => void;
}) => {
  const today = new Date().toISOString().slice(0, 10);
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [activeTab, setActiveTab] = useState<ReportTab>("sales");
  const [report, setReport] = useState<ReportsSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReport = useCallback(async () => {
    setLoading(true);
    const response = await window.orix.reports.summary({ dateFrom, dateTo });
    if (response.ok) {
      setReport(response.value);
    } else {
      showToast(response.error.message, "error");
    }
    setLoading(false);
  }, [dateFrom, dateTo, showToast]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const exportActiveReport = () => {
    if (report === null) {
      showToast("Load a report before exporting.", "error");
      return;
    }
    downloadCsv(`orix-${activeTab}-${dateFrom}-to-${dateTo}.csv`, reportCsvRows(report, activeTab));
    showToast("Report exported.");
  };

  const tabs: readonly { readonly id: ReportTab; readonly label: string }[] = [
    { id: "sales", label: "Daily Sales" },
    { id: "cash", label: "Cash Drawer" },
    { id: "inventory", label: "Inventory Value" },
    { id: "low-stock", label: "Low Stock" },
    { id: "receivables", label: "Receivables" },
    { id: "payables", label: "Payables" }
  ];

  return (
    <section className="page-stack reports-module">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Operations</p>
          <h1>Reports</h1>
        </div>
        <div className="toolbar-actions">
          <button onClick={() => void loadReport()}>
            <Icon name="refresh" />
            Refresh
          </button>
          <button onClick={exportActiveReport}>
            <Icon name="upload" />
            CSV
          </button>
          <button
            onClick={() => {
              window.print();
            }}
          >
            <Icon name="receipt" />
            Print
          </button>
        </div>
      </div>
      <div className="report-filters card">
        <label>
          From
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => {
              setDateFrom(event.target.value);
            }}
          />
        </label>
        <label>
          To
          <input
            type="date"
            value={dateTo}
            onChange={(event) => {
              setDateTo(event.target.value);
            }}
          />
        </label>
        <button className="primary" onClick={() => void loadReport()}>
          Run Reports
        </button>
      </div>
      {loading ? (
        <LoadingState label="Loading reports" />
      ) : report === null ? (
        <EmptyState title="Reports unavailable" description="Refresh to load report data." />
      ) : (
        <>
          <div className="report-summary-grid">
            <Metric label="Sales" value={money(report.totals.salesMinor)} />
            <Metric label="Cash Expected" value={money(report.totals.cashExpectedMinor)} />
            <Metric
              label="Inventory Cost"
              value={money(report.totals.inventoryPurchaseValueMinor)}
            />
            <Metric
              label="Inventory Retail"
              value={money(report.totals.inventoryRetailValueMinor)}
            />
            <Metric label="Receivables" value={money(report.totals.receivablesMinor)} />
            <Metric label="Payables" value={money(report.totals.payablesMinor)} />
          </div>
          <div className="report-tabs" role="tablist" aria-label="Reports">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "active" : ""}
                onClick={() => {
                  setActiveTab(tab.id);
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <ReportPanel report={report} activeTab={activeTab} />
        </>
      )}
    </section>
  );
};

const ReportPanel = ({
  report,
  activeTab
}: {
  readonly report: ReportsSummaryDto;
  readonly activeTab: ReportTab;
}) => {
  if (activeTab === "cash") {
    return (
      <section className="card report-panel">
        <div className="report-title">
          <div>
            <p className="eyebrow">Cash Drawer</p>
            <h2>Cash movement</h2>
          </div>
          <span className="pill">{report.cashDrawer.sessionStatus}</span>
        </div>
        <div className="cash-report-grid">
          <Metric label="Opening Cash" value={money(report.cashDrawer.openingCashMinor)} />
          <Metric label="Cash Sales" value={money(report.cashDrawer.cashSalesMinor)} />
          <Metric
            label="Customer Collections"
            value={money(report.cashDrawer.customerCollectionsMinor)}
          />
          <Metric
            label="Supplier Payments"
            value={money(report.cashDrawer.supplierPaymentsMinor)}
          />
          <Metric label="Expected Cash" value={money(report.cashDrawer.expectedCashMinor)} />
        </div>
      </section>
    );
  }

  if (activeTab === "inventory") {
    return (
      <ReportTable
        title="Inventory value"
        empty="No stock-tracked items found."
        headers={["Item", "Barcode", "Category", "Stock", "Cost Value", "Retail Value"]}
        rows={report.inventoryValue.map((item) => [
          item.productName,
          item.barcode ?? "",
          item.categoryName ?? "",
          String(item.currentStock),
          money(item.purchaseValueMinor),
          money(item.retailValueMinor)
        ])}
      />
    );
  }

  if (activeTab === "low-stock") {
    return (
      <ReportTable
        title="Low stock"
        empty="No low stock items right now."
        headers={["Item", "Barcode", "Category", "Current", "Minimum", "Need"]}
        rows={report.lowStock.map((item) => [
          item.productName,
          item.barcode ?? "",
          item.categoryName ?? "",
          String(item.currentStock),
          String(item.minimumStock),
          String(item.needToOrder)
        ])}
      />
    );
  }

  if (activeTab === "receivables") {
    return (
      <ReportTable
        title="Customer receivables"
        empty="No customer balances due."
        headers={["Customer", "Phone", "Balance", "Credit Limit", "Last Activity"]}
        rows={report.receivables.map((customer) => [
          customer.customerName,
          customer.phone ?? "",
          money(customer.balanceMinor),
          money(customer.creditLimitMinor),
          customer.lastActivityAt === null ? "" : new Date(customer.lastActivityAt).toLocaleString()
        ])}
      />
    );
  }

  if (activeTab === "payables") {
    return (
      <ReportTable
        title="Supplier payables"
        empty="No supplier balances due."
        headers={["Supplier", "Phone", "Balance", "Last Activity"]}
        rows={report.payables.map((supplier) => [
          supplier.supplierName,
          supplier.phone ?? "",
          money(supplier.balanceMinor),
          supplier.lastActivityAt === null ? "" : new Date(supplier.lastActivityAt).toLocaleString()
        ])}
      />
    );
  }

  return (
    <ReportTable
      title="Daily sales"
      empty="No completed sales in this date range."
      headers={[
        "Invoice",
        "Date",
        "Customer",
        "Items",
        "Subtotal",
        "Discount",
        "Total",
        "Paid",
        "Cashier"
      ]}
      rows={report.dailySales.map((sale) => [
        sale.saleNumber,
        new Date(sale.saleDate).toLocaleString(),
        sale.customerName,
        String(sale.itemCount),
        money(sale.subtotalMinor),
        money(sale.discountMinor),
        money(sale.totalMinor),
        money(sale.paidMinor),
        sale.cashierName
      ])}
    />
  );
};

const ReportTable = ({
  title,
  empty,
  headers,
  rows
}: {
  readonly title: string;
  readonly empty: string;
  readonly headers: readonly string[];
  readonly rows: readonly (readonly string[])[];
}) => (
  <section className="card report-panel">
    <div className="report-title">
      <div>
        <p className="eyebrow">Report</p>
        <h2>{title}</h2>
      </div>
      <span className="pill">{rows.length} rows</span>
    </div>
    {rows.length === 0 ? (
      <EmptyState title={title} description={empty} />
    ) : (
      <div className="table-wrap report-table-wrap">
        <table>
          <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={`${title}-${String(rowIndex)}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${title}-${String(rowIndex)}-${String(cellIndex)}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

const reportCsvRows = (
  report: ReportsSummaryDto,
  activeTab: ReportTab
): readonly (readonly string[])[] => {
  if (activeTab === "cash") {
    return [
      ["Metric", "Amount"],
      ["Opening Cash", fromMinor(report.cashDrawer.openingCashMinor)],
      ["Cash Sales", fromMinor(report.cashDrawer.cashSalesMinor)],
      ["Customer Collections", fromMinor(report.cashDrawer.customerCollectionsMinor)],
      ["Supplier Payments", fromMinor(report.cashDrawer.supplierPaymentsMinor)],
      ["Expected Cash", fromMinor(report.cashDrawer.expectedCashMinor)]
    ];
  }
  if (activeTab === "inventory") {
    return [
      ["Item", "Barcode", "Category", "Stock", "Purchase Value", "Retail Value"],
      ...report.inventoryValue.map((item) => [
        item.productName,
        item.barcode ?? "",
        item.categoryName ?? "",
        String(item.currentStock),
        fromMinor(item.purchaseValueMinor),
        fromMinor(item.retailValueMinor)
      ])
    ];
  }
  if (activeTab === "low-stock") {
    return [
      ["Item", "Barcode", "Category", "Current", "Minimum", "Need"],
      ...report.lowStock.map((item) => [
        item.productName,
        item.barcode ?? "",
        item.categoryName ?? "",
        String(item.currentStock),
        String(item.minimumStock),
        String(item.needToOrder)
      ])
    ];
  }
  if (activeTab === "receivables") {
    return [
      ["Customer", "Phone", "Balance", "Credit Limit", "Last Activity"],
      ...report.receivables.map((customer) => [
        customer.customerName,
        customer.phone ?? "",
        fromMinor(customer.balanceMinor),
        fromMinor(customer.creditLimitMinor),
        customer.lastActivityAt ?? ""
      ])
    ];
  }
  if (activeTab === "payables") {
    return [
      ["Supplier", "Phone", "Balance", "Last Activity"],
      ...report.payables.map((supplier) => [
        supplier.supplierName,
        supplier.phone ?? "",
        fromMinor(supplier.balanceMinor),
        supplier.lastActivityAt ?? ""
      ])
    ];
  }
  return [
    [
      "Invoice",
      "Date",
      "Customer",
      "Items",
      "Subtotal",
      "Discount",
      "Tax",
      "Total",
      "Paid",
      "Cashier"
    ],
    ...report.dailySales.map((sale) => [
      sale.saleNumber,
      sale.saleDate,
      sale.customerName,
      String(sale.itemCount),
      fromMinor(sale.subtotalMinor),
      fromMinor(sale.discountMinor),
      fromMinor(sale.taxMinor),
      fromMinor(sale.totalMinor),
      fromMinor(sale.paidMinor),
      sale.cashierName
    ])
  ];
};

const ProductModule = ({
  showToast
}: {
  readonly showToast: (message: string, tone?: ToastState["tone"]) => void;
}) => {
  const [products, setProducts] = useState<readonly ProductListItemDto[]>([]);
  const [catalog, setCatalog] = useState<ProductCatalogDto>({
    categories: [],
    brands: [],
    units: []
  });
  const [query, setQuery] = useState<ProductListRequest>({
    page: 1,
    pageSize: 10,
    sortBy: "name",
    sortDirection: "asc",
    status: "active"
  });
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState | null>(null);
  const [details, setDetails] = useState<ProductDetailDto | null>(null);
  const [catalogForm, setCatalogForm] = useState<CatalogFormState | null>(null);
  const [showCatalog, setShowCatalog] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));

  const loadCatalog = useCallback(async () => {
    const response = await window.orix.products.catalog(true);
    if (response.ok) {
      setCatalog(response.value);
    } else {
      setError(errorMessage(response.error));
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    const response = await window.orix.products.list(query);
    if (response.ok) {
      setProducts(response.value.items);
      setTotalItems(response.value.totalItems);
    } else {
      setError(errorMessage(response.error));
    }
    setLoading(false);
  }, [query]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        setForm(emptyProductForm);
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        document.getElementById("product-search")?.focus();
      }
      if (event.key === "Escape") {
        setForm(null);
        setCatalogForm(null);
        setDetails(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const activeCategories = useMemo(
    () => catalog.categories.filter((item) => item.archivedAt === null),
    [catalog.categories]
  );
  const activeBrands = useMemo(
    () => catalog.brands.filter((item) => item.archivedAt === null),
    [catalog.brands]
  );
  const activeUnits = useMemo(
    () => catalog.units.filter((item) => item.archivedAt === null),
    [catalog.units]
  );

  const openEdit = async (id: string) => {
    const response = await window.orix.products.get(id);
    if (!response.ok || response.value === undefined) {
      setError(response.ok ? "Product was not found." : errorMessage(response.error));
      return;
    }
    setForm({
      id: response.value.id,
      name: response.value.name,
      barcode: response.value.barcode ?? "",
      categoryId: response.value.categoryId ?? "",
      brandId: response.value.brandId ?? "",
      unitId: response.value.unitId,
      purchasePrice: fromMinor(response.value.purchasePriceMinor),
      salePrice: fromMinor(response.value.salePriceMinor),
      openingStock: "0",
      minimumStock: String(response.value.minimumStock),
      description: response.value.description ?? "",
      active: response.value.status === "active",
      expectedUpdatedAt: response.value.updatedAt
    });
  };

  const openDetails = async (id: string) => {
    const response = await window.orix.products.get(id);
    if (response.ok) {
      setDetails(response.value ?? null);
    } else {
      setError(errorMessage(response.error));
    }
  };

  const saveProduct = async (confirmSaleBelowPurchase = false) => {
    if (form === null) {
      return;
    }
    const validationError = validateProductForm(form);
    if (validationError !== null) {
      setError(validationError);
      showToast(validationError, "error");
      return;
    }
    const purchasePriceMinor = toMinor(form.purchasePrice);
    const salePriceMinor = toMinor(form.salePrice);
    if (salePriceMinor < purchasePriceMinor && !confirmSaleBelowPurchase) {
      const confirmed = window.confirm("Sale price is below purchase price. Save anyway?");
      if (!confirmed) {
        return;
      }
    }
    setSaving(true);
    const payloadBase = {
      name: form.name,
      barcode: form.barcode || null,
      categoryId: form.categoryId,
      brandId: form.brandId || null,
      unitId: form.unitId,
      purchasePriceMinor,
      salePriceMinor,
      openingStock: Number(form.openingStock || "0"),
      minimumStock: Number(form.minimumStock || "0"),
      description: form.description || null,
      active: form.active,
      confirmSaleBelowPurchase: confirmSaleBelowPurchase || salePriceMinor >= purchasePriceMinor
    };
    const payload: ProductFormPayload = {
      ...payloadBase,
      ...(form.id === undefined ? {} : { id: form.id }),
      ...(form.expectedUpdatedAt === undefined ? {} : { expectedUpdatedAt: form.expectedUpdatedAt })
    };
    const response = await window.orix.products.save(payload);
    if (response.ok) {
      setForm(null);
      showToast("Product saved.");
      await loadProducts();
    } else {
      setError(errorMessage(response.error));
    }
    setSaving(false);
  };

  const archiveProduct = async (product: ProductListItemDto) => {
    const response =
      product.archivedAt === null
        ? await window.orix.products.archive(product.id)
        : await window.orix.products.restore(product.id);
    if (response.ok) {
      showToast(product.archivedAt === null ? "Product archived." : "Product restored.");
      await loadProducts();
    } else {
      setError(errorMessage(response.error));
    }
  };

  const saveCatalog = async () => {
    if (catalogForm === null) {
      return;
    }
    const validationError = validateCatalogForm(catalogForm);
    if (validationError !== null) {
      setError(validationError);
      showToast(validationError, "error");
      return;
    }
    const payloadBase = {
      kind: catalogForm.kind,
      name: catalogForm.name,
      code: catalogForm.code || null,
      ...(catalogForm.kind === "unit" ? { abbreviation: catalogForm.abbreviation } : {})
    };
    const response = await window.orix.products.saveCatalog({
      ...payloadBase,
      ...(catalogForm.id === undefined ? {} : { id: catalogForm.id })
    });
    if (response.ok) {
      setCatalogForm(null);
      showToast("Catalog item saved.");
      await loadCatalog();
    } else {
      setError(errorMessage(response.error));
    }
  };

  const toggleCatalogArchive = async (kind: CatalogItemKind, item: CatalogItemDto) => {
    const response =
      item.archivedAt === null
        ? await window.orix.products.archiveCatalog(item.id, kind)
        : await window.orix.products.restoreCatalog(item.id, kind);
    if (response.ok) {
      showToast(item.archivedAt === null ? "Catalog item archived." : "Catalog item restored.");
      await loadCatalog();
      await loadProducts();
    } else {
      setError(errorMessage(response.error));
    }
  };

  return (
    <div className="product-module">
      <header className="module-header">
        <div>
          <p className="eyebrow">Items you sell</p>
          <h1>Items</h1>
          <p className="muted-text">Add products once, then sell them quickly from POS.</p>
        </div>
        <div className="topbar-actions">
          <button
            className="ghost"
            onClick={() => {
              setShowCatalog((value) => !value);
            }}
          >
            {showCatalog ? "Hide Groups" : "Manage Groups"}
          </button>
          <button className="ghost" onClick={() => void loadProducts()}>
            Refresh
          </button>
          <button
            className="primary"
            onClick={() => {
              setForm(emptyProductForm);
            }}
          >
            Add Item
          </button>
        </div>
      </header>

      <section className={`product-workspace ${showCatalog ? "" : "catalog-hidden"}`}>
        {showCatalog ? (
          <aside className="catalog-panel">
            <div className="catalog-help">
              <strong>Item groups</strong>
              <span>
                Categories, brands, and units help organize items. Most shops set these once.
              </span>
            </div>
            <CatalogSection
              title="Categories"
              kind="category"
              items={catalog.categories}
              onNew={() => {
                setCatalogForm({ kind: "category", name: "", code: "", abbreviation: "" });
              }}
              onEdit={(item) => {
                setCatalogForm({
                  id: item.id,
                  kind: "category",
                  name: item.name,
                  code: item.code ?? "",
                  abbreviation: ""
                });
              }}
              onArchive={(kind, item) => {
                void toggleCatalogArchive(kind, item);
              }}
            />
            <CatalogSection
              title="Brands"
              kind="brand"
              items={catalog.brands}
              onNew={() => {
                setCatalogForm({ kind: "brand", name: "", code: "", abbreviation: "" });
              }}
              onEdit={(item) => {
                setCatalogForm({
                  id: item.id,
                  kind: "brand",
                  name: item.name,
                  code: item.code ?? "",
                  abbreviation: ""
                });
              }}
              onArchive={(kind, item) => {
                void toggleCatalogArchive(kind, item);
              }}
            />
            <CatalogSection
              title="Units"
              kind="unit"
              items={catalog.units}
              onNew={() => {
                setCatalogForm({ kind: "unit", name: "", code: "", abbreviation: "" });
              }}
              onEdit={(item) => {
                setCatalogForm({
                  id: item.id,
                  kind: "unit",
                  name: item.name,
                  code: item.code ?? "",
                  abbreviation: item.abbreviation ?? ""
                });
              }}
              onArchive={(kind, item) => {
                void toggleCatalogArchive(kind, item);
              }}
            />
          </aside>
        ) : null}

        <section className="product-area">
          <div className="filters">
            <input
              id="product-search"
              placeholder="Search barcode, item name, category, brand"
              value={query.search ?? ""}
              onChange={(event) => {
                setQuery({ ...query, search: event.target.value, page: 1 });
              }}
            />
            <select
              value={query.categoryId ?? ""}
              onChange={(event) => {
                setQuery({ ...query, categoryId: event.target.value, page: 1 });
              }}
            >
              <option value="">All categories</option>
              {activeCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              value={query.brandId ?? ""}
              onChange={(event) => {
                setQuery({ ...query, brandId: event.target.value, page: 1 });
              }}
            >
              <option value="">All brands</option>
              {activeBrands.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <select
              value={query.status}
              onChange={(event) => {
                setQuery({ ...query, status: event.target.value as ProductStatusFilter, page: 1 });
              }}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="archived">Archived</option>
              <option value="all">All</option>
            </select>
          </div>

          {error !== null && (
            <div className="error-banner">
              <span>{error}</span>
              <button
                onClick={() => {
                  setError(null);
                }}
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  {[
                    ["barcode", "Barcode"],
                    ["name", "Item"],
                    ["purchasePrice", "Buy Price"],
                    ["salePrice", "Sale Price"],
                    ["stock", "Stock"],
                    ["status", "Status"]
                  ].map(([key, label]) => (
                    <th key={key}>
                      <button
                        className="sort-button"
                        onClick={() => {
                          setQuery({
                            ...query,
                            sortBy: key as ProductListRequest["sortBy"],
                            sortDirection:
                              query.sortBy === key && query.sortDirection === "asc" ? "desc" : "asc"
                          });
                        }}
                      >
                        {label}
                      </button>
                    </th>
                  ))}
                  <th>Category</th>
                  <th>Brand</th>
                  <th>Unit</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={10} className="state-cell">
                      Loading products...
                    </td>
                  </tr>
                ) : products.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="state-cell">
                      No items yet. Add your first item with name, price, and stock.
                    </td>
                  </tr>
                ) : (
                  products.map((product) => (
                    <tr key={product.id} onClick={() => void openDetails(product.id)}>
                      <td>{product.barcode ?? "-"}</td>
                      <td className="strong">{product.name}</td>
                      <td>{money(product.purchasePriceMinor)}</td>
                      <td>{money(product.salePriceMinor)}</td>
                      <td>{product.currentStock}</td>
                      <td>
                        <span
                          className={`pill ${product.archivedAt !== null ? "muted" : product.status}`}
                        >
                          {product.archivedAt !== null ? "archived" : product.status}
                        </span>
                      </td>
                      <td>{product.categoryName ?? "-"}</td>
                      <td>{product.brandName ?? "-"}</td>
                      <td>{product.unitName}</td>
                      <td>
                        <div
                          className="row-actions"
                          onClick={(event) => {
                            event.stopPropagation();
                          }}
                        >
                          <button onClick={() => void openEdit(product.id)}>Edit</button>
                          <button onClick={() => void archiveProduct(product)}>
                            {product.archivedAt === null ? "Archive" : "Restore"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <footer className="pagination">
            <span>
              Page {query.page} of {totalPages} · {totalItems} items
            </span>
            <div>
              <button
                disabled={query.page <= 1}
                onClick={() => {
                  setQuery({ ...query, page: query.page - 1 });
                }}
              >
                Previous
              </button>
              <button
                disabled={query.page >= totalPages}
                onClick={() => {
                  setQuery({ ...query, page: query.page + 1 });
                }}
              >
                Next
              </button>
            </div>
          </footer>
        </section>
      </section>

      {form !== null && (
        <ProductDialog
          form={form}
          categories={activeCategories}
          brands={activeBrands}
          units={activeUnits}
          saving={saving}
          setForm={setForm}
          onSave={saveProduct}
        />
      )}
      {catalogForm !== null && (
        <CatalogDialog form={catalogForm} setForm={setCatalogForm} onSave={saveCatalog} />
      )}
      {details !== null && (
        <ProductDrawer
          product={details}
          onClose={() => {
            setDetails(null);
          }}
        />
      )}
    </div>
  );
};

const inventoryColumns: readonly InventoryColumn[] = [
  "barcode",
  "sku",
  "product",
  "category",
  "currentStock",
  "availableStock",
  "minimumStock",
  "maximumStock",
  "purchasePrice",
  "retailPrice",
  "inventoryValue",
  "status",
  "actions"
];

const InventoryModule = ({
  showToast
}: {
  readonly showToast: (message: string, tone?: ToastState["tone"]) => void;
}) => {
  const [overview, setOverview] = useState<InventoryOverviewDto | null>(null);
  const [items, setItems] = useState<readonly InventoryItemDto[]>([]);
  const [movements, setMovements] = useState<readonly InventoryMovementDto[]>([]);
  const [products, setProducts] = useState<readonly ProductListItemDto[]>([]);
  const [query, setQuery] = useState<InventoryListRequest>({
    page: 1,
    pageSize: 10,
    sortBy: "product",
    sortDirection: "asc",
    status: "all"
  });
  const [movementQuery, setMovementQuery] = useState<InventoryMovementListRequest>({
    page: 1,
    pageSize: 12
  });
  const [totalItems, setTotalItems] = useState(0);
  const [movementTotal, setMovementTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"stock" | "movements" | "low" | "out">("stock");
  const [visibleColumns, setVisibleColumns] =
    useState<readonly InventoryColumn[]>(inventoryColumns);
  const [drawerItem, setDrawerItem] = useState<InventoryItemDto | null>(null);
  const [adjustment, setAdjustment] = useState<StockAdjustmentForm | null>(null);
  const [openingStock, setOpeningStock] = useState<readonly OpeningStockForm[]>([]);
  const [csvPreview, setCsvPreview] = useState<readonly OpeningStockForm[]>([]);

  const totalPages = Math.max(1, Math.ceil(totalItems / query.pageSize));
  const movementPages = Math.max(1, Math.ceil(movementTotal / movementQuery.pageSize));

  const loadInventory = useCallback(async () => {
    setLoading(true);
    const inventoryQuery =
      activeView === "low"
        ? { ...query, status: "low-stock" as const, page: 1 }
        : activeView === "out"
          ? { ...query, status: "out-of-stock" as const, page: 1 }
          : query;
    const [overviewResponse, listResponse, movementsResponse, productResponse] = await Promise.all([
      window.orix.inventory.overview(),
      window.orix.inventory.list(inventoryQuery),
      window.orix.inventory.movements(movementQuery),
      window.orix.products.list({
        page: 1,
        pageSize: 500,
        sortBy: "name",
        sortDirection: "asc",
        status: "active"
      })
    ]);
    if (overviewResponse.ok) {
      setOverview(overviewResponse.value);
    } else {
      showToast(overviewResponse.error.message, "error");
    }
    if (listResponse.ok) {
      setItems(listResponse.value.items);
      setTotalItems(listResponse.value.totalItems);
    } else {
      showToast(listResponse.error.message, "error");
    }
    if (movementsResponse.ok) {
      setMovements(movementsResponse.value.items);
      setMovementTotal(movementsResponse.value.totalItems);
    } else {
      showToast(movementsResponse.error.message, "error");
    }
    if (productResponse.ok) {
      setProducts(productResponse.value.items);
    }
    setLoading(false);
  }, [activeView, movementQuery, query, showToast]);

  useEffect(() => {
    void loadInventory();
  }, [loadInventory]);

  const exportCsv = () => {
    const headers = [
      "Barcode",
      "SKU",
      "Product",
      "Category",
      "Current Stock",
      "Available Stock",
      "Minimum Stock",
      "Purchase Price",
      "Retail Price",
      "Inventory Value",
      "Status"
    ];
    const rows = items.map((item) => [
      item.barcode ?? "",
      item.sku ?? "",
      item.productName,
      item.categoryName ?? "",
      String(item.currentStock),
      String(item.availableStock),
      String(item.minimumStock),
      fromMinor(item.purchasePriceMinor),
      fromMinor(item.retailPriceMinor),
      fromMinor(item.inventoryValuePurchaseMinor),
      item.status
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "orix-inventory.csv";
    anchor.click();
    URL.revokeObjectURL(url);
    showToast("Inventory CSV exported.");
  };

  const printReport = () => {
    window.print();
  };

  const submitAdjustment = async () => {
    if (adjustment === null) return;
    const validationError = validateStockAdjustmentForm(adjustment);
    if (validationError !== null) {
      showToast(validationError, "error");
      return;
    }
    const response = await window.orix.inventory.adjust({
      productId: adjustment.productId,
      direction: adjustment.direction,
      quantity: Number(adjustment.quantity),
      unitCostMinor: toMinor(adjustment.unitCost),
      reason: adjustment.reason,
      occurredAt: new Date(adjustment.occurredAt).toISOString(),
      notes: adjustment.notes || null
    });
    if (response.ok) {
      setAdjustment(null);
      showToast("Stock adjustment recorded.");
      await loadInventory();
    } else {
      showToast(response.error.message, "error");
    }
  };

  const submitOpeningStock = async () => {
    const entries = [...openingStock, ...csvPreview].filter((entry) => entry.productId !== "");
    const validationError = validateOpeningStockRows(entries);
    if (validationError !== null) {
      showToast(validationError, "error");
      return;
    }
    const payload: readonly OpeningStockEntryPayload[] = entries.map((entry) => ({
      productId: entry.productId,
      quantity: Number(entry.quantity),
      unitCostMinor: toMinor(entry.unitCost),
      occurredAt: new Date(entry.occurredAt).toISOString(),
      notes: entry.notes || null
    }));
    const response = await window.orix.inventory.openingStock({ entries: payload });
    if (response.ok) {
      setOpeningStock([]);
      setCsvPreview([]);
      showToast(`${String(response.value.transactionIds.length)} opening stock entries recorded.`);
      await loadInventory();
    } else {
      showToast(response.error.message, "error");
    }
  };

  const addOpeningRow = () => {
    setOpeningStock((rows) => [
      ...rows,
      {
        productId: products[0]?.id ?? "",
        quantity: "1",
        unitCost: "0",
        occurredAt: new Date().toISOString().slice(0, 16),
        notes: ""
      }
    ]);
  };

  const importCsv = async (file: File) => {
    const text = await file.text();
    const rows = text
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .slice(1)
      .map((line): OpeningStockForm => {
        const [barcode = "", quantity = "0", unitCost = "0", notes = ""] = line.split(",");
        const product = products.find((item) => item.barcode === barcode.trim());
        return {
          productId: product?.id ?? "",
          quantity: quantity.trim(),
          unitCost: unitCost.trim(),
          occurredAt: new Date().toISOString().slice(0, 16),
          notes: notes.trim()
        };
      });
    setCsvPreview(rows);
    showToast(`${String(rows.length)} CSV rows loaded for preview.`);
  };

  const updateOpeningRow = (index: number, row: OpeningStockForm) => {
    setOpeningStock((rows) => rows.map((item, itemIndex) => (itemIndex === index ? row : item)));
  };

  const visible = (column: InventoryColumn) => visibleColumns.includes(column);

  return (
    <section className="page-stack inventory-module">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Stock Control</p>
          <h1>Inventory</h1>
        </div>
        <div className="topbar-actions">
          <button onClick={exportCsv}>Export CSV</button>
          <button onClick={printReport}>Print</button>
          <button onClick={addOpeningRow}>Opening Stock</button>
          <button
            className="primary"
            onClick={() => {
              setAdjustment({
                productId: products[0]?.id ?? "",
                direction: "increase",
                quantity: "1",
                unitCost: "0",
                reason: "manual-correction",
                occurredAt: new Date().toISOString().slice(0, 16),
                notes: ""
              });
            }}
          >
            Adjust Stock
          </button>
        </div>
      </div>

      <div className="metric-grid inventory-metrics">
        <Metric label="Total Items" value={String(overview?.totalProducts ?? 0)} />
        <Metric label="Items In Stock" value={String(overview?.productsInStock ?? 0)} />
        <Metric label="Low Stock" value={String(overview?.lowStock ?? 0)} />
        <Metric label="Out Of Stock" value={String(overview?.outOfStock ?? 0)} />
        <Metric
          label="Inventory Value (Purchase)"
          value={money(overview?.inventoryValuePurchaseMinor ?? 0)}
        />
        <Metric
          label="Inventory Value (Retail)"
          value={money(overview?.inventoryValueRetailMinor ?? 0)}
        />
        <Metric label="Total Quantity" value={String(overview?.totalInventoryQuantity ?? 0)} />
      </div>

      <div className="inventory-tabs">
        {(["stock", "movements", "low", "out"] as const).map((view) => (
          <button
            className={activeView === view ? "primary" : ""}
            key={view}
            onClick={() => {
              setActiveView(view);
            }}
          >
            {view === "stock"
              ? "Stock"
              : view === "movements"
                ? "Movement History"
                : view === "low"
                  ? "Low Stock"
                  : "Out Of Stock"}
          </button>
        ))}
      </div>

      {activeView === "movements" ? (
        <MovementHistory
          movements={movements}
          products={products}
          query={movementQuery}
          totalPages={movementPages}
          onQuery={setMovementQuery}
        />
      ) : (
        <article className="product-area">
          <div className="filters inventory-filters">
            <input
              placeholder="Search barcode, SKU, item, category"
              value={query.search ?? ""}
              onChange={(event) => {
                setQuery({ ...query, search: event.target.value, page: 1 });
              }}
            />
            <select
              value={query.status ?? "all"}
              onChange={(event) => {
                setQuery({
                  ...query,
                  status: event.target.value as NonNullable<InventoryListRequest["status"]>,
                  page: 1
                });
              }}
            >
              <option value="all">All stock</option>
              <option value="in-stock">In stock</option>
              <option value="low-stock">Low stock</option>
              <option value="out-of-stock">Out of stock</option>
            </select>
            <ColumnPicker visibleColumns={visibleColumns} onChange={setVisibleColumns} />
            <label className="file-button">
              CSV Import
              <input
                accept=".csv,text/csv"
                type="file"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file !== undefined) void importCsv(file);
                }}
              />
            </label>
          </div>
          <div className="table-wrap inventory-table">
            <table>
              <thead>
                <tr>
                  {visible("barcode") ? (
                    <SortableTh label="Barcode" sortBy="barcode" query={query} onQuery={setQuery} />
                  ) : null}
                  {visible("sku") ? (
                    <SortableTh label="SKU" sortBy="sku" query={query} onQuery={setQuery} />
                  ) : null}
                  {visible("product") ? (
                    <SortableTh label="Item" sortBy="product" query={query} onQuery={setQuery} />
                  ) : null}
                  {visible("category") ? (
                    <SortableTh
                      label="Category"
                      sortBy="category"
                      query={query}
                      onQuery={setQuery}
                    />
                  ) : null}
                  {visible("currentStock") ? (
                    <SortableTh
                      label="Current"
                      sortBy="currentStock"
                      query={query}
                      onQuery={setQuery}
                    />
                  ) : null}
                  {visible("availableStock") ? <th>Available</th> : null}
                  {visible("minimumStock") ? (
                    <SortableTh
                      label="Minimum"
                      sortBy="minimumStock"
                      query={query}
                      onQuery={setQuery}
                    />
                  ) : null}
                  {visible("maximumStock") ? <th>Maximum</th> : null}
                  {visible("purchasePrice") ? (
                    <SortableTh
                      label="Purchase"
                      sortBy="purchasePrice"
                      query={query}
                      onQuery={setQuery}
                    />
                  ) : null}
                  {visible("retailPrice") ? (
                    <SortableTh
                      label="Retail"
                      sortBy="retailPrice"
                      query={query}
                      onQuery={setQuery}
                    />
                  ) : null}
                  {visible("inventoryValue") ? (
                    <SortableTh
                      label="Value"
                      sortBy="inventoryValue"
                      query={query}
                      onQuery={setQuery}
                    />
                  ) : null}
                  {visible("status") ? (
                    <SortableTh label="Status" sortBy="status" query={query} onQuery={setQuery} />
                  ) : null}
                  {visible("actions") ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="state-cell" colSpan={inventoryColumns.length}>
                      Loading inventory...
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td className="state-cell" colSpan={inventoryColumns.length}>
                      No inventory records found.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => (
                    <tr
                      key={item.productId}
                      onClick={() => {
                        setDrawerItem(item);
                      }}
                    >
                      {visible("barcode") ? <td>{item.barcode ?? "-"}</td> : null}
                      {visible("sku") ? <td>{item.sku ?? "-"}</td> : null}
                      {visible("product") ? <td className="strong">{item.productName}</td> : null}
                      {visible("category") ? <td>{item.categoryName ?? "-"}</td> : null}
                      {visible("currentStock") ? <td>{item.currentStock}</td> : null}
                      {visible("availableStock") ? <td>{item.availableStock}</td> : null}
                      {visible("minimumStock") ? <td>{item.minimumStock}</td> : null}
                      {visible("maximumStock") ? <td>{item.maximumStock ?? "-"}</td> : null}
                      {visible("purchasePrice") ? <td>{money(item.purchasePriceMinor)}</td> : null}
                      {visible("retailPrice") ? <td>{money(item.retailPriceMinor)}</td> : null}
                      {visible("inventoryValue") ? (
                        <td>{money(item.inventoryValuePurchaseMinor)}</td>
                      ) : null}
                      {visible("status") ? (
                        <td>
                          <span className={`pill ${item.status}`}>{item.status}</span>
                        </td>
                      ) : null}
                      {visible("actions") ? (
                        <td>
                          <button
                            onClick={(event) => {
                              event.stopPropagation();
                              setAdjustment({
                                productId: item.productId,
                                direction: "increase",
                                quantity: "1",
                                unitCost: fromMinor(item.purchasePriceMinor),
                                reason: "manual-correction",
                                occurredAt: new Date().toISOString().slice(0, 16),
                                notes: ""
                              });
                            }}
                          >
                            Adjust
                          </button>
                        </td>
                      ) : null}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination
            page={query.page}
            totalPages={totalPages}
            onPage={(page) => {
              setQuery({ ...query, page });
            }}
          />
        </article>
      )}

      {openingStock.length > 0 || csvPreview.length > 0 ? (
        <OpeningStockDialog
          rows={openingStock}
          csvPreview={csvPreview}
          products={products}
          onChange={updateOpeningRow}
          onAdd={addOpeningRow}
          onClose={() => {
            setOpeningStock([]);
            setCsvPreview([]);
          }}
          onSubmit={() => void submitOpeningStock()}
        />
      ) : null}
      {adjustment === null ? null : (
        <StockAdjustmentDialog
          form={adjustment}
          products={products}
          onChange={setAdjustment}
          onClose={() => {
            setAdjustment(null);
          }}
          onSubmit={() => void submitAdjustment()}
        />
      )}
      {drawerItem === null ? null : (
        <InventoryDrawer
          item={drawerItem}
          movements={movements.filter((movement) => movement.productId === drawerItem.productId)}
          onClose={() => {
            setDrawerItem(null);
          }}
        />
      )}
    </section>
  );
};

const Metric = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <article className="card metric-card">
    <span>{label}</span>
    <strong>{value}</strong>
  </article>
);

const ColumnPicker = ({
  visibleColumns,
  onChange
}: {
  readonly visibleColumns: readonly InventoryColumn[];
  readonly onChange: (columns: readonly InventoryColumn[]) => void;
}) => (
  <select
    value=""
    onChange={(event) => {
      const column = event.target.value as InventoryColumn;
      if (event.target.value === "") return;
      onChange(
        visibleColumns.includes(column)
          ? visibleColumns.filter((item) => item !== column)
          : [...visibleColumns, column]
      );
    }}
  >
    <option value="">Columns</option>
    {inventoryColumns.map((column) => (
      <option key={column} value={column}>
        {visibleColumns.includes(column) ? "Hide" : "Show"} {column}
      </option>
    ))}
  </select>
);

const SortableTh = ({
  label,
  sortBy,
  query,
  onQuery
}: {
  readonly label: string;
  readonly sortBy: InventoryListRequest["sortBy"];
  readonly query: InventoryListRequest;
  readonly onQuery: (query: InventoryListRequest) => void;
}) => (
  <th>
    <button
      className="sort-button"
      onClick={() => {
        onQuery({
          ...query,
          sortBy,
          sortDirection: query.sortBy === sortBy && query.sortDirection === "asc" ? "desc" : "asc"
        });
      }}
    >
      {label} {query.sortBy === sortBy ? (query.sortDirection === "asc" ? "↑" : "↓") : ""}
    </button>
  </th>
);

const Pagination = ({
  page,
  totalPages,
  onPage
}: {
  readonly page: number;
  readonly totalPages: number;
  readonly onPage: (page: number) => void;
}) => (
  <div className="pagination">
    <span>
      Page {page} of {totalPages}
    </span>
    <div>
      <button
        disabled={page <= 1}
        onClick={() => {
          onPage(page - 1);
        }}
      >
        Previous
      </button>
      <button
        disabled={page >= totalPages}
        onClick={() => {
          onPage(page + 1);
        }}
      >
        Next
      </button>
    </div>
  </div>
);

const MovementHistory = ({
  movements,
  products,
  query,
  totalPages,
  onQuery
}: {
  readonly movements: readonly InventoryMovementDto[];
  readonly products: readonly ProductListItemDto[];
  readonly query: InventoryMovementListRequest;
  readonly totalPages: number;
  readonly onQuery: (query: InventoryMovementListRequest) => void;
}) => (
  <article className="product-area">
    <div className="filters inventory-filters">
      <select
        value={query.productId ?? ""}
        onChange={(event) => {
          onQuery({ ...query, productId: event.target.value, page: 1 });
        }}
      >
        <option value="">All products</option>
        {products.map((product) => (
          <option key={product.id} value={product.id}>
            {product.name}
          </option>
        ))}
      </select>
      <select
        value={query.reason ?? ""}
        onChange={(event) => {
          onQuery({ ...query, reason: event.target.value, page: 1 });
        }}
      >
        <option value="">All reasons</option>
        <option value="opening-stock">Opening Stock</option>
        <option value="damaged">Damaged</option>
        <option value="expired">Expired</option>
        <option value="lost">Lost</option>
        <option value="found">Found</option>
        <option value="manual-correction">Manual Correction</option>
        <option value="stock-count-difference">Stock Count Difference</option>
        <option value="supplier-replacement">Supplier Replacement</option>
      </select>
      <input
        type="date"
        onChange={(event) => {
          onQuery({ ...query, dateFrom: event.target.value, page: 1 });
        }}
      />
      <input
        type="date"
        onChange={(event) => {
          onQuery({ ...query, dateTo: event.target.value, page: 1 });
        }}
      />
    </div>
    <div className="table-wrap inventory-table">
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Item</th>
            <th>Reason</th>
            <th>Quantity</th>
            <th>Before</th>
            <th>After</th>
            <th>User</th>
            <th>Reference</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          {movements.length === 0 ? (
            <tr>
              <td className="state-cell" colSpan={9}>
                No stock movements yet.
              </td>
            </tr>
          ) : (
            movements.map((movement) => (
              <tr key={movement.id}>
                <td>{new Date(movement.date).toLocaleString("en-PK")}</td>
                <td className="strong">{movement.productName}</td>
                <td>{movement.reason}</td>
                <td>
                  {movement.direction === "in" ? "+" : "-"}
                  {movement.quantity}
                </td>
                <td>{movement.beforeQuantity}</td>
                <td>{movement.afterQuantity}</td>
                <td>{movement.userName}</td>
                <td>{movement.reference}</td>
                <td>{movement.notes ?? "-"}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    <Pagination
      page={query.page}
      totalPages={totalPages}
      onPage={(page) => {
        onQuery({ ...query, page });
      }}
    />
  </article>
);

const OpeningStockDialog = ({
  rows,
  csvPreview,
  products,
  onChange,
  onAdd,
  onClose,
  onSubmit
}: {
  readonly rows: readonly OpeningStockForm[];
  readonly csvPreview: readonly OpeningStockForm[];
  readonly products: readonly ProductListItemDto[];
  readonly onChange: (index: number, row: OpeningStockForm) => void;
  readonly onAdd: () => void;
  readonly onClose: () => void;
  readonly onSubmit: () => void;
}) => (
  <OpeningStockDialogContent
    rows={rows}
    csvPreview={csvPreview}
    products={products}
    onChange={onChange}
    onAdd={onAdd}
    onClose={onClose}
    onSubmit={onSubmit}
  />
);

const OpeningStockDialogContent = ({
  rows,
  csvPreview,
  products,
  onChange,
  onAdd,
  onClose,
  onSubmit
}: {
  readonly rows: readonly OpeningStockForm[];
  readonly csvPreview: readonly OpeningStockForm[];
  readonly products: readonly ProductListItemDto[];
  readonly onChange: (index: number, row: OpeningStockForm) => void;
  readonly onAdd: () => void;
  readonly onClose: () => void;
  readonly onSubmit: () => void;
}) => {
  const [submitted, setSubmitted] = useState(false);
  const entries = [...rows, ...csvPreview].filter((entry) => entry.productId !== "");
  const errors = submitted ? openingStockErrors(entries) : {};

  return (
    <div className="modal-backdrop">
      <section className="modal">
        <header>
          <h2>Opening Stock Wizard</h2>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="opening-stock-body">
          <p className="muted-text">
            Step 1: enter or import products. Step 2: review. Step 3: confirm immutable
            transactions.
          </p>
          {errors.rows === undefined ? null : <small className="field-error">{errors.rows}</small>}
          {rows.map((row, index) => (
            <div className="opening-row" key={index}>
              <ProductSelect
                value={row.productId}
                products={products}
                onChange={(productId) => {
                  onChange(index, { ...row, productId });
                }}
              />
              <input
                value={row.quantity}
                type="number"
                min="0"
                onChange={(event) => {
                  onChange(index, { ...row, quantity: event.target.value });
                }}
              />
              <input
                value={row.unitCost}
                type="number"
                min="0"
                step="0.01"
                onChange={(event) => {
                  onChange(index, { ...row, unitCost: event.target.value });
                }}
              />
              <input
                value={row.occurredAt}
                type="datetime-local"
                onChange={(event) => {
                  onChange(index, { ...row, occurredAt: event.target.value });
                }}
              />
              <input
                value={row.notes}
                placeholder="Notes"
                onChange={(event) => {
                  onChange(index, { ...row, notes: event.target.value });
                }}
              />
              {submitted && openingStockRowError(row) !== null ? (
                <small className="field-error opening-row-error">{openingStockRowError(row)}</small>
              ) : null}
            </div>
          ))}
          {csvPreview.length === 0 ? null : (
            <div className="confirmation-summary">
              <strong>CSV Preview: {csvPreview.length} rows</strong>
              <span>
                {csvPreview.filter((row) => row.productId === "").length} rows need product matching
                before save.
              </span>
            </div>
          )}
        </div>
        <footer>
          <button onClick={onAdd}>Add Row</button>
          <button
            className="primary"
            onClick={() => {
              setSubmitted(true);
              onSubmit();
            }}
          >
            Confirm Opening Stock
          </button>
        </footer>
      </section>
    </div>
  );
};

const StockAdjustmentDialog = ({
  form,
  products,
  onChange,
  onClose,
  onSubmit
}: {
  readonly form: StockAdjustmentForm;
  readonly products: readonly ProductListItemDto[];
  readonly onChange: (form: StockAdjustmentForm) => void;
  readonly onClose: () => void;
  readonly onSubmit: () => void;
}) => (
  <StockAdjustmentDialogContent
    form={form}
    products={products}
    onChange={onChange}
    onClose={onClose}
    onSubmit={onSubmit}
  />
);

const StockAdjustmentDialogContent = ({
  form,
  products,
  onChange,
  onClose,
  onSubmit
}: {
  readonly form: StockAdjustmentForm;
  readonly products: readonly ProductListItemDto[];
  readonly onChange: (form: StockAdjustmentForm) => void;
  readonly onClose: () => void;
  readonly onSubmit: () => void;
}) => {
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? stockAdjustmentErrors(form) : {};

  return (
    <div className="modal-backdrop">
      <section className="modal small">
        <header>
          <h2>Stock Adjustment</h2>
          <button onClick={onClose}>Close</button>
        </header>
        <div className="form-grid">
          <label
            className={
              errors.productId === undefined ? "field-control wide" : "field-control has-error wide"
            }
          >
            Product
            <ProductSelect
              value={form.productId}
              products={products}
              onChange={(productId) => {
                onChange({ ...form, productId });
              }}
            />
            {errors.productId === undefined ? null : (
              <small className="field-error">{errors.productId}</small>
            )}
          </label>
          <label>
            Direction
            <select
              value={form.direction}
              onChange={(event) => {
                onChange({
                  ...form,
                  direction: event.target.value as StockAdjustmentForm["direction"]
                });
              }}
            >
              <option value="increase">Increase</option>
              <option value="decrease">Decrease</option>
            </select>
          </label>
          <label>
            Reason
            <select
              value={form.reason}
              onChange={(event) => {
                onChange({ ...form, reason: event.target.value as StockAdjustmentForm["reason"] });
              }}
            >
              <option value="opening-stock">Opening Stock</option>
              <option value="damaged">Damaged</option>
              <option value="expired">Expired</option>
              <option value="lost">Lost</option>
              <option value="found">Found</option>
              <option value="manual-correction">Manual Correction</option>
              <option value="stock-count-difference">Stock Count Difference</option>
              <option value="supplier-replacement">Supplier Replacement</option>
            </select>
          </label>
          <Field
            label="Quantity *"
            type="number"
            value={form.quantity}
            error={errors.quantity}
            min={0}
            required
            onChange={(quantity) => {
              onChange({ ...form, quantity });
            }}
          />
          <Field
            label="Cost Price"
            type="number"
            value={form.unitCost}
            error={errors.unitCost}
            min={0}
            onChange={(unitCost) => {
              onChange({ ...form, unitCost });
            }}
          />
          <label
            className={
              errors.occurredAt === undefined
                ? "field-control wide"
                : "field-control has-error wide"
            }
          >
            Date
            <input
              type="datetime-local"
              value={form.occurredAt}
              aria-invalid={errors.occurredAt === undefined ? undefined : true}
              onChange={(event) => {
                onChange({ ...form, occurredAt: event.target.value });
              }}
            />
            {errors.occurredAt === undefined ? null : (
              <small className="field-error">{errors.occurredAt}</small>
            )}
          </label>
          <label className="wide">
            Notes
            <textarea
              value={form.notes}
              onChange={(event) => {
                onChange({ ...form, notes: event.target.value });
              }}
            />
          </label>
        </div>
        <footer>
          <button onClick={onClose}>Cancel</button>
          <button
            className="primary"
            onClick={() => {
              setSubmitted(true);
              onSubmit();
            }}
          >
            Record Adjustment
          </button>
        </footer>
      </section>
    </div>
  );
};

const ProductSelect = ({
  value,
  products,
  onChange
}: {
  readonly value: string;
  readonly products: readonly ProductListItemDto[];
  readonly onChange: (productId: string) => void;
}) => (
  <select
    value={value}
    onChange={(event) => {
      onChange(event.target.value);
    }}
  >
    <option value="">Select product</option>
    {products.map((product) => (
      <option key={product.id} value={product.id}>
        {product.name}
      </option>
    ))}
  </select>
);

const InventoryDrawer = ({
  item,
  movements,
  onClose
}: {
  readonly item: InventoryItemDto;
  readonly movements: readonly InventoryMovementDto[];
  readonly onClose: () => void;
}) => (
  <div className="drawer-backdrop">
    <aside className="drawer">
      <header>
        <h2>{item.productName}</h2>
        <button onClick={onClose}>Close</button>
      </header>
      <section className="detail-section">
        <h3>Stock Summary</h3>
        <Detail label="Current Stock" value={String(item.currentStock)} />
        <Detail label="Reserved" value={String(item.reservedStock)} />
        <Detail label="Available" value={String(item.availableStock)} />
        <Detail label="Inventory Value" value={money(item.inventoryValuePurchaseMinor)} />
      </section>
      <section className="detail-section">
        <h3>Movement History</h3>
        {movements.length === 0 ? (
          <EmptyState title="No stock changes yet" description="Stock changes will appear here." />
        ) : (
          movements
            .slice(0, 8)
            .map((movement) => (
              <Detail
                key={movement.id}
                label={new Date(movement.date).toLocaleDateString("en-PK")}
                value={`${movement.direction === "in" ? "+" : "-"}${String(movement.quantity)}`}
              />
            ))
        )}
      </section>
    </aside>
  </div>
);

const TitleBar = ({
  context,
  clock,
  onNavigate
}: {
  readonly context: AppContextDto | null;
  readonly clock: Date;
  readonly onNavigate: (route: RouteId) => void;
}) => (
  <header className="title-bar">
    <div className="title-identity">
      <strong>{context?.storeName ?? "Orix Retail OS"}</strong>
      <span className={`badge ${context?.businessDayStatus === "open" ? "success" : "muted"}`}>
        {context?.businessDayStatus === "open" ? "Business Day Open" : "Business Day Closed"}
      </span>
    </div>
    <div className="title-meta">
      <span>{context?.currentBranch ?? "Main Branch"}</span>
      <span>{context?.currentUser ?? "Owner"}</span>
      <span>{clock.toLocaleString("en-PK")}</span>
    </div>
    <div className="title-actions">
      <button
        title="Settings"
        aria-label="Settings"
        onClick={() => {
          onNavigate("settings");
        }}
      >
        <Icon name="settings" />
        <span>Settings</span>
      </button>
    </div>
  </header>
);

const Sidebar = ({
  activeRoute,
  collapsed,
  onNavigate,
  onToggle,
  permissions
}: {
  readonly activeRoute: RouteId;
  readonly collapsed: boolean;
  readonly onNavigate: (route: RouteId) => void;
  readonly onToggle: () => void;
  readonly permissions: readonly AppContextDto["permissions"][number][];
}) => {
  const sections = ["main", "operations", "system"] as const;
  const sectionLabels = {
    main: "Daily Work",
    operations: "Stock & Accounts",
    system: "System"
  } as const;
  const routeIcons: Record<RouteId, IconName> = {
    about: "receipt",
    customers: "users",
    dashboard: "home",
    expenses: "cash",
    inventory: "warehouse",
    pos: "cash",
    products: "package",
    purchases: "truck",
    reports: "receipt",
    sales: "receipt",
    settings: "settings",
    suppliers: "truck"
  };
  const visibleRoutes = routes.filter(
    (route) => route.ready && permissions.includes(routePermissions[route.id])
  );
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="sidebar-head">
        {collapsed ? null : <span>Menu</span>}
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          title={collapsed ? "Expand menu" : "Collapse menu"}
          aria-label={collapsed ? "Expand menu" : "Collapse menu"}
        >
          <Icon name={collapsed ? "chevronRight" : "chevronLeft"} />
        </button>
      </div>
      {sections.map((section) => (
        <nav className="nav-section" key={section}>
          {collapsed ? null : <span className="nav-section-label">{sectionLabels[section]}</span>}
          {visibleRoutes
            .filter((route) => route.section === section)
            .map((route) => (
              <button
                className={`nav-item ${activeRoute === route.id ? "active" : ""}`}
                key={route.id}
                onClick={() => {
                  onNavigate(route.id);
                }}
                title={route.label}
              >
                <span className="nav-icon">
                  <Icon name={routeIcons[route.id]} />
                </span>
                {collapsed ? null : <span>{route.label}</span>}
              </button>
            ))}
        </nav>
      ))}
    </aside>
  );
};

const StatusBar = ({ context }: { readonly context: AppContextDto | null }) => (
  <footer className="status-bar">
    <span className="status-dot online" /> Database connected
    <span>{context?.currentBranch ?? "Main Branch"}</span>
    <span>Business day: {context?.businessDayStatus ?? "loading"}</span>
    <span>Version {context?.applicationVersion ?? "0.0.0"}</span>
    <span>Offline mode</span>
  </footer>
);

const DashboardPage = ({
  onNavigate,
  showToast
}: {
  readonly onNavigate: (route: RouteId) => void;
  readonly showToast: (message: string, tone?: ToastState["tone"]) => void;
}) => {
  const [dashboard, setDashboard] = useState<DashboardDto | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    const response = await window.orix.dashboard.get();
    if (response.ok) {
      setDashboard(response.value);
    } else {
      showToast(response.error.message, "error");
    }
    setLoading(false);
  }, [showToast]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  if (loading) {
    return <LoadingState label="Loading dashboard" />;
  }

  const metrics = [
    ["Sales Today", money(dashboard?.todaySalesMinor ?? 0), "Completed sales"],
    ["Cash Drawer", money(dashboard?.cashInDrawerMinor ?? 0), "Expected cash"],
    ["Customer Dues", money(dashboard?.outstandingCustomersMinor ?? 0), "Money to collect"],
    ["Low Stock", String(dashboard?.lowStockCount ?? 0), "Items to check"]
  ] as const;

  return (
    <section className="page-stack">
      <div className="home-hero">
        <div className="home-hero-copy">
          <p className="eyebrow">Today</p>
          <h1>Run your shop from here</h1>
          <p>
            Start a sale, add items, receive customer money, or check stock without hunting through
            menus.
          </p>
        </div>
        <button
          className="home-primary-action"
          onClick={() => {
            onNavigate("pos");
          }}
        >
          <span>Start Selling</span>
          <strong>Open POS</strong>
        </button>
      </div>
      <div className="home-toolbar">
        <span>Choose a common task</span>
        <button className="ghost" onClick={() => void loadDashboard()}>
          Refresh
        </button>
      </div>
      <div className="action-grid compact-actions">
        <button
          className="action-card"
          onClick={() => {
            onNavigate("pos");
          }}
        >
          <span>Sell items</span>
          <strong>POS</strong>
          <small>Scan items and take payment.</small>
        </button>
        <button
          className="action-card"
          onClick={() => {
            onNavigate("products");
          }}
        >
          <span>Add item</span>
          <strong>Items</strong>
          <small>Set name, barcode, price, and stock.</small>
        </button>
        <button
          className="action-card"
          onClick={() => {
            onNavigate("customers");
          }}
        >
          <span>Receive money</span>
          <strong>Customer Book</strong>
          <small>Record customer payments.</small>
        </button>
        <button
          className="action-card"
          onClick={() => {
            onNavigate("inventory");
          }}
        >
          <span>Check stock</span>
          <strong>Stock</strong>
          <small>Review stock and movements.</small>
        </button>
      </div>
      <div className="metric-grid home-metrics">
        {metrics.map(([label, value, helper]) => (
          <article className="card metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{helper}</small>
          </article>
        ))}
      </div>
      <div className="home-panels">
        <article className="card">
          <h2>Needs attention</h2>
          <div className="attention-list">
            <div>
              <span>Customer money to collect</span>
              <strong>{money(dashboard?.outstandingCustomersMinor ?? 0)}</strong>
            </div>
            <div>
              <span>Supplier money to pay</span>
              <strong>{money(Math.abs(dashboard?.outstandingSuppliersMinor ?? 0))}</strong>
            </div>
            <div>
              <span>Low stock items</span>
              <strong>{dashboard?.lowStockCount ?? 0}</strong>
            </div>
          </div>
        </article>
        <article className="card">
          <h2>Latest activity</h2>
          {dashboard?.recentActivity.length === 0 ? (
            <EmptyState
              title="No activity yet"
              description="Sales, payments, and stock changes will appear here."
            />
          ) : (
            <div className="activity-list">
              {dashboard?.recentActivity.slice(0, 6).map((activity) => (
                <div className="activity-item" key={activity.id}>
                  <strong>{activity.name}</strong>
                  <span>{new Date(activity.occurredAt).toLocaleString("en-PK")}</span>
                </div>
              ))}
            </div>
          )}
        </article>
      </div>
    </section>
  );
};

const SettingsPage = ({
  settings,
  canManageUsers,
  canManageMigration,
  onSaved,
  onThemePreview,
  showToast
}: {
  readonly settings: AppSettingsDto | null;
  readonly canManageUsers: boolean;
  readonly canManageMigration: boolean;
  readonly onSaved: (settings: AppSettingsDto) => void;
  readonly onThemePreview: (theme: AppSettingsDto["theme"]) => void;
  readonly showToast: (message: string, tone?: ToastState["tone"]) => void;
}) => {
  const [draft, setDraft] = useState<AppSettingsDto>(
    settings ?? {
      theme: "system",
      storeDisplayName: "My Store",
      receiptHeader: "Orix Retail OS",
      receiptFooter: "Thank you for shopping with us.",
      backupLocation: ""
    }
  );
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? settingsErrors(draft) : {};

  useEffect(() => {
    if (settings !== null) {
      setDraft(settings);
    }
  }, [settings]);

  const saveSettings = async () => {
    setSubmitted(true);
    const validationError = validateSettingsDraft(draft);
    if (validationError !== null) {
      showToast(validationError, "error");
      return;
    }
    const response = await window.orix.settings.save(draft);
    if (response.ok) {
      onSaved(response.value);
    } else {
      showToast(response.error.message, "error");
    }
  };

  const changeTheme = async (theme: AppSettingsDto["theme"]) => {
    const nextDraft = { ...draft, theme };
    setDraft(nextDraft);
    onThemePreview(theme);
    const response = await window.orix.settings.save(nextDraft);
    if (response.ok) {
      onSaved(response.value);
    } else {
      showToast(response.error.message, "error");
    }
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Application</p>
          <h1>Settings</h1>
        </div>
        <button className="primary" onClick={() => void saveSettings()}>
          Save Settings
        </button>
      </div>
      <div className="settings-grid">
        <SettingsPanel title="General">
          <label>
            Theme
            <select
              value={draft.theme}
              onChange={(event) => {
                void changeTheme(event.target.value as AppSettingsDto["theme"]);
              }}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </SettingsPanel>
        <SettingsPanel title="Store Information">
          <Field
            label="Store display name *"
            value={draft.storeDisplayName}
            error={errors.storeDisplayName}
            required
            onChange={(storeDisplayName) => {
              setDraft({ ...draft, storeDisplayName });
            }}
          />
        </SettingsPanel>
        <SettingsPanel title="Receipt">
          <Field
            label="Header *"
            value={draft.receiptHeader}
            error={errors.receiptHeader}
            required
            onChange={(receiptHeader) => {
              setDraft({ ...draft, receiptHeader });
            }}
          />
          <Field
            label="Footer *"
            value={draft.receiptFooter}
            error={errors.receiptFooter}
            required
            onChange={(receiptFooter) => {
              setDraft({ ...draft, receiptFooter });
            }}
          />
        </SettingsPanel>
        <SettingsPanel title="Database">
          <LegacyStockImportTool canManage={canManageMigration} showToast={showToast} />
        </SettingsPanel>
        <SettingsPanel title="Backup">
          <BackupTool
            canManage={canManageMigration}
            settings={draft}
            onSettingsSaved={(savedSettings) => {
              setDraft(savedSettings);
              onSaved(savedSettings);
            }}
            showToast={showToast}
          />
        </SettingsPanel>
        <SettingsPanel title="Users">
          <UserManagement canManage={canManageUsers} showToast={showToast} />
        </SettingsPanel>
      </div>
    </section>
  );
};

const BackupTool = ({
  canManage,
  settings,
  onSettingsSaved,
  showToast
}: {
  readonly canManage: boolean;
  readonly settings: AppSettingsDto;
  readonly onSettingsSaved: (settings: AppSettingsDto) => void;
  readonly showToast: (message: string, tone?: ToastState["tone"]) => void;
}) => {
  const [status, setStatus] = useState<BackupStatusDto | null>(null);
  const [selectedRestoreFile, setSelectedRestoreFile] = useState("");
  const [restoreConfirmation, setRestoreConfirmation] = useState("");
  const [busy, setBusy] = useState<
    "load" | "folder" | "backup" | "file" | "verify" | "restore" | null
  >("load");

  const loadStatus = useCallback(async () => {
    setBusy((current) => current ?? "load");
    const response = await window.orix.backups.status();
    if (response.ok) {
      setStatus(response.value);
    } else {
      showToast(response.error.message, "error");
    }
    setBusy((current) => (current === "load" ? null : current));
  }, [showToast]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const backupLocationLabel =
    status?.backupLocation ??
    (settings.backupLocation.trim() === "" ? "Default backup folder" : settings.backupLocation);

  const chooseFolder = async () => {
    setBusy("folder");
    const response = await window.orix.backups.selectDirectory();
    if (response.ok && response.value.directoryPath !== null) {
      const saved = await window.orix.settings.get();
      if (saved.ok) {
        onSettingsSaved(saved.value);
      }
      showToast("Backup folder updated.");
      await loadStatus();
    } else if (!response.ok) {
      showToast(response.error.message, "error");
    }
    setBusy(null);
  };

  const createBackup = async () => {
    setBusy("backup");
    const response = await window.orix.backups.create();
    if (response.ok) {
      showToast("Backup created and verified.");
      await loadStatus();
    } else {
      showToast(response.error.message, "error");
    }
    setBusy(null);
  };

  const chooseRestoreFile = async () => {
    setBusy("file");
    const response = await window.orix.backups.selectFile();
    if (response.ok && response.value.filePath !== null) {
      setSelectedRestoreFile(response.value.filePath);
      setRestoreConfirmation("");
      showToast("Backup file selected. Verify it before restoring.");
    } else if (!response.ok) {
      showToast(response.error.message, "error");
    }
    setBusy(null);
  };

  const verifyRestoreFile = async () => {
    if (selectedRestoreFile.trim() === "") {
      showToast("Choose a backup file first.", "error");
      return;
    }
    setBusy("verify");
    const response = await window.orix.backups.verify(selectedRestoreFile.trim());
    if (response.ok) {
      showToast(response.value.message, response.value.valid ? "success" : "error");
    } else {
      showToast(response.error.message, "error");
    }
    setBusy(null);
  };

  const restoreBackup = async () => {
    if (selectedRestoreFile.trim() === "") {
      showToast("Choose a backup file first.", "error");
      return;
    }
    if (restoreConfirmation !== "RESTORE") {
      showToast("Type RESTORE to confirm database replacement.", "error");
      return;
    }
    setBusy("restore");
    const response = await window.orix.backups.restore({
      filePath: selectedRestoreFile.trim(),
      confirmation: "RESTORE"
    });
    if (response.ok) {
      showToast("Restore complete. Orix will restart now.");
    } else {
      showToast(response.error.message, "error");
      setBusy(null);
    }
  };

  if (!canManage) {
    return <EmptyState title="Backups locked" description="Only owners can manage backups." />;
  }

  return (
    <div className="backup-tool">
      <div className="backup-summary">
        <div>
          <strong>Backup & restore</strong>
          <span>{backupLocationLabel}</span>
        </div>
        <BackupStatusBadge backup={status?.lastBackup ?? null} />
      </div>
      <div className="backup-actions">
        <button onClick={() => void chooseFolder()} disabled={busy !== null}>
          <Icon name="folder" />
          Choose folder
        </button>
        <button className="primary" onClick={() => void createBackup()} disabled={busy !== null}>
          <Icon name="upload" />
          Backup now
        </button>
      </div>
      <div className="backup-recent">
        {(status?.recentBackups ?? []).length === 0 ? (
          <EmptyState
            title="No backups yet"
            description="Create a backup before imports, upgrades, or major store changes."
          />
        ) : (
          status?.recentBackups
            .slice(0, 3)
            .map((backup) => <BackupRow key={backup.id} backup={backup} />)
        )}
      </div>
      <div className="backup-restore">
        <strong>Restore from backup</strong>
        <span>Restoring replaces the current database and restarts Orix Retail OS.</span>
        <button onClick={() => void chooseRestoreFile()} disabled={busy !== null}>
          <Icon name="folder" />
          Choose backup file
        </button>
        {selectedRestoreFile !== "" ? <small>{selectedRestoreFile}</small> : null}
        <div className="backup-actions">
          <button onClick={() => void verifyRestoreFile()} disabled={busy !== null}>
            <Icon name="search" />
            Verify
          </button>
          <input
            value={restoreConfirmation}
            placeholder="Type RESTORE"
            onChange={(event) => {
              setRestoreConfirmation(event.target.value);
            }}
          />
          <button
            className="danger"
            onClick={() => void restoreBackup()}
            disabled={busy !== null || restoreConfirmation !== "RESTORE"}
          >
            Restore
          </button>
        </div>
      </div>
      {busy !== null ? <p className="muted-text">Backup tool is working...</p> : null}
    </div>
  );
};

const BackupStatusBadge = ({ backup }: { readonly backup: BackupRecordDto | null }) => {
  if (backup === null) {
    return <span className="backup-badge warning">No backup</span>;
  }
  return (
    <span className={`backup-badge ${backup.status === "completed" ? "success" : "warning"}`}>
      {backup.status === "completed" ? "Protected" : "Needs attention"}
    </span>
  );
};

const BackupRow = ({ backup }: { readonly backup: BackupRecordDto }) => (
  <div className="backup-row">
    <span>
      <strong>{backup.backupNumber}</strong>
      <small>{backup.fileName}</small>
    </span>
    <span>
      {backup.completedAt === null
        ? "Not completed"
        : new Date(backup.completedAt).toLocaleString()}
    </span>
    <span>{backup.fileSizeBytes === null ? "-" : formatFileSize(backup.fileSizeBytes)}</span>
  </div>
);

const formatFileSize = (size: number): string => {
  if (size < 1024) return `${String(size)} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
};

const LegacyStockImportTool = ({
  canManage,
  showToast
}: {
  readonly canManage: boolean;
  readonly showToast: (message: string, tone?: ToastState["tone"]) => void;
}) => {
  const [itemsFile, setItemsFile] = useState("");
  const [sqlFile, setSqlFile] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<readonly string[]>([]);
  const [preview, setPreview] = useState<LegacyStockImportPreviewDto | null>(null);
  const [result, setResult] = useState<LegacyStockImportResultDto | null>(null);
  const [busy, setBusy] = useState<"select" | "preview" | "import" | null>(null);

  const chooseFiles = async () => {
    setBusy("select");
    setResult(null);
    const response = await window.orix.migration.selectLegacyStockFiles();
    setBusy(null);
    if (!response.ok) {
      showToast(response.error.message, "error");
      return;
    }
    setSelectedFiles(response.value.selectedFiles);
    if (response.value.itemsFile !== null) setItemsFile(response.value.itemsFile);
    if (response.value.sqlFile !== null) setSqlFile(response.value.sqlFile);
    setPreview(null);
    if (response.value.itemsFile === null) {
      showToast("No product list file was detected. Select the export files again.", "error");
      return;
    }
    if (response.value.sqlFile === null) {
      showToast("Product file found. Stock data file is still needed for quantities.", "error");
      return;
    }
    showToast("Files detected. Preview the import before continuing.");
  };

  const runPreview = async () => {
    if (itemsFile.trim() === "") {
      showToast("Select the previous software items file first.", "error");
      return;
    }
    setBusy("preview");
    setResult(null);
    const response = await window.orix.migration.previewLegacyStock({
      itemsFile: itemsFile.trim(),
      ...(sqlFile.trim() === "" ? {} : { sqlFile: sqlFile.trim() })
    });
    setBusy(null);
    if (response.ok) {
      setPreview(response.value);
      showToast(
        sqlFile.trim() === ""
          ? "Product preview ready. Select the old stock or backup file before importing."
          : "Migration preview ready."
      );
    } else {
      showToast(response.error.message, "error");
    }
  };

  const runImport = async () => {
    if (itemsFile.trim() === "") {
      showToast("Select the old software product list before importing.", "error");
      return;
    }
    if (sqlFile.trim() === "") {
      showToast(
        "Select the old software stock or backup file so quantities can be imported.",
        "error"
      );
      return;
    }
    const backupStatus = await window.orix.backups.status();
    if (!backupStatus.ok || backupStatus.value.lastBackup?.status !== "completed") {
      showToast("Create a verified backup before importing stock.", "error");
      return;
    }
    setBusy("import");
    const response = await window.orix.migration.importLegacyStock({
      itemsFile: itemsFile.trim(),
      sqlFile: sqlFile.trim(),
      mode: "valid-only"
    });
    setBusy(null);
    if (response.ok) {
      setResult(response.value);
      showToast(`Imported ${String(response.value.createdProducts)} products.`);
    } else {
      showToast(response.error.message, "error");
    }
  };

  const issueCounts = countMigrationIssues(preview?.issues ?? []);
  const blockingCount = issueCounts.error;
  const warningCount = issueCounts.warning;

  if (!canManage) {
    return (
      <EmptyState title="Migration locked" description="Only owners can import external data." />
    );
  }

  return (
    <div className="migration-tool">
      <div className="migration-intro">
        <strong>Import from previous software</strong>
        <span>
          Select all export or backup files from the old software at once. Orix will detect the
          product list and stock quantities automatically.
        </span>
      </div>
      <div className="migration-steps">
        <div className={`migration-step ${selectedFiles.length > 0 ? "complete" : ""}`}>
          <span>1</span>
          <strong>Choose old software files</strong>
          <small>
            {selectedFiles.length === 0
              ? "No files selected"
              : `${String(selectedFiles.length)} files selected`}
          </small>
        </div>
        <div className={`migration-step ${preview !== null ? "complete" : ""}`}>
          <span>2</span>
          <strong>Preview detected data</strong>
          <small>Review products, stock, and problems before import</small>
        </div>
        <div className={`migration-step ${result !== null ? "complete" : ""}`}>
          <span>3</span>
          <strong>Import ready items</strong>
          <small>Clean rows become products and opening stock</small>
        </div>
      </div>
      <div className="migration-actions">
        <button onClick={() => void chooseFiles()} disabled={busy !== null}>
          <Icon name="folder" />
          Select old software files
        </button>
        <button
          onClick={() => void runPreview()}
          disabled={busy !== null || itemsFile === ""}
          title={itemsFile === "" ? "Select files first" : "Preview import"}
        >
          <Icon name="search" />
          Preview
        </button>
        <button
          className="primary"
          onClick={() => void runImport()}
          disabled={busy !== null || preview === null || sqlFile === ""}
          title={
            sqlFile === "" ? "Stock data file is required before import" : "Import ready items"
          }
        >
          <Icon name="upload" />
          Import ready items
        </button>
      </div>
      <div className="migration-detection">
        <div className={itemsFile === "" ? "missing" : "found"}>
          <strong>Product list</strong>
          <span>{itemsFile === "" ? "Not detected yet" : "Detected"}</span>
        </div>
        <div className={sqlFile === "" ? "missing" : "found"}>
          <strong>Stock quantities</strong>
          <span>{sqlFile === "" ? "Not detected yet" : "Detected"}</span>
        </div>
      </div>
      {itemsFile !== "" && sqlFile === "" ? (
        <p className="field-error">
          Products can be previewed, but stock quantities cannot be imported until the old stock or
          backup file is selected.
        </p>
      ) : null}
      {selectedFiles.length > 0 ? (
        <details className="migration-files">
          <summary>Selected files</summary>
          {selectedFiles.map((filePath) => (
            <span key={filePath}>{filePath}</span>
          ))}
        </details>
      ) : null}
      {busy !== null ? <p className="muted-text">Working on import...</p> : null}
      {preview === null ? (
        <EmptyState
          title="Previous software import"
          description="Start by selecting all export files from the old system. Orix will tell you what it can import."
        />
      ) : (
        <div className="migration-preview">
          <div className="migration-store">
            <strong>{preview.store.company ?? "Previous software store"}</strong>
            <span>{preview.store.address ?? "No address found"}</span>
            <span>{preview.store.phone ?? "No phone found"}</span>
          </div>
          <div className="migration-metrics">
            <Metric label="Active Items" value={String(preview.totals.activeItems)} />
            <Metric label="With Stock" value={String(preview.totals.productsWithPositiveStock)} />
            <Metric
              label="Negative Stock"
              value={String(preview.totals.productsWithNegativeStock)}
            />
            <Metric label="Duplicate Barcodes" value={String(preview.totals.duplicateBarcodes)} />
          </div>
          <p className="muted-text">
            {blockingCount} blocking issues and {warningCount} warnings found. Import keeps the old
            system's current stock where data is clean and skips blocked products for review.
          </p>
          <div className="migration-sample">
            {preview.sampleProducts.slice(0, 6).map((product) => (
              <div className="migration-sample-row" key={product.sourceItemId}>
                <span>
                  <strong>{product.name}</strong>
                  <small>{product.barcode ?? "No barcode"}</small>
                </span>
                <span>{money(product.salePriceMinor)}</span>
                <span>Stock {product.openingStock}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {result !== null ? (
        <div className="migration-result">
          <strong>Import complete</strong>
          <span>{result.createdProducts} products created</span>
          <span>{result.openingStockTransactions} opening stock transactions posted</span>
          <span>{result.skippedProducts.length} products skipped for review</span>
        </div>
      ) : null}
    </div>
  );
};

const countMigrationIssues = (
  issues: readonly MigrationIssueDto[]
): { readonly error: number; readonly warning: number; readonly info: number } =>
  issues.reduce(
    (counts, issue) => ({
      error: counts.error + (issue.severity === "error" ? 1 : 0),
      warning: counts.warning + (issue.severity === "warning" ? 1 : 0),
      info: counts.info + (issue.severity === "info" ? 1 : 0)
    }),
    { error: 0, warning: 0, info: 0 }
  );

const UserManagement = ({
  canManage,
  showToast
}: {
  readonly canManage: boolean;
  readonly showToast: (message: string, tone?: ToastState["tone"]) => void;
}) => {
  const [users, setUsers] = useState<readonly AuthUserDto[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "disabled">("all");
  const [form, setForm] = useState<UserFormState | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);
  const userErrors = form === null || !submitted ? {} : userFormErrors(form);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const response = await window.orix.users.list({ search, status });
    if (response.ok) {
      setUsers(response.value.users);
    } else {
      showToast(response.error.message, "error");
    }
    setLoading(false);
  }, [search, showToast, status]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  const saveUser = async () => {
    if (form === null) return;
    const validationError = validateUserForm(form);
    if (validationError !== null) {
      showToast(validationError, "error");
      return;
    }
    const payload: UserSavePayload = {
      fullName: form.fullName,
      username: form.username,
      roleNames: form.roleNames,
      status: form.status,
      ...(form.id === undefined ? {} : { id: form.id }),
      ...(form.password.length > 0 ? { password: form.password } : {}),
      ...(form.pin.length > 0 ? { pin: form.pin } : {})
    };
    const response = await window.orix.users.save(payload);
    if (response.ok) {
      setForm(null);
      showToast("User saved.");
      await loadUsers();
    } else {
      showToast(response.error.message, "error");
    }
  };

  return (
    <div className="user-management">
      <div className="toolbar compact-toolbar">
        <input
          placeholder="Search users"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
          }}
        />
        <select
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as typeof status);
          }}
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="disabled">Disabled</option>
        </select>
        <button
          className="primary"
          disabled={!canManage}
          onClick={() => {
            setSubmitted(false);
            setForm({
              fullName: "",
              username: "",
              password: "",
              pin: "",
              roleNames: ["Viewer"],
              status: "active"
            });
          }}
        >
          New User
        </button>
      </div>
      {loading ? (
        <LoadingState label="Loading users" />
      ) : (
        <div className="user-list">
          {users.map((user) => (
            <div className="user-row" key={user.id}>
              <div>
                <strong>{user.fullName}</strong>
                <span>{user.username}</span>
              </div>
              <span className={`pill ${user.status === "active" ? "success" : "muted"}`}>
                {user.status}
              </span>
              <span>{user.roleNames.join(", ")}</span>
              <button
                disabled={!canManage}
                onClick={() => {
                  setSubmitted(false);
                  setForm({
                    id: user.id,
                    fullName: user.fullName,
                    username: user.username,
                    password: "",
                    pin: "",
                    roleNames: user.roleNames,
                    status: user.status
                  });
                }}
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      )}
      {form === null ? null : (
        <div className="modal-backdrop">
          <section className="modal">
            <header>
              <h2>{form.id === undefined ? "Create User" : "Edit User"}</h2>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setForm(null);
                }}
              >
                Close
              </button>
            </header>
            <div className="form-grid">
              <Field
                label="Full Name *"
                value={form.fullName}
                error={userErrors.fullName}
                required
                onChange={(fullName) => {
                  setForm({ ...form, fullName });
                }}
              />
              <Field
                label="Username *"
                value={form.username}
                error={userErrors.username}
                required
                onChange={(username) => {
                  setForm({ ...form, username });
                }}
              />
              <Field
                label={form.id === undefined ? "Password" : "New Password"}
                type="password"
                value={form.password}
                error={userErrors.password}
                required={form.id === undefined}
                onChange={(password) => {
                  setForm({ ...form, password });
                }}
              />
              <Field
                label={form.id === undefined ? "PIN" : "New PIN"}
                value={form.pin}
                error={userErrors.pin}
                required={form.id === undefined}
                maxLength={4}
                helperText="Use 4 digits for quick unlock."
                onChange={(pin) => {
                  setForm({ ...form, pin: pin.replace(/\D/g, "").slice(0, 4) });
                }}
              />
              <label>
                Status
                <select
                  value={form.status}
                  onChange={(event) => {
                    setForm({ ...form, status: event.target.value as UserFormState["status"] });
                  }}
                >
                  <option value="active">Active</option>
                  <option value="disabled">Disabled</option>
                </select>
              </label>
              <div className="role-picker wide">
                {roleOptions.map((role) => (
                  <label className="check-row" key={role}>
                    <input
                      type="checkbox"
                      checked={form.roleNames.includes(role)}
                      onChange={(event) => {
                        const roleNamesNext = event.target.checked
                          ? [...form.roleNames, role]
                          : form.roleNames.filter((item) => item !== role);
                        setForm({ ...form, roleNames: roleNamesNext });
                      }}
                    />
                    {role}
                  </label>
                ))}
                {userErrors.roleNames === undefined ? null : (
                  <small className="field-error">{userErrors.roleNames}</small>
                )}
              </div>
            </div>
            <footer>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setForm(null);
                }}
              >
                Cancel
              </button>
              <button
                className="primary"
                onClick={() => {
                  setSubmitted(true);
                  void saveUser();
                }}
              >
                Save User
              </button>
            </footer>
          </section>
        </div>
      )}
    </div>
  );
};

const SettingsPanel = ({
  title,
  children
}: {
  readonly title: string;
  readonly children: ReactNode;
}) => (
  <article className="card settings-panel">
    <h2>{title}</h2>
    {children}
  </article>
);

const AboutPage = ({ version }: { readonly version: string }) => (
  <section className="about-page">
    <div>
      <p className="eyebrow">ORIX TECH</p>
      <h1>Orix Retail OS</h1>
      <p>Offline-first desktop Retail Management System for Windows.</p>
      <div className="about-meta">
        <span>Version {version}</span>
        <span>Build Local</span>
        <span>Developed by ORIX TECH</span>
      </div>
    </div>
    <footer>Built with care by ORIX TECH</footer>
  </section>
);

const Icon = ({ name }: { readonly name: IconName }) => {
  const paths: Record<IconName, ReactNode> = {
    barcode: (
      <>
        <path d="M4 5v14" />
        <path d="M8 5v14" />
        <path d="M13 5v14" />
        <path d="M17 5v14" />
        <path d="M20 5v14" />
      </>
    ),
    cart: (
      <>
        <path d="M5 6h2l2 10h9l2-7H8" />
        <path d="M10 20h.01" />
        <path d="M17 20h.01" />
      </>
    ),
    cash: (
      <>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M6 9h.01" />
        <path d="M18 15h.01" />
      </>
    ),
    chevronLeft: <path d="m15 18-6-6 6-6" />,
    chevronRight: <path d="m9 18 6-6-6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="M12 8v5l3 2" />
      </>
    ),
    credit: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="M3 10h18" />
      </>
    ),
    folder: (
      <>
        <path d="M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6Z" />
        <path d="M3 10h18" />
      </>
    ),
    home: (
      <>
        <path d="m4 11 8-7 8 7" />
        <path d="M6 10v10h12V10" />
      </>
    ),
    package: (
      <>
        <path d="m12 3 8 4-8 4-8-4 8-4Z" />
        <path d="M4 7v10l8 4 8-4V7" />
        <path d="M12 11v10" />
      </>
    ),
    pause: (
      <>
        <path d="M9 5v14" />
        <path d="M15 5v14" />
      </>
    ),
    play: <path d="m8 5 12 7-12 7V5Z" />,
    plus: (
      <>
        <path d="M12 5v14" />
        <path d="M5 12h14" />
      </>
    ),
    receipt: (
      <>
        <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
        <path d="M9 8h6" />
        <path d="M9 12h6" />
      </>
    ),
    refresh: (
      <>
        <path d="M20 6v5h-5" />
        <path d="M4 18v-5h5" />
        <path d="M18 11a6 6 0 0 0-10-4l-4 4" />
        <path d="M6 13a6 6 0 0 0 10 4l4-4" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v3" />
        <path d="M12 19v3" />
        <path d="M2 12h3" />
        <path d="M19 12h3" />
        <path d="m4.9 4.9 2.1 2.1" />
        <path d="m17 17 2.1 2.1" />
        <path d="m19.1 4.9-2.1 2.1" />
        <path d="m7 17-2.1 2.1" />
      </>
    ),
    trash: (
      <>
        <path d="M4 7h16" />
        <path d="M10 11v6" />
        <path d="M14 11v6" />
        <path d="M6 7l1 14h10l1-14" />
        <path d="M9 7V4h6v3" />
      </>
    ),
    truck: (
      <>
        <path d="M3 6h11v10H3z" />
        <path d="M14 10h4l3 3v3h-7" />
        <circle cx="7" cy="18" r="2" />
        <circle cx="17" cy="18" r="2" />
      </>
    ),
    upload: (
      <>
        <path d="M12 3v12" />
        <path d="m7 8 5-5 5 5" />
        <path d="M5 21h14" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21a8 8 0 0 1 16 0" />
      </>
    ),
    users: (
      <>
        <path d="M16 21a6 6 0 0 0-12 0" />
        <circle cx="10" cy="8" r="4" />
        <path d="M22 21a5 5 0 0 0-5-5" />
        <path d="M17 4a4 4 0 0 1 0 8" />
      </>
    ),
    warehouse: (
      <>
        <path d="M3 21V9l9-5 9 5v12" />
        <path d="M7 21v-7h10v7" />
        <path d="M9 17h6" />
      </>
    )
  };

  return (
    <svg className="icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
};

const EmptyState = ({
  title,
  description
}: {
  readonly title: string;
  readonly description: string;
}) => (
  <div className={`empty-state ${uiClassNames.emptyState}`}>
    <strong>{title}</strong>
    <span>{description}</span>
  </div>
);

const LoadingState = ({ label }: { readonly label: string }) => (
  <div className="loading-state">
    <span className="spinner" />
    {label}
  </div>
);

const Toast = ({ toast }: { readonly toast: ToastState }) => (
  <div className={`toast ${toast.tone}`}>{toast.message}</div>
);

const CatalogSection = ({
  title,
  kind,
  items,
  onNew,
  onEdit,
  onArchive
}: {
  readonly title: string;
  readonly kind: CatalogItemKind;
  readonly items: readonly CatalogItemDto[];
  readonly onNew: () => void;
  readonly onEdit: (item: CatalogItemDto) => void;
  readonly onArchive: (kind: CatalogItemKind, item: CatalogItemDto) => void;
}) => (
  <section className="catalog-section">
    <div className="catalog-heading">
      <h2>{title}</h2>
      <button onClick={onNew}>+</button>
    </div>
    <div className="catalog-list">
      {items.map((item) => (
        <div
          key={item.id}
          className={item.archivedAt === null ? "catalog-item" : "catalog-item archived"}
        >
          <button
            onClick={() => {
              onEdit(item);
            }}
          >
            {item.name}
          </button>
          <button
            onClick={() => {
              onArchive(kind, item);
            }}
          >
            {item.archivedAt === null ? "Archive" : "Restore"}
          </button>
        </div>
      ))}
    </div>
  </section>
);

const ProductDialog = ({
  form,
  categories,
  brands,
  units,
  saving,
  setForm,
  onSave
}: {
  readonly form: ProductFormState;
  readonly categories: readonly CatalogItemDto[];
  readonly brands: readonly CatalogItemDto[];
  readonly units: readonly CatalogItemDto[];
  readonly saving: boolean;
  readonly setForm: (form: ProductFormState | null) => void;
  readonly onSave: () => Promise<void>;
}) => {
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? productFormErrors(form) : {};

  return (
    <div className="modal-backdrop">
      <form
        className="modal"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          void onSave();
        }}
      >
        <header>
          <div>
            <p className="eyebrow">Quick item setup</p>
            <h2>{form.id === undefined ? "Add Item" : "Edit Item"}</h2>
          </div>
          <button
            type="button"
            onClick={() => {
              setForm(null);
            }}
          >
            ×
          </button>
        </header>
        <div className="form-grid">
          <Field
            label="Item name *"
            value={form.name}
            error={errors.name}
            required
            onChange={(value) => {
              setForm({ ...form, name: value });
            }}
          />
          <Field
            label="Barcode / scan code"
            value={form.barcode}
            helperText="Scan or type the barcode printed on the product."
            onChange={(value) => {
              setForm({ ...form, barcode: value });
            }}
          />
          <SelectField
            label="Category *"
            value={form.categoryId}
            options={categories}
            error={errors.categoryId}
            required
            onChange={(value) => {
              setForm({ ...form, categoryId: value });
            }}
          />
          <SelectField
            label="Brand"
            value={form.brandId}
            options={brands}
            onChange={(value) => {
              setForm({ ...form, brandId: value });
            }}
            optional
          />
          <SelectField
            label="Sold as *"
            value={form.unitId}
            options={units}
            error={errors.unitId}
            required
            onChange={(value) => {
              setForm({ ...form, unitId: value });
            }}
          />
          <Field
            label="Buy price *"
            value={form.purchasePrice}
            error={errors.purchasePrice}
            required
            min={0}
            onChange={(value) => {
              setForm({ ...form, purchasePrice: value });
            }}
            type="number"
          />
          <Field
            label="Sale price *"
            value={form.salePrice}
            error={errors.salePrice}
            required
            min={0}
            onChange={(value) => {
              setForm({ ...form, salePrice: value });
            }}
            type="number"
          />
          <Field
            label="Stock now"
            value={form.openingStock}
            error={errors.openingStock}
            helperText={form.id === undefined ? "Use this only for first-time stock entry." : ""}
            min={0}
            onChange={(value) => {
              setForm({ ...form, openingStock: value });
            }}
            type="number"
          />
          <Field
            label="Low stock alert"
            value={form.minimumStock}
            error={errors.minimumStock}
            min={0}
            onChange={(value) => {
              setForm({ ...form, minimumStock: value });
            }}
            type="number"
          />
          <label className="wide">
            Description
            <textarea
              value={form.description}
              onChange={(event) => {
                setForm({ ...form, description: event.target.value });
              }}
            />
          </label>
          <label className="toggle">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => {
                setForm({ ...form, active: event.target.checked });
              }}
            />
            Active
          </label>
        </div>
        <footer>
          <button
            type="button"
            onClick={() => {
              setForm(null);
            }}
          >
            Cancel
          </button>
          <button className="primary" disabled={saving} type="submit">
            {saving ? "Saving..." : "Save Item"}
          </button>
        </footer>
      </form>
    </div>
  );
};

const CatalogDialog = ({
  form,
  setForm,
  onSave
}: {
  readonly form: CatalogFormState;
  readonly setForm: (form: CatalogFormState | null) => void;
  readonly onSave: () => Promise<void>;
}) => {
  const [submitted, setSubmitted] = useState(false);
  const errors = submitted ? catalogFormErrors(form) : {};

  return (
    <div className="modal-backdrop">
      <form
        className="modal compact"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setSubmitted(true);
          void onSave();
        }}
      >
        <header>
          <h2>
            {form.id === undefined ? "Add" : "Edit"} {form.kind}
          </h2>
          <button
            type="button"
            onClick={() => {
              setForm(null);
            }}
          >
            ×
          </button>
        </header>
        <div className="form-grid one">
          <Field
            label="Name *"
            value={form.name}
            error={errors.name}
            required
            onChange={(value) => {
              setForm({ ...form, name: value });
            }}
          />
          <Field
            label="Code"
            value={form.code}
            helperText="Optional short code for reports and import matching."
            onChange={(value) => {
              setForm({ ...form, code: value });
            }}
          />
          {form.kind === "unit" && (
            <Field
              label="Abbreviation *"
              value={form.abbreviation}
              error={errors.abbreviation}
              required
              helperText="Example: pcs, kg, box."
              onChange={(value) => {
                setForm({ ...form, abbreviation: value });
              }}
            />
          )}
        </div>
        <footer>
          <button
            type="button"
            onClick={() => {
              setForm(null);
            }}
          >
            Cancel
          </button>
          <button className="primary" type="submit">
            Save
          </button>
        </footer>
      </form>
    </div>
  );
};

const ProductDrawer = ({
  product,
  onClose
}: {
  readonly product: ProductDetailDto;
  readonly onClose: () => void;
}) => (
  <aside className="drawer">
    <header>
      <div>
        <p className="eyebrow">Item Details</p>
        <h2>{product.name}</h2>
      </div>
      <button onClick={onClose}>×</button>
    </header>
    <section>
      <h3>General Information</h3>
      <Detail label="Barcode" value={product.barcode ?? "-"} />
      <Detail label="Category" value={product.categoryName ?? "-"} />
      <Detail label="Brand" value={product.brandName ?? "-"} />
      <Detail label="Unit" value={product.unitName} />
      <Detail label="Status" value={product.archivedAt === null ? product.status : "archived"} />
    </section>
    <section>
      <h3>Pricing</h3>
      <Detail label="Purchase Price" value={money(product.purchasePriceMinor)} />
      <Detail label="Sale Price" value={money(product.salePriceMinor)} />
    </section>
    <section>
      <h3>Stock Summary</h3>
      <Detail label="Current Stock" value={String(product.currentStock)} />
      <Detail label="Minimum Stock" value={String(product.minimumStock)} />
    </section>
    <section>
      <h3>History</h3>
      <Detail label="Created Date" value={new Date(product.createdAt).toLocaleString()} />
      <Detail
        label="Last Updated"
        value={product.updatedAt === null ? "-" : new Date(product.updatedAt).toLocaleString()}
      />
    </section>
  </aside>
);

const Field = ({
  label,
  value,
  onChange,
  type = "text",
  maxLength,
  min,
  required = false,
  helperText = "",
  error
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type?: "text" | "number" | "email" | "password";
  readonly maxLength?: number;
  readonly min?: number;
  readonly required?: boolean;
  readonly helperText?: string;
  readonly error?: string | undefined;
}) => (
  <label className={error === undefined ? "field-control" : "field-control has-error"}>
    <span>{label}</span>
    <input
      type={type}
      step={type === "number" ? "0.01" : undefined}
      min={type === "number" ? min : undefined}
      maxLength={maxLength}
      required={required}
      aria-invalid={error === undefined ? undefined : true}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
    {error === undefined ? null : <small className="field-error">{error}</small>}
    {error === undefined && helperText.trim().length > 0 ? (
      <small className="field-help">{helperText}</small>
    ) : null}
  </label>
);

const SelectField = ({
  label,
  value,
  options,
  onChange,
  optional = false,
  required = false,
  error
}: {
  readonly label: string;
  readonly value: string;
  readonly options: readonly CatalogItemDto[];
  readonly onChange: (value: string) => void;
  readonly optional?: boolean;
  readonly required?: boolean;
  readonly error?: string | undefined;
}) => (
  <label className={error === undefined ? "field-control" : "field-control has-error"}>
    <span>{label}</span>
    <select
      value={value}
      required={required}
      aria-invalid={error === undefined ? undefined : true}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    >
      <option value="">{optional ? "None" : "Select"}</option>
      {options.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </select>
    {error === undefined ? null : <small className="field-error">{error}</small>}
  </label>
);

const Detail = ({ label, value }: { readonly label: string; readonly value: string }) => (
  <div className="detail-row">
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const rootElement = document.getElementById("root");
if (rootElement === null) {
  throw new Error("Root element was not found.");
}

createRoot(rootElement).render(<App />);

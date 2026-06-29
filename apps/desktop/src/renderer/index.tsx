import type {
  AppContextDto,
  AppSettingsDto,
  AuthStatusDto,
  AuthUserDto,
  CatalogItemDto,
  CatalogItemKind,
  DashboardDto,
  InventoryAdjustmentPayload,
  InventoryItemDto,
  InventoryListRequest,
  InventoryMovementDto,
  InventoryMovementListRequest,
  InventoryOverviewDto,
  OpeningStockEntryPayload,
  ProductCatalogDto,
  ProductDetailDto,
  ProductFormPayload,
  ProductIpcError,
  ProductListItemDto,
  ProductListRequest,
  ProductStatusFilter,
  RoleName,
  SetupStorePayload,
  UserSavePayload
} from "@orix/electron";
import { uiClassNames } from "@orix/ui";
import { Component, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { OrixPreloadApi } from "../preload/index.js";
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

type ToastState = {
  readonly message: string;
  readonly tone: "success" | "error";
};

type ErrorBoundaryState = {
  readonly hasError: boolean;
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
    } else {
      showToast(settingsResponse.error.message, "error");
    }
  }, [authStatus?.authenticated, showToast]);

  useEffect(() => {
    void loadAuthStatus();
  }, [loadAuthStatus]);

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
    const theme = settings?.theme ?? "system";
    const resolved = resolveThemePreference(
      theme,
      window.matchMedia("(prefers-color-scheme: dark)").matches
    );
    document.documentElement.dataset.theme = resolved;
  }, [settings?.theme]);

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
    if (route === "dashboard") {
      return <DashboardPage showToast={showToast} />;
    }
    if (route === "products") {
      return <ProductModule showToast={showToast} />;
    }
    if (route === "inventory") {
      return <InventoryModule showToast={showToast} />;
    }
    if (route === "settings") {
      return (
        <SettingsPage
          settings={settings}
          canManageUsers={hasPermission("users.manage")}
          onSaved={(nextSettings) => {
            setSettings(nextSettings);
            showToast("Settings saved.");
          }}
          showToast={showToast}
        />
      );
    }
    if (route === "about") {
      return <AboutPage version={context?.applicationVersion ?? "0.0.0"} />;
    }
    const active = routes.find((item) => item.id === route);
    return <ComingSoonPage title={active?.label ?? "Module"} />;
  }, [context?.applicationVersion, hasPermission, route, settings, showToast]);

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
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = async () => {
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
              onChange={(email) => {
                setForm({ ...form, email });
              }}
            />
            <Field
              label="Currency"
              value={form.currency}
              onChange={(currency) => {
                setForm({ ...form, currency });
              }}
            />
            <Field
              label="Timezone"
              value={form.timezone}
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
              onChange={(adminFullName) => {
                setForm({ ...form, adminFullName });
              }}
            />
            <Field
              label="Username *"
              value={form.username}
              onChange={(username) => {
                setForm({ ...form, username });
              }}
            />
            <Field
              label="Password *"
              type="password"
              value={form.password}
              onChange={(password) => {
                setForm({ ...form, password });
              }}
            />
            <Field
              label="Confirm Password *"
              type="password"
              value={form.confirmPassword}
              onChange={(confirmPassword) => {
                setForm({ ...form, confirmPassword });
              }}
            />
            <Field
              label="PIN *"
              value={form.pin}
              maxLength={4}
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
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
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
          <p className="eyebrow">Orix Retail OS</p>
          <h1>Products</h1>
        </div>
        <div className="topbar-actions">
          <button className="ghost" onClick={() => void loadProducts()}>
            Refresh
          </button>
          <button
            className="primary"
            onClick={() => {
              setForm(emptyProductForm);
            }}
          >
            New Product
          </button>
        </div>
      </header>

      <section className="product-workspace">
        <aside className="catalog-panel">
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

        <section className="product-area">
          <div className="filters">
            <input
              id="product-search"
              placeholder="Search barcode, name, category, brand"
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
                    ["name", "Product Name"],
                    ["purchasePrice", "Purchase Price"],
                    ["salePrice", "Sale Price"],
                    ["stock", "Current Stock"],
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
                      No products yet. Create your first product to begin.
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
              Page {query.page} of {totalPages} · {totalItems} products
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
        <Metric label="Total Products" value={String(overview?.totalProducts ?? 0)} />
        <Metric label="Products In Stock" value={String(overview?.productsInStock ?? 0)} />
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
              placeholder="Search barcode, SKU, product, category"
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
                    <SortableTh label="Product" sortBy="product" query={query} onQuery={setQuery} />
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
            <th>Product</th>
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
  <div className="modal-backdrop">
    <section className="modal">
      <header>
        <h2>Opening Stock Wizard</h2>
        <button onClick={onClose}>Close</button>
      </header>
      <div className="opening-stock-body">
        <p className="muted-text">
          Step 1: enter or import products. Step 2: review. Step 3: confirm immutable transactions.
        </p>
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
        <button className="primary" onClick={onSubmit}>
          Confirm Opening Stock
        </button>
      </footer>
    </section>
  </div>
);

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
  <div className="modal-backdrop">
    <section className="modal small">
      <header>
        <h2>Stock Adjustment</h2>
        <button onClick={onClose}>Close</button>
      </header>
      <div className="form-grid">
        <label className="wide">
          Product
          <ProductSelect
            value={form.productId}
            products={products}
            onChange={(productId) => {
              onChange({ ...form, productId });
            }}
          />
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
          label="Quantity"
          type="number"
          value={form.quantity}
          onChange={(quantity) => {
            onChange({ ...form, quantity });
          }}
        />
        <Field
          label="Cost Price"
          type="number"
          value={form.unitCost}
          onChange={(unitCost) => {
            onChange({ ...form, unitCost });
          }}
        />
        <label className="wide">
          Date
          <input
            type="datetime-local"
            value={form.occurredAt}
            onChange={(event) => {
              onChange({ ...form, occurredAt: event.target.value });
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
        <button className="primary" onClick={onSubmit}>
          Record Adjustment
        </button>
      </footer>
    </section>
  </div>
);

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
          <EmptyState title="No movements" description="Transactions will appear here." />
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
      <section className="detail-section">
        <h3>Last Purchase</h3>
        <EmptyState
          title="No purchases yet"
          description="Purchase integration arrives in a later sprint."
        />
      </section>
      <section className="detail-section">
        <h3>Last Sale</h3>
        <EmptyState title="No sales yet" description="POS integration arrives in a later sprint." />
      </section>
      <div className="future-tabs">
        <span className="pill muted">Batch</span>
        <span className="pill muted">Expiry</span>
        <span className="pill muted">Serial Numbers</span>
      </div>
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
      <input className="global-search" placeholder="Quick search" aria-label="Quick search" />
      <button title="Notifications" aria-label="Notifications">
        N
      </button>
      <button
        title="Settings"
        aria-label="Settings"
        onClick={() => {
          onNavigate("settings");
        }}
      >
        S
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
  const visibleRoutes = routes.filter((route) => permissions.includes(routePermissions[route.id]));
  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <button className="sidebar-toggle" onClick={onToggle}>
        {collapsed ? ">" : "<"}
      </button>
      {sections.map((section) => (
        <nav className="nav-section" key={section}>
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
                <span className="nav-icon">{route.icon}</span>
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
    <span>Sync: Offline</span>
    <span>Printer: Future</span>
  </footer>
);

const DashboardPage = ({
  showToast
}: {
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
    ["Today's Sales", money(dashboard?.todaySalesMinor ?? 0), "Completed sales today"],
    ["Today's Purchases", money(dashboard?.todayPurchasesMinor ?? 0), "Received purchases today"],
    ["Cash In Drawer", money(dashboard?.cashInDrawerMinor ?? 0), "From completed cash sales"],
    [
      "Outstanding Customers",
      money(dashboard?.outstandingCustomersMinor ?? 0),
      "From ledger entries"
    ],
    [
      "Outstanding Suppliers",
      money(dashboard?.outstandingSuppliersMinor ?? 0),
      "From ledger entries"
    ],
    ["Low Stock", String(dashboard?.lowStockCount ?? 0), "Tracked products at reorder level"]
  ] as const;

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Today</p>
          <h1>Dashboard</h1>
        </div>
        <button onClick={() => void loadDashboard()}>Refresh</button>
      </div>
      <div className="metric-grid">
        {metrics.map(([label, value, helper]) => (
          <article className="card metric-card" key={label}>
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{helper}</small>
          </article>
        ))}
      </div>
      <div className="dashboard-lower">
        <article className="card">
          <h2>Top Selling Product</h2>
          <EmptyState
            title={dashboard?.topSellingProductName ?? "No completed sales yet"}
            description="This will populate from sale item history once POS is implemented."
          />
        </article>
        <article className="card">
          <h2>Recent Activity</h2>
          {dashboard?.recentActivity.length === 0 ? (
            <EmptyState title="No activity yet" description="Product actions will appear here." />
          ) : (
            <div className="activity-list">
              {dashboard?.recentActivity.map((activity) => (
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
  onSaved,
  showToast
}: {
  readonly settings: AppSettingsDto | null;
  readonly canManageUsers: boolean;
  readonly onSaved: (settings: AppSettingsDto) => void;
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

  useEffect(() => {
    if (settings !== null) {
      setDraft(settings);
    }
  }, [settings]);

  const saveSettings = async () => {
    const response = await window.orix.settings.save(draft);
    if (response.ok) {
      onSaved(response.value);
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
                setDraft({ ...draft, theme: event.target.value as AppSettingsDto["theme"] });
              }}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
        </SettingsPanel>
        <SettingsPanel title="Store Information">
          <label>
            Store display name
            <input
              value={draft.storeDisplayName}
              onChange={(event) => {
                setDraft({ ...draft, storeDisplayName: event.target.value });
              }}
            />
          </label>
        </SettingsPanel>
        <SettingsPanel title="Receipt">
          <label>
            Header
            <input
              value={draft.receiptHeader}
              onChange={(event) => {
                setDraft({ ...draft, receiptHeader: event.target.value });
              }}
            />
          </label>
          <label>
            Footer
            <input
              value={draft.receiptFooter}
              onChange={(event) => {
                setDraft({ ...draft, receiptFooter: event.target.value });
              }}
            />
          </label>
        </SettingsPanel>
        <SettingsPanel title="Database">
          <EmptyState
            title="SQLite connected"
            description="Database maintenance tools arrive later."
          />
        </SettingsPanel>
        <SettingsPanel title="Backup">
          <label>
            Backup location
            <input
              value={draft.backupLocation}
              onChange={(event) => {
                setDraft({ ...draft, backupLocation: event.target.value });
              }}
            />
          </label>
        </SettingsPanel>
        <SettingsPanel title="Users">
          <UserManagement canManage={canManageUsers} showToast={showToast} />
        </SettingsPanel>
      </div>
    </section>
  );
};

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
  const [loading, setLoading] = useState(true);

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
                  setForm(null);
                }}
              >
                Close
              </button>
            </header>
            <div className="form-grid">
              <Field
                label="Full Name"
                value={form.fullName}
                onChange={(fullName) => {
                  setForm({ ...form, fullName });
                }}
              />
              <Field
                label="Username"
                value={form.username}
                onChange={(username) => {
                  setForm({ ...form, username });
                }}
              />
              <Field
                label={form.id === undefined ? "Password" : "New Password"}
                type="password"
                value={form.password}
                onChange={(password) => {
                  setForm({ ...form, password });
                }}
              />
              <Field
                label={form.id === undefined ? "PIN" : "New PIN"}
                value={form.pin}
                maxLength={4}
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
              </div>
            </div>
            <footer>
              <button
                onClick={() => {
                  setForm(null);
                }}
              >
                Cancel
              </button>
              <button className="primary" onClick={() => void saveUser()}>
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

const ComingSoonPage = ({ title }: { readonly title: string }) => (
  <section className="coming-soon">
    <EmptyState
      title={`${title} Coming Soon`}
      description="Navigation is ready. This module will be implemented in a future sprint."
    />
  </section>
);

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
}) => (
  <div className="modal-backdrop">
    <form
      className="modal"
      onSubmit={(event) => {
        event.preventDefault();
        void onSave();
      }}
    >
      <header>
        <h2>{form.id === undefined ? "Add Product" : "Edit Product"}</h2>
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
          label="Product Name *"
          value={form.name}
          onChange={(value) => {
            setForm({ ...form, name: value });
          }}
        />
        <Field
          label="Barcode"
          value={form.barcode}
          onChange={(value) => {
            setForm({ ...form, barcode: value });
          }}
        />
        <SelectField
          label="Category *"
          value={form.categoryId}
          options={categories}
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
          label="Unit *"
          value={form.unitId}
          options={units}
          onChange={(value) => {
            setForm({ ...form, unitId: value });
          }}
        />
        <Field
          label="Purchase Price *"
          value={form.purchasePrice}
          onChange={(value) => {
            setForm({ ...form, purchasePrice: value });
          }}
          type="number"
        />
        <Field
          label="Sale Price *"
          value={form.salePrice}
          onChange={(value) => {
            setForm({ ...form, salePrice: value });
          }}
          type="number"
        />
        <Field
          label="Opening Stock"
          value={form.openingStock}
          onChange={(value) => {
            setForm({ ...form, openingStock: value });
          }}
          type="number"
        />
        <Field
          label="Minimum Stock"
          value={form.minimumStock}
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
          {saving ? "Saving..." : "Save"}
        </button>
      </footer>
    </form>
  </div>
);

const CatalogDialog = ({
  form,
  setForm,
  onSave
}: {
  readonly form: CatalogFormState;
  readonly setForm: (form: CatalogFormState | null) => void;
  readonly onSave: () => Promise<void>;
}) => (
  <div className="modal-backdrop">
    <form
      className="modal compact"
      onSubmit={(event) => {
        event.preventDefault();
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
          onChange={(value) => {
            setForm({ ...form, name: value });
          }}
        />
        <Field
          label="Code"
          value={form.code}
          onChange={(value) => {
            setForm({ ...form, code: value });
          }}
        />
        {form.kind === "unit" && (
          <Field
            label="Abbreviation *"
            value={form.abbreviation}
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
        <p className="eyebrow">Product Details</p>
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
      <h3>Audit Metadata</h3>
      <Detail label="Created Date" value={new Date(product.createdAt).toLocaleString()} />
      <Detail
        label="Last Updated"
        value={product.updatedAt === null ? "-" : new Date(product.updatedAt).toLocaleString()}
      />
      <Detail label="Created By" value={product.createdByUserId ?? "-"} />
      <Detail label="Updated By" value={product.updatedByUserId ?? "-"} />
    </section>
    <section>
      <h3>Sales History</h3>
      <p className="muted-text">Available in a future sprint.</p>
      <h3>Purchase History</h3>
      <p className="muted-text">Available in a future sprint.</p>
      <h3>Inventory History</h3>
      <p className="muted-text">Available in a future sprint.</p>
    </section>
  </aside>
);

const Field = ({
  label,
  value,
  onChange,
  type = "text",
  maxLength
}: {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly type?: "text" | "number" | "email" | "password";
  readonly maxLength?: number;
}) => (
  <label>
    {label}
    <input
      type={type}
      step={type === "number" ? "0.01" : undefined}
      maxLength={maxLength}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    />
  </label>
);

const SelectField = ({
  label,
  value,
  options,
  onChange,
  optional = false
}: {
  readonly label: string;
  readonly value: string;
  readonly options: readonly CatalogItemDto[];
  readonly onChange: (value: string) => void;
  readonly optional?: boolean;
}) => (
  <label>
    {label}
    <select
      value={value}
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

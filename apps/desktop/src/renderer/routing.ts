export type RouteId =
  | "dashboard"
  | "pos"
  | "inventory"
  | "products"
  | "customers"
  | "suppliers"
  | "purchases"
  | "sales"
  | "expenses"
  | "reports"
  | "settings"
  | "about";

export const routes: readonly {
  readonly id: RouteId;
  readonly label: string;
  readonly icon: string;
  readonly path: string;
  readonly section: "main" | "operations" | "system";
}[] = [
  { id: "dashboard", label: "Dashboard", icon: "⌘", path: "/", section: "main" },
  { id: "pos", label: "POS", icon: "▣", path: "/pos", section: "operations" },
  { id: "inventory", label: "Inventory", icon: "▦", path: "/inventory", section: "operations" },
  { id: "products", label: "Products", icon: "◇", path: "/products", section: "operations" },
  { id: "customers", label: "Customers", icon: "●", path: "/customers", section: "operations" },
  { id: "suppliers", label: "Suppliers", icon: "◆", path: "/suppliers", section: "operations" },
  { id: "purchases", label: "Purchases", icon: "＋", path: "/purchases", section: "operations" },
  { id: "sales", label: "Sales", icon: "↗", path: "/sales", section: "operations" },
  { id: "expenses", label: "Expenses", icon: "−", path: "/expenses", section: "operations" },
  { id: "reports", label: "Reports", icon: "▤", path: "/reports", section: "operations" },
  { id: "settings", label: "Settings", icon: "⚙", path: "/settings", section: "system" },
  { id: "about", label: "About", icon: "ⓘ", path: "/about", section: "system" }
];

export const routeFromPath = (path: string): RouteId =>
  routes.find((route) => route.path === path)?.id ?? "dashboard";

export const pathForRoute = (routeId: RouteId): string =>
  routes.find((route) => route.id === routeId)?.path ?? "/";

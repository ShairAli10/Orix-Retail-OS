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
  { id: "dashboard", label: "Dashboard", icon: "D", path: "/", section: "main" },
  { id: "pos", label: "POS", icon: "P", path: "/pos", section: "operations" },
  { id: "inventory", label: "Inventory", icon: "I", path: "/inventory", section: "operations" },
  { id: "products", label: "Products", icon: "PR", path: "/products", section: "operations" },
  { id: "customers", label: "Customers", icon: "C", path: "/customers", section: "operations" },
  { id: "suppliers", label: "Suppliers", icon: "S", path: "/suppliers", section: "operations" },
  { id: "purchases", label: "Purchases", icon: "PU", path: "/purchases", section: "operations" },
  { id: "sales", label: "Sales", icon: "SA", path: "/sales", section: "operations" },
  { id: "expenses", label: "Expenses", icon: "E", path: "/expenses", section: "operations" },
  { id: "reports", label: "Reports", icon: "R", path: "/reports", section: "operations" },
  { id: "settings", label: "Settings", icon: "G", path: "/settings", section: "system" },
  { id: "about", label: "About", icon: "A", path: "/about", section: "system" }
];

export const routeFromPath = (path: string): RouteId =>
  routes.find((route) => route.path === path)?.id ?? "dashboard";

export const pathForRoute = (routeId: RouteId): string =>
  routes.find((route) => route.id === routeId)?.path ?? "/";

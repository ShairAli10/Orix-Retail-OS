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
  readonly ready: boolean;
}[] = [
  { id: "pos", label: "Sell", icon: "RS", path: "/pos", section: "main", ready: true },
  { id: "dashboard", label: "Home", icon: "HM", path: "/", section: "main", ready: true },
  {
    id: "customers",
    label: "Customer Book",
    icon: "CB",
    path: "/customers",
    section: "main",
    ready: true
  },
  {
    id: "products",
    label: "Items",
    icon: "IT",
    path: "/products",
    section: "operations",
    ready: true
  },
  {
    id: "inventory",
    label: "Stock",
    icon: "ST",
    path: "/inventory",
    section: "operations",
    ready: true
  },
  {
    id: "suppliers",
    label: "Suppliers",
    icon: "SP",
    path: "/suppliers",
    section: "operations",
    ready: true
  },
  {
    id: "purchases",
    label: "Buy Stock",
    icon: "PO",
    path: "/purchases",
    section: "operations",
    ready: true
  },
  {
    id: "sales",
    label: "Sales History",
    icon: "SL",
    path: "/sales",
    section: "operations",
    ready: true
  },
  {
    id: "expenses",
    label: "Counter & Expenses",
    icon: "EX",
    path: "/expenses",
    section: "operations",
    ready: true
  },
  {
    id: "reports",
    label: "Reports",
    icon: "RP",
    path: "/reports",
    section: "operations",
    ready: true
  },
  {
    id: "settings",
    label: "Settings",
    icon: "SE",
    path: "/settings",
    section: "system",
    ready: true
  },
  { id: "about", label: "About", icon: "IN", path: "/about", section: "system", ready: true }
];

export const routeFromPath = (path: string): RouteId =>
  routes.find((route) => route.path === path)?.id ?? "dashboard";

export const pathForRoute = (routeId: RouteId): string =>
  routes.find((route) => route.id === routeId)?.path ?? "/";

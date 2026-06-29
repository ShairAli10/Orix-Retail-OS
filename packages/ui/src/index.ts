export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export type DataGridColumn<TColumn extends string> = {
  readonly id: TColumn;
  readonly label: string;
  readonly numeric?: boolean;
  readonly defaultVisible?: boolean;
};

export type StatCardModel = {
  readonly label: string;
  readonly value: string;
  readonly helper: string;
  readonly tone?: StatusTone;
};

export const uiClassNames = {
  button: (variant: ButtonVariant = "secondary"): string => `ui-button ui-button-${variant}`,
  card: "ui-card",
  dialog: "ui-dialog",
  drawer: "ui-drawer",
  input: "ui-input",
  dataGrid: "ui-data-grid",
  emptyState: "ui-empty-state",
  skeleton: "ui-skeleton",
  statCard: "ui-stat-card",
  toast: "ui-toast"
} as const;

export const spacingTokens = {
  xs: "4px",
  sm: "8px",
  md: "12px",
  lg: "16px",
  xl: "24px",
  xxl: "32px"
} as const;

export const radiusTokens = {
  sm: "6px",
  md: "8px",
  lg: "12px"
} as const;

export const themeTokens = {
  light: {
    background: "#edf1f5",
    surface: "#ffffff",
    text: "#17202a",
    muted: "#64748b",
    primary: "#0f766e"
  },
  dark: {
    background: "#111827",
    surface: "#182232",
    text: "#e5edf6",
    muted: "#a8b3c3",
    primary: "#2dd4bf"
  }
} as const;

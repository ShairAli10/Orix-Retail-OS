import { describe, expect, it } from "vitest";
import { pathForRoute, routeFromPath, routes } from "./routing.js";

describe("desktop shell routing", () => {
  it("maps deep links to typed routes", () => {
    expect(routeFromPath("/products")).toBe("products");
    expect(routeFromPath("/settings")).toBe("settings");
  });

  it("falls back to dashboard for unknown routes", () => {
    expect(routeFromPath("/missing")).toBe("dashboard");
  });

  it("defines every route with a stable path", () => {
    expect(routes.every((route) => pathForRoute(route.id).startsWith("/"))).toBe(true);
  });

  it("enables reports as a production route", () => {
    expect(routes.find((route) => route.id === "reports")?.ready).toBe(true);
  });
});

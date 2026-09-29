import { describe, expect, it } from "vitest";
import { activitySummary, displayLabel } from "./text.js";
describe("store-facing text", () => {
  it("summarizes known metadata without exposing IDs or nested objects", () => {
    expect(
      activitySummary(
        '{"name":"Ali","amountMinor":12500,"method":"cash","customerId":"internal","nested":{"secret":"hidden"}}'
      )
    ).toBe("Name: Ali · Amount: Rs 125.00 · Payment: Cash");
    expect(activitySummary("{}")).toBe("No additional details.");
    expect(activitySummary('[{"id":"internal"}]')).toBe("No additional details.");
    expect(activitySummary("Counter payment")).toBe("Counter payment");
  });
  it("turns enum and activity names into readable labels", () => {
    expect(displayLabel("CustomerPaymentRecorded")).toBe("Customer payment recorded");
    expect(displayLabel("out-of-stock")).toBe("Out of stock");
  });
});

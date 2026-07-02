import { describe, expect, it } from "vitest";
import { calculateAnalytics } from "../core/analytics/analytics";

describe("calculateAnalytics", () => {
  it("skips note-only records", () => {
    const now = new Date().toISOString();
    const data = calculateAnalytics(
      [
        {
          id: 1,
          systolic: 0,
          diastolic: 0,
          pulse: null,
          measuredAt: now,
          note: "note only",
          serverId: null,
          syncStatus: "PENDING",
          updatedAt: now,
          deletedAt: null,
        },
        {
          id: 2,
          systolic: 130,
          diastolic: 85,
          pulse: 70,
          measuredAt: now,
          note: null,
          serverId: null,
          syncStatus: "PENDING",
          updatedAt: now,
          deletedAt: null,
        },
      ],
      "ALL",
    );
    expect(data.readings.length).toBe(1);
    expect(data.averageSystolic).toBe(130);
  });
});

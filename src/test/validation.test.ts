import { describe, expect, it } from "vitest";
import { readingCategory, validateReading } from "../core/validation/validation";

const base = {
  id: 1,
  systolic: 120,
  diastolic: 80,
  pulse: 60,
  measuredAt: new Date().toISOString(),
  note: null,
  serverId: null,
  syncStatus: "PENDING" as const,
  updatedAt: new Date().toISOString(),
  deletedAt: null,
};

describe("validateReading", () => {
  it("fails when systolic <= diastolic", () => {
    expect(validateReading({ ...base, systolic: 80, diastolic: 80 })).toBeTruthy();
  });
  it("allows note-only in non-strict mode", () => {
    expect(validateReading({ ...base, systolic: 0, diastolic: 0 }, false)).toBeNull();
  });
  it("maps category like android", () => {
    expect(readingCategory({ systolic: 185, diastolic: 90 })).toBe("CRISIS");
  });
});

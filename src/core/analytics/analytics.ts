import { subDays } from "date-fns";
import type { BloodPressureReading, BpCategory } from "../types";
import { readingCategory } from "../validation/validation";

export type AnalyticsPeriod = "DAYS_7" | "DAYS_30" | "DAYS_90" | "ALL";
export type TrendDirection = "UP" | "DOWN" | "STABLE";

export interface Analytics {
  readings: BloodPressureReading[];
  averageSystolic: number;
  averageDiastolic: number;
  averagePulse: number | null;
  minSystolic: number;
  maxSystolic: number;
  minDiastolic: number;
  maxDiastolic: number;
  categoryDistribution: Record<BpCategory, number>;
  trendSystolic: TrendDirection;
  trendDiastolic: TrendDirection;
}

const emptyDist: Record<BpCategory, number> = {
  NORMAL: 0,
  ELEVATED: 0,
  STAGE1: 0,
  STAGE2: 0,
  CRISIS: 0,
};

function isNoteOnly(r: BloodPressureReading) {
  return r.systolic === 0 && r.diastolic === 0;
}

function trend(delta: number): TrendDirection {
  if (delta > 2) return "UP";
  if (delta < -2) return "DOWN";
  return "STABLE";
}

export function filterByPeriod(readings: BloodPressureReading[], period: AnalyticsPeriod) {
  if (period === "ALL") return readings;
  const days = period === "DAYS_7" ? 7 : period === "DAYS_30" ? 30 : 90;
  const cutoff = subDays(new Date(), days).toISOString();
  return readings.filter((r) => r.measuredAt > cutoff);
}

export function calculateAnalytics(readings: BloodPressureReading[], period: AnalyticsPeriod): Analytics {
  const filtered = filterByPeriod(readings, period).filter((r) => !isNoteOnly(r) && !r.deletedAt);
  if (!filtered.length) {
    return {
      readings: [],
      averageSystolic: 0,
      averageDiastolic: 0,
      averagePulse: null,
      minSystolic: 0,
      maxSystolic: 0,
      minDiastolic: 0,
      maxDiastolic: 0,
      categoryDistribution: { ...emptyDist },
      trendSystolic: "STABLE",
      trendDiastolic: "STABLE",
    };
  }
  const avgS = filtered.reduce((a, b) => a + b.systolic, 0) / filtered.length;
  const avgD = filtered.reduce((a, b) => a + b.diastolic, 0) / filtered.length;
  const pulses = filtered.map((r) => r.pulse).filter((v): v is number => v !== null);
  const distribution = filtered.reduce(
    (acc, reading) => {
      acc[readingCategory(reading)] += 1;
      return acc;
    },
    { ...emptyDist },
  );

  const sorted = [...filtered].sort((a, b) => a.measuredAt.localeCompare(b.measuredAt));
  const half = Math.floor(sorted.length / 2) || 1;
  const prev = sorted.slice(0, half);
  const recent = sorted.slice(half);
  const prevSys = prev.reduce((a, b) => a + b.systolic, 0) / prev.length;
  const recentSys = recent.reduce((a, b) => a + b.systolic, 0) / recent.length;
  const prevDia = prev.reduce((a, b) => a + b.diastolic, 0) / prev.length;
  const recentDia = recent.reduce((a, b) => a + b.diastolic, 0) / recent.length;

  return {
    readings: sorted,
    averageSystolic: avgS,
    averageDiastolic: avgD,
    averagePulse: pulses.length ? pulses.reduce((a, b) => a + b, 0) / pulses.length : null,
    minSystolic: Math.min(...filtered.map((r) => r.systolic)),
    maxSystolic: Math.max(...filtered.map((r) => r.systolic)),
    minDiastolic: Math.min(...filtered.map((r) => r.diastolic)),
    maxDiastolic: Math.max(...filtered.map((r) => r.diastolic)),
    categoryDistribution: distribution,
    trendSystolic: trend(recentSys - prevSys),
    trendDiastolic: trend(recentDia - prevDia),
  };
}

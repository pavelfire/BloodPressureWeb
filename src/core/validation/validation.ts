import type { BloodPressureReading } from "../types";

const MIN_SYSTOLIC = 70;
const MAX_SYSTOLIC = 250;
const MIN_DIASTOLIC = 40;
const MAX_DIASTOLIC = 150;
const MIN_PULSE = 30;
const MAX_PULSE = 200;
const MAX_NOTE_LENGTH = 500;

export function validateReading(reading: BloodPressureReading, strict = true): string | null {
  if (!strict) {
    return (reading.note?.length ?? 0) > MAX_NOTE_LENGTH ? "Комментарий слишком длинный" : null;
  }
  if (reading.systolic < MIN_SYSTOLIC || reading.systolic > MAX_SYSTOLIC) {
    return "Систолическое давление вне диапазона";
  }
  if (reading.diastolic < MIN_DIASTOLIC || reading.diastolic > MAX_DIASTOLIC) {
    return "Диастолическое давление вне диапазона";
  }
  if (reading.systolic <= reading.diastolic) {
    return "Систолическое должно быть больше диастолического";
  }
  if (reading.pulse && (reading.pulse < MIN_PULSE || reading.pulse > MAX_PULSE)) {
    return "Пульс вне диапазона";
  }
  if ((reading.note?.length ?? 0) > MAX_NOTE_LENGTH) return "Комментарий слишком длинный";
  return null;
}

export function readingCategory(reading: Pick<BloodPressureReading, "systolic" | "diastolic">) {
  if (reading.systolic >= 180 || reading.diastolic >= 120) return "CRISIS" as const;
  if (reading.systolic >= 140 || reading.diastolic >= 90) return "STAGE2" as const;
  if (reading.systolic >= 130 || reading.diastolic >= 80) return "STAGE1" as const;
  if (reading.systolic >= 120 && reading.diastolic < 80) return "ELEVATED" as const;
  return "NORMAL" as const;
}

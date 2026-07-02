import Dexie, { type Table } from "dexie";
import type { BloodPressureReading } from "../types";

export class BloodPressureDb extends Dexie {
  readings!: Table<BloodPressureReading, number>;

  constructor() {
    super("bloodPressureDb");
    this.version(1).stores({
      readings: "++id, measuredAt, updatedAt, serverId, syncStatus, deletedAt",
    });
  }
}

export const db = new BloodPressureDb();

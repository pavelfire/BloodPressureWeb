import { db } from "../db/database";
import type { BloodPressureReading } from "../types";
import type { ApiClient } from "../api/client";
import type { SessionState, SyncRequestDto } from "../types";

export async function createReading(input: Omit<BloodPressureReading, "id" | "serverId" | "syncStatus" | "updatedAt" | "deletedAt">) {
  await db.readings.add({
    ...input,
    serverId: null,
    syncStatus: "PENDING",
    updatedAt: new Date().toISOString(),
    deletedAt: null,
  } as BloodPressureReading);
}

export async function updateReading(reading: BloodPressureReading) {
  await db.readings.put({
    ...reading,
    syncStatus: "PENDING",
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteReading(reading: BloodPressureReading, session: SessionState, setSession: (s: SessionState) => void) {
  if (reading.serverId) {
    setSession({
      ...session,
      pendingDeletedServerIds: [...session.pendingDeletedServerIds, reading.serverId],
    });
  }
  await db.readings.put({ ...reading, deletedAt: new Date().toISOString(), syncStatus: "PENDING" });
}

export async function listReadings() {
  const readings = await db.readings.toArray();
  return readings.filter((r) => !r.deletedAt).sort((a, b) => b.measuredAt.localeCompare(a.measuredAt));
}

export async function runSync(
  api: ApiClient,
  session: SessionState,
  setSession: (s: SessionState) => void,
): Promise<void> {
  const all = await db.readings.toArray();
  const pending = all.filter((r) => r.syncStatus !== "SYNCED");
  const req: SyncRequestDto = {
    lastSyncAt: session.lastSyncAt,
    upserts: pending
      .filter((r) => !r.deletedAt)
      .map((r) => ({
        localId: r.id,
        serverId: r.serverId,
        systolic: r.systolic,
        diastolic: r.diastolic,
        pulse: r.pulse,
        measuredAt: r.measuredAt,
        note: r.note,
        updatedAt: r.updatedAt,
      })),
    deletedServerIds: session.pendingDeletedServerIds,
  };
  const response = await api.sync(req);
  for (const item of response.remoteChanges) {
    const existing = item.id ? await db.readings.where("serverId").equals(item.id).first() : undefined;
    if (item.deletedAt) {
      if (existing) await db.readings.delete(existing.id);
      continue;
    }
    if (existing) {
      await db.readings.put({
        ...existing,
        systolic: item.systolic,
        diastolic: item.diastolic,
        pulse: item.pulse ?? null,
        measuredAt: item.measuredAt,
        note: item.note ?? null,
        serverId: item.id,
        updatedAt: item.updatedAt,
        syncStatus: "SYNCED",
      });
    } else {
      await db.readings.add({
        systolic: item.systolic,
        diastolic: item.diastolic,
        pulse: item.pulse ?? null,
        measuredAt: item.measuredAt,
        note: item.note ?? null,
        serverId: item.id,
        updatedAt: item.updatedAt,
        syncStatus: "SYNCED",
        deletedAt: null,
      } as BloodPressureReading);
    }
  }
  for (const mapping of response.mappings) {
    const local = await db.readings.get(mapping.localId);
    if (local) {
      await db.readings.put({ ...local, serverId: mapping.serverId, syncStatus: "SYNCED" });
    }
  }
  setSession({
    ...session,
    lastSyncAt: response.serverTime,
    pendingDeletedServerIds: [],
  });
}

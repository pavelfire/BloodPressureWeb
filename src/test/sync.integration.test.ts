import { describe, expect, it } from "vitest";
import { db } from "../core/db/database";
import { createReading, runSync } from "../core/sync/sync";
import type { ApiClient } from "../core/api/client";
import type { SessionState } from "../core/types";

describe("sync integration", () => {
  it("maps local item to server id after sync", async () => {
    await db.readings.clear();
    await createReading({
      systolic: 125,
      diastolic: 82,
      pulse: 70,
      measuredAt: new Date().toISOString(),
      note: "before sync",
    });
    const [local] = await db.readings.toArray();
    expect(local).toBeTruthy();

    const api: Partial<ApiClient> = {
      sync: async () => ({
        mappings: [{ localId: local.id, serverId: "srv-1", status: "ok" }],
        remoteChanges: [],
        serverTime: new Date().toISOString(),
      }),
    };
    let session: SessionState = {
      accessToken: "a",
      refreshToken: "r",
      isLoggedIn: true,
      lastSyncAt: null,
      pendingDeletedServerIds: [],
    };
    await runSync(api as ApiClient, session, (next) => {
      session = next;
    });
    const synced = await db.readings.get(local.id);
    expect(synced?.serverId).toBe("srv-1");
    expect(session.lastSyncAt).toBeTruthy();
  });
});

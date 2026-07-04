import { useCallback, useEffect, useState } from "react";
import type { ApiClient } from "./client";

export type ApiConnectionStatus = "checking" | "online" | "offline";

const POLL_INTERVAL_MS = 30_000;

export function useApiConnectionStatus(api: ApiClient, serverUrl: string) {
  const [status, setStatus] = useState<ApiConnectionStatus>("checking");
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const check = useCallback(async () => {
    setStatus("checking");
    const ok = await api.checkHealth();
    setStatus(ok ? "online" : "offline");
    setLastCheckedAt(new Date());
  }, [api]);

  useEffect(() => {
    void check();
    const id = window.setInterval(() => void check(), POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [check, serverUrl]);

  return { status, lastCheckedAt, check };
}

import type { SessionState } from "../types";

const SESSION_KEY = "bpw_session_v1";
const DEFAULT_STATE: SessionState = {
  accessToken: "",
  refreshToken: "",
  isLoggedIn: false,
  lastSyncAt: null,
  pendingDeletedServerIds: [],
};

export function loadSession(): SessionState {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return DEFAULT_STATE;
  try {
    return { ...DEFAULT_STATE, ...(JSON.parse(raw) as SessionState) };
  } catch {
    return DEFAULT_STATE;
  }
}

export function saveSession(session: SessionState): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(): SessionState {
  localStorage.removeItem(SESSION_KEY);
  return DEFAULT_STATE;
}

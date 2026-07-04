import { z } from "zod";
import type {
  AuthCredentialsDto,
  RefreshTokenRequestDto,
  SessionState,
  SyncRequestDto,
  SyncResponseDto,
  TokenPairDto,
  UserDto,
} from "../types";

const tokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  expiresIn: z.number(),
});

const userSchema = z.object({
  id: z.string(),
  email: z.string(),
});

const syncSchema = z.object({
  mappings: z.array(z.object({ localId: z.number(), serverId: z.string(), status: z.string() })),
  remoteChanges: z.array(
    z.object({
      id: z.string(),
      systolic: z.number(),
      diastolic: z.number(),
      pulse: z.number().nullable().optional(),
      measuredAt: z.string(),
      note: z.string().nullable().optional(),
      createdAt: z.string(),
      updatedAt: z.string(),
      deletedAt: z.string().nullable().optional(),
    }),
  ),
  serverTime: z.string(),
});

export class ApiClient {
  constructor(
    private baseUrl: () => string,
    private getSession: () => SessionState,
    private setSession: (next: SessionState) => void,
  ) {}

  async register(body: AuthCredentialsDto): Promise<TokenPairDto> {
    return this.postAuth("/api/v1/auth/register", body);
  }
  async login(body: AuthCredentialsDto): Promise<TokenPairDto> {
    return this.postAuth("/api/v1/auth/login", body);
  }
  async logout(body: RefreshTokenRequestDto): Promise<void> {
    await this.request("/api/v1/auth/logout", {
      method: "POST",
      body: JSON.stringify(body),
      noAuth: true,
    });
  }
  async me(): Promise<UserDto> {
    const data = await this.request("/api/v1/auth/me", { method: "GET" });
    return userSchema.parse(data);
  }
  async sync(body: SyncRequestDto): Promise<SyncResponseDto> {
    const data = await this.request("/api/v1/sync", { method: "POST", body: JSON.stringify(body) });
    return syncSchema.parse(data);
  }

  async checkHealth(timeoutMs = 5000): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(`${this.baseUrl().replace(/\/$/, "")}/health`, {
        method: "GET",
        signal: controller.signal,
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }

  private async postAuth(path: string, body: AuthCredentialsDto): Promise<TokenPairDto> {
    const data = await this.request(path, {
      method: "POST",
      body: JSON.stringify(body),
      noAuth: true,
    });
    return tokenPairSchema.parse(data);
  }

  private async refreshToken(): Promise<TokenPairDto> {
    const session = this.getSession();
    if (!session.refreshToken) throw new Error("UNAUTHORIZED");
    const res = await fetch(`${this.baseUrl().replace(/\/$/, "")}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!res.ok) throw new Error("UNAUTHORIZED");
    return tokenPairSchema.parse(await res.json());
  }

  private async request(path: string, init: RequestInit & { noAuth?: boolean }): Promise<unknown> {
    const headers = new Headers(init.headers ?? {});
    headers.set("Content-Type", "application/json");
    const session = this.getSession();
    if (!init.noAuth && session.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);
    const call = async () =>
      fetch(`${this.baseUrl().replace(/\/$/, "")}${path}`, {
        ...init,
        headers,
      });

    let res = await call();
    if (res.status === 401 && !init.noAuth && session.refreshToken) {
      const fresh = await this.refreshToken();
      this.setSession({ ...session, ...fresh, isLoggedIn: true });
      headers.set("Authorization", `Bearer ${fresh.accessToken}`);
      res = await call();
    }
    if (!res.ok) {
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      throw new Error("NETWORK_ERROR");
    }
    if (res.status === 204) return null;
    return res.json();
  }
}

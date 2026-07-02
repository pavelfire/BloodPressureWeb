export type SyncStatus = "PENDING" | "SYNCED" | "FAILED";

export interface BloodPressureReading {
  id: number;
  systolic: number;
  diastolic: number;
  pulse: number | null;
  measuredAt: string;
  note: string | null;
  serverId: string | null;
  syncStatus: SyncStatus;
  updatedAt: string;
  deletedAt: string | null;
}

export type BpCategory = "NORMAL" | "ELEVATED" | "STAGE1" | "STAGE2" | "CRISIS";

export interface AuthCredentialsDto {
  email: string;
  password: string;
}

export interface RefreshTokenRequestDto {
  refreshToken: string;
}

export interface TokenPairDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface UserDto {
  id: string;
  email: string;
}

export interface RemoteReadingDto {
  id: string;
  systolic: number;
  diastolic: number;
  pulse?: number | null;
  measuredAt: string;
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
}

export interface SyncUpsertDto {
  localId?: number | null;
  serverId?: string | null;
  systolic: number;
  diastolic: number;
  pulse?: number | null;
  measuredAt: string;
  note?: string | null;
  updatedAt: string;
}

export interface SyncRequestDto {
  lastSyncAt?: string | null;
  upserts: SyncUpsertDto[];
  deletedServerIds: string[];
}

export interface SyncMappingDto {
  localId: number;
  serverId: string;
  status: string;
}

export interface SyncResponseDto {
  mappings: SyncMappingDto[];
  remoteChanges: RemoteReadingDto[];
  serverTime: string;
}

export interface SessionState {
  accessToken: string;
  refreshToken: string;
  isLoggedIn: boolean;
  lastSyncAt: string | null;
  pendingDeletedServerIds: string[];
}

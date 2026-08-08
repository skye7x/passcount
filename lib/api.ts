import { Preferences } from '@capacitor/preferences';
import { Counter, AppSettings, LogEntry, Training, EquipmentList } from './types';

// Base URL of the PassCount backend API.
// Set NEXT_PUBLIC_API_URL at build time (see .env.local.example).
// Falls back to localhost for local development.
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5220').replace(
  /\/+$/,
  '',
);

const AUTH_STORAGE_KEY = 'passcount_auth_session';

export interface CloudSnapshot {
  counters: Counter[];
  logs: LogEntry[];
  trainings: Training[];
  equipment: EquipmentList[];
  settings: AppSettings;
  updatedAt?: string;
}

interface StoredSession {
  email: string;
  accessToken: string;
  accessTokenExpiresAt: number; // epoch ms
  refreshToken: string;
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

async function readSession(): Promise<StoredSession | null> {
  try {
    const { value } = await Preferences.get({ key: AUTH_STORAGE_KEY });
    return value ? (JSON.parse(value) as StoredSession) : null;
  } catch {
    return null;
  }
}

async function writeSession(session: StoredSession | null): Promise<void> {
  try {
    if (session) {
      await Preferences.set({ key: AUTH_STORAGE_KEY, value: JSON.stringify(session) });
    } else {
      await Preferences.remove({ key: AUTH_STORAGE_KEY });
    }
  } catch {
    // Ignore storage failures; user will simply be prompted to log in again.
  }
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (typeof data?.message === 'string') return data.message;
    if (typeof data?.title === 'string') return data.title;
    if (data?.errors) {
      const first = Object.values(data.errors as Record<string, string[]>)[0];
      if (Array.isArray(first) && first.length) return first[0];
    }
  } catch {
    // fall through
  }
  return res.status === 401
    ? 'Invalid email or password.'
    : `Request failed (${res.status}). Please try again.`;
}

async function rawRequest(path: string, init: RequestInit): Promise<Response> {
  return fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });
}

interface AuthResponsePayload {
  email: string;
  accessToken: string;
  expiresInSeconds: number;
  refreshToken: string;
}

async function persistFromAuthResponse(payload: AuthResponsePayload): Promise<void> {
  const session: StoredSession = {
    email: payload.email,
    accessToken: payload.accessToken,
    accessTokenExpiresAt: Date.now() + payload.expiresInSeconds * 1000 - 5000, // 5s safety margin
    refreshToken: payload.refreshToken,
  };
  await writeSession(session);
}

export async function register(
  email: string,
  password: string,
): Promise<{ email: string }> {
  const res = await rawRequest('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  const data = (await res.json()) as AuthResponsePayload;
  await persistFromAuthResponse(data);
  return { email: data.email };
}

export async function login(email: string, password: string): Promise<{ email: string }> {
  const res = await rawRequest('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  const data = (await res.json()) as AuthResponsePayload;
  await persistFromAuthResponse(data);
  return { email: data.email };
}

export async function logout(): Promise<void> {
  const session = await readSession();
  await writeSession(null);
  if (!session) return;
  try {
    await rawRequest('/api/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
  } catch {
    // Best effort — local session is already cleared either way.
  }
}

export async function getCurrentSession(): Promise<{ email: string } | null> {
  const session = await readSession();
  return session ? { email: session.email } : null;
}

async function refreshAccessToken(session: StoredSession): Promise<StoredSession | null> {
  try {
    const res = await rawRequest('/api/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    });
    if (!res.ok) {
      await writeSession(null);
      return null;
    }
    const data = (await res.json()) as AuthResponsePayload;
    const updated: StoredSession = {
      email: data.email,
      accessToken: data.accessToken,
      accessTokenExpiresAt: Date.now() + data.expiresInSeconds * 1000 - 5000,
      refreshToken: data.refreshToken,
    };
    await writeSession(updated);
    return updated;
  } catch {
    return null;
  }
}

/** Returns a valid access token, refreshing it first if it's expired or close to it. */
async function getValidAccessToken(): Promise<string | null> {
  let session = await readSession();
  if (!session) return null;
  if (Date.now() >= session.accessTokenExpiresAt) {
    session = await refreshAccessToken(session);
    if (!session) return null;
  }
  return session.accessToken;
}

async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = await getValidAccessToken();
  if (!token) throw new ApiError('Not signed in.', 401);

  let res = await rawRequest(path, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers || {}) },
  });

  if (res.status === 401) {
    // Token may have been revoked/expired server-side; try one refresh + retry.
    const session = await readSession();
    if (session) {
      const refreshed = await refreshAccessToken(session);
      if (refreshed) {
        res = await rawRequest(path, {
          ...init,
          headers: { Authorization: `Bearer ${refreshed.accessToken}`, ...(init.headers || {}) },
        });
      }
    }
  }
  return res;
}

export async function fetchCloudData(): Promise<CloudSnapshot> {
  const res = await authFetch('/api/data', { method: 'GET' });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
  return (await res.json()) as CloudSnapshot;
}

export async function pushCloudData(snapshot: CloudSnapshot): Promise<void> {
  const res = await authFetch('/api/data', {
    method: 'PUT',
    body: JSON.stringify(snapshot),
  });
  if (!res.ok) throw new ApiError(await parseErrorMessage(res), res.status);
}

export function isConfigured(): boolean {
  return !!API_BASE_URL;
}

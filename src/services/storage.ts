import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { Dictation, DictationSession, ProgressEntry } from '../types';
import { API_BASE } from '../config';

// === User Profile System ===

export interface UserProfile {
  id: string;
  name: string;
  icon: string;
}

let activeUserId: string | null = null;
let authToken: string | null = null;
let usersCache: UserProfile[] | null = null;

async function fetchUsers(): Promise<UserProfile[]> {
  if (usersCache) return usersCache;
  try {
    const res = await fetch(`${API_BASE}/api/db?table=users`);
    if (!res.ok) return [];
    const data = await res.json();
    usersCache = data;
    return data;
  } catch {
    return [];
  }
}

export function getUsers(): UserProfile[] {
  return usersCache ?? [];
}

export async function loadUsers(): Promise<UserProfile[]> {
  return fetchUsers();
}

export async function setActiveUser(userId: string, token?: string): Promise<void> {
  activeUserId = userId;
  if (token) authToken = token;
  await AsyncStorage.setItem('activeUserId', userId);
  if (token) await AsyncStorage.setItem('authToken', token);
}

export async function getAuthToken(): Promise<string | null> {
  if (!authToken) {
    authToken = await AsyncStorage.getItem('authToken');
  }
  return authToken;
}

export async function getActiveUser(): Promise<UserProfile | null> {
  if (!activeUserId) {
    activeUserId = await AsyncStorage.getItem('activeUserId');
  }
  const users = getUsers();
  return users.find(u => u.id === activeUserId) ?? null;
}

export async function getActiveUserId(): Promise<string | null> {
  if (!activeUserId) {
    activeUserId = await AsyncStorage.getItem('activeUserId');
  }
  return activeUserId;
}

export async function logout(): Promise<void> {
  activeUserId = null;
  authToken = null;
  await AsyncStorage.removeItem('activeUserId');
  await AsyncStorage.removeItem('authToken');
}

// === API helper ===

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAuthToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function dbFetch(path: string, options?: RequestInit) {
  const auth = await authHeaders();
  const headers = { ...auth, ...options?.headers };
  const res = await fetch(`${API_BASE}/api/db${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `DB request failed: ${res.status}`);
  }
  return res.json();
}

export { authHeaders };

// === Sentence splitting ===

export function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 0);
}

// === Dictations (SHARED across all users) ===

let dictationsCache: { data: Dictation[]; fetchedAt: number } | null = null;
const DICTATION_CACHE_TTL = 5 * 60 * 1000;

export async function getAllDictations(): Promise<Dictation[]> {
  if (dictationsCache && Date.now() - dictationsCache.fetchedAt < DICTATION_CACHE_TTL) {
    return dictationsCache.data;
  }
  const all = await dbFetch('?table=dictations');
  const filtered = all.filter((d: Dictation & { archived?: boolean }) => !d.archived);
  dictationsCache = { data: filtered, fetchedAt: Date.now() };
  return filtered;
}

export function invalidateDictationsCache(): void {
  dictationsCache = null;
}

export async function getDictation(id: string): Promise<Dictation | undefined> {
  const data = await dbFetch(`?table=dictations&id=${id}`);
  return Array.isArray(data) ? data[0] : data;
}

// === Sessions (per user) ===

export async function getAllSessions(): Promise<DictationSession[]> {
  const userId = await getActiveUserId();
  if (!userId) return [];
  return dbFetch(`?table=sessions&userId=${userId}`);
}

export async function getSession(id: string): Promise<DictationSession | undefined> {
  const data = await dbFetch(`?table=sessions&id=${id}`);
  return Array.isArray(data) ? data[0] : data;
}

export async function createSession(dictationId: string): Promise<DictationSession> {
  const userId = await getActiveUserId();
  if (!userId) throw new Error('No active user');
  const session: DictationSession = {
    id: uuidv4(),
    dictationId,
    startedAt: new Date().toISOString(),
    errors: [],
  };
  await dbFetch('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table: 'sessions', data: { ...session, userId } }),
  });
  return session;
}

export async function updateSession(id: string, data: Partial<DictationSession>): Promise<DictationSession | undefined> {
  const result = await dbFetch('', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table: 'sessions', id, data }),
  });
  return result;
}

// === Progress (per user) ===

export async function getProgress(): Promise<ProgressEntry[]> {
  const userId = await getActiveUserId();
  if (!userId) return [];
  return dbFetch(`?table=progress&userId=${userId}`);
}

export async function addProgressEntry(entry: ProgressEntry): Promise<void> {
  const userId = await getActiveUserId();
  if (!userId) return;
  await dbFetch('', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ table: 'progress', data: { ...entry, userId } }),
  });
}

// === Init ===

export async function initApp(): Promise<UserProfile | null> {
  await fetchUsers();
  return getActiveUser();
}

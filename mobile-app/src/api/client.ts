import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  BACKEND_URL: 'backendUrl',
  AUTH_TOKEN: 'authToken',
};

async function getBaseUrl(): Promise<string> {
  const url = await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_URL);
  if (!url) throw new Error('请先配置后端地址');
  return url;
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

export async function apiGet(path: string) {
  const base = await getBaseUrl();
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { headers });
  return res.json();
}

export async function apiPost(path: string, body?: unknown) {
  const base = await getBaseUrl();
  const token = await getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

export async function apiDelete(path: string) {
  const base = await getBaseUrl();
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, {
    method: 'DELETE',
    headers,
  });
  return { ok: res.ok, data: await res.json() };
}

export { STORAGE_KEYS };

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

function extractErrorMessage(data: unknown): string {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (obj.detail && typeof obj.detail === 'object' && 'message' in (obj.detail as Record<string, unknown>)) {
      return (obj.detail as Record<string, unknown>).message as string;
    }
    if (typeof obj.message === 'string') {
      return obj.message;
    }
    if (typeof obj.detail === 'string') {
      return obj.detail;
    }
  }
  return '请求失败';
}

async function handleResponse(res: Response): Promise<any> {
  const data = await res.json();
  if (!res.ok) {
    throw new Error(extractErrorMessage(data));
  }
  return data;
}

export async function apiGet(path: string) {
  const base = await getBaseUrl();
  const token = await getToken();
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${base}${path}`, { headers });
  return handleResponse(res);
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
  return handleResponse(res);
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
  const data = await res.json();
  if (!res.ok) {
    throw new Error(extractErrorMessage(data));
  }
  return { ok: res.ok, data };
}

export { STORAGE_KEYS };

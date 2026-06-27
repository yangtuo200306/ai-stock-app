import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  BACKEND_URL: 'backendUrl',
  AUTH_TOKEN: 'authToken',
};

export class ApiError extends Error {
  status?: number;
  errorCode?: string;
  raw?: unknown;

  constructor(message: string, status?: number, errorCode?: string, raw?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.errorCode = errorCode;
    this.raw = raw;
  }
}

async function getBaseUrl(): Promise<string> {
  const url = await AsyncStorage.getItem(STORAGE_KEYS.BACKEND_URL);
  if (!url) throw new ApiError('请先配置后端地址');
  return url;
}

async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);
}

function extractErrorMessage(data: unknown): { message: string; errorCode?: string } {
  if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    // FastAPI structured error: { detail: { message, error_code } }
    if (obj.detail && typeof obj.detail === 'object') {
      const detail = obj.detail as Record<string, unknown>;
      const message =
        typeof detail.message === 'string'
          ? detail.message
          : typeof detail.detail === 'string'
            ? detail.detail
            : undefined;
      const errorCode = typeof detail.error_code === 'string' ? detail.error_code : undefined;
      if (message) return { message, errorCode };
    }
    // FastAPI plain detail string
    if (typeof obj.detail === 'string') {
      return { message: obj.detail };
    }
    // Generic message field
    if (typeof obj.message === 'string') {
      return { message: obj.message };
    }
  }
  return { message: '请求失败' };
}

async function handleResponse(res: Response): Promise<any> {
  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ApiError(
      res.status === 401 ? '登录状态已失效，请重新登录' : `请求失败 (HTTP ${res.status})`,
      res.status,
    );
  }

  if (!res.ok) {
    // 401 时自动清除 token
    if (res.status === 401) {
      await AsyncStorage.removeItem(STORAGE_KEYS.AUTH_TOKEN);
    }
    const { message, errorCode } = extractErrorMessage(data);
    throw new ApiError(message, res.status, errorCode, data);
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
  return handleResponse(res);
}

export async function apiPostStream(
  path: string,
  body: object,
  onChunk: (text: string) => void,
  onDone: (headers: Headers) => void,
  onError: (error: string) => void,
): Promise<void> {
  const base = await getBaseUrl();
  const token = await getToken();
  const response = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let message = '请求失败';
    try {
      const err = await response.json();
      const { message: msg } = extractErrorMessage(err);
      message = msg;
    } catch {
      // ignore
    }
    onError(message);
    return;
  }

  const reader = response.body?.getReader();
  if (!reader) {
    onError('响应流不可用');
    return;
  }

  const decoder = new TextDecoder();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const text = decoder.decode(value, { stream: true });
      onChunk(text);
    }
  } catch (err) {
    onError(err instanceof Error ? err.message : '流读取失败');
    return;
  }

  onDone(response.headers);
}

export { STORAGE_KEYS };

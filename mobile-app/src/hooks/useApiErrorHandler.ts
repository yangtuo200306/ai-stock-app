import { useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { resetAllStores } from '../stores';

export interface ApiErrorResult {
  message: string;
  isAuthExpired: boolean;
}

const AUTH_ERROR_CODES = ['INVALID_TOKEN', 'INVALID_TOKEN_FORMAT'];

function extractErrorInfo(err: unknown): { message: string; status?: number; errorCode?: string } {
  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    // Structured ApiError from client.ts
    if (typeof obj.message === 'string') {
      return {
        message: obj.message,
        status: typeof obj.status === 'number' ? obj.status : undefined,
        errorCode: typeof obj.errorCode === 'string' ? obj.errorCode : undefined,
      };
    }
  }

  if (err instanceof Error) {
    return { message: err.message };
  }

  return { message: '请求失败' };
}

export function useApiErrorHandler() {
  const { clearSession } = useAuth();

  const handleError = useCallback(
    (err: unknown, fallbackMessage?: string): ApiErrorResult => {
      const { message, status, errorCode } = extractErrorInfo(err);

      const isAuthExpired =
        status === 401 ||
        (errorCode != null && AUTH_ERROR_CODES.includes(errorCode));

      if (isAuthExpired) {
        clearSession();
        resetAllStores();
        return {
          message: '登录状态已失效，请重新登录',
          isAuthExpired: true,
        };
      }

      return {
        message: message || fallbackMessage || '请求失败',
        isAuthExpired: false,
      };
    },
    [clearSession],
  );

  return { handleError };
}

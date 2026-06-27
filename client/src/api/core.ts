/**
 * Core HTTP client — shared by all api/* modules.
 * Auth is handled via httpOnly session cookies set by the server.
 * credentials: 'include' is required so the browser sends the cookie on every request.
 * The Authorization header and localStorage token are no longer used.
 */

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8081/api';

export function baseHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}

import { getFriendlyErrorMessage } from './errorMessages';
import { syncManager } from './syncManager';

export async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const method = options.method || 'GET';
  const headers = { ...baseHeaders(), ...(options.headers as Record<string, string>) };

  try {
    const res = await fetch(url, {
      ...options,
      credentials: 'include', // sends httpOnly session cookie automatically
      headers,
    });

    if (res.status === 401) {
      // Session expired or not authenticated — redirect to login.
      // Clear any stale localStorage remnants from the old auth approach.
      localStorage.removeItem('evolv_token');
      localStorage.removeItem('evolv_user');
      window.location.href = '/login';
      throw new Error('Session expired');
    }

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(getFriendlyErrorMessage(res.status, err.error));
    }

    if (res.status === 204) return undefined as T;
    return res.json();
  } catch (err) {
    const isNetworkError = err instanceof TypeError || (err instanceof Error && err.message.includes('Failed to fetch'));
    const isMutating = method !== 'GET';
    const isAuth = url.includes('/auth/');

    if ((isNetworkError || !navigator.onLine) && isMutating && !isAuth) {
      let parsedBody = null;
      if (options.body) {
        try {
          parsedBody = JSON.parse(options.body as string);
        } catch (_) {
          parsedBody = options.body;
        }
      }
      return syncManager.enqueue<T>(url, method, parsedBody, headers);
    }

    throw err;
  }
}


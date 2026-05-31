import { describe, it, expect, beforeEach, vi } from 'vitest';
import { authHeaders, request } from './core';

describe('API Core Client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('authHeaders', () => {
    it('should return default Content-Type header when no token exists', () => {
      const headers = authHeaders();
      expect(headers).toEqual({
        'Content-Type': 'application/json',
      });
    });

    it('should return Authorization header with Bearer token when token exists in localStorage', () => {
      localStorage.setItem('evolv_token', 'test-jwt-token');
      const headers = authHeaders();
      expect(headers).toEqual({
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-jwt-token',
      });
    });
  });

  describe('request helper', () => {
    it('should perform a successful fetch and return JSON', async () => {
      const mockData = { id: 1, title: 'Test Task' };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await request('/api/tasks');

      expect(mockFetch).toHaveBeenCalledWith('/api/tasks', expect.any(Object));
      expect(result).toEqual(mockData);
    });

    it('should throw an error on non-ok status', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        json: async () => ({ error: 'Bad Request' }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await expect(request('/api/tasks')).rejects.toThrow('Bad Request');
    });

    it('should handle 401 unauthorized status by clearing token and throwing error', async () => {
      localStorage.setItem('evolv_token', 'expired-token');
      localStorage.setItem('evolv_user', 'some-user');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });
      vi.stubGlobal('fetch', mockFetch);

      // Mock window.location
      const locationMock = { href: '' };
      vi.spyOn(window, 'location', 'get').mockReturnValue(locationMock as any);

      await expect(request('/api/tasks')).rejects.toThrow('Session expired');

      expect(localStorage.getItem('evolv_token')).toBeNull();
      expect(localStorage.getItem('evolv_user')).toBeNull();
      expect(locationMock.href).toBe('/login');
    });
  });
});

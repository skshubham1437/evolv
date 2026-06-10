import { describe, it, expect, beforeEach, vi } from 'vitest';
import { baseHeaders, request } from './core';

describe('API Core Client', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  describe('baseHeaders', () => {
    it('should return Content-Type application/json', () => {
      const headers = baseHeaders();
      expect(headers).toEqual({ 'Content-Type': 'application/json' });
    });

    it('should NOT include an Authorization header (cookie-based auth)', () => {
      const headers = baseHeaders();
      expect(headers).not.toHaveProperty('Authorization');
    });
  });

  describe('request helper', () => {
    it('should send credentials:include on every request', async () => {
      const mockData = { id: 1, title: 'Test Task' };
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => mockData,
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await request('/api/tasks');

      expect(mockFetch).toHaveBeenCalledWith(
        '/api/tasks',
        expect.objectContaining({ credentials: 'include' }),
      );
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

    it('should clear stale localStorage and redirect to /login on 401', async () => {
      // Stale data from old localStorage-based auth
      localStorage.setItem('evolv_token', 'old-token');
      localStorage.setItem('evolv_user', 'old-user');

      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
      });
      vi.stubGlobal('fetch', mockFetch);

      const locationMock = { href: '' };
      vi.spyOn(window, 'location', 'get').mockReturnValue(locationMock as any);

      await expect(request('/api/tasks')).rejects.toThrow('Session expired');

      // Stale localStorage entries should be cleared
      expect(localStorage.getItem('evolv_token')).toBeNull();
      expect(localStorage.getItem('evolv_user')).toBeNull();
      expect(locationMock.href).toBe('/login');
    });

    it('should return undefined for 204 No Content', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 204,
      });
      vi.stubGlobal('fetch', mockFetch);

      const result = await request('/api/something');
      expect(result).toBeUndefined();
    });
  });
});

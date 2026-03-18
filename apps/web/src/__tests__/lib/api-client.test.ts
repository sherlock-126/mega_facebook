import { apiClient, setTokens, clearTokens, getAccessToken } from '../../lib/api-client';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

beforeEach(() => {
  mockFetch.mockReset();
  clearTokens();
});

describe('api-client', () => {
  describe('token management', () => {
    it('stores and retrieves tokens', () => {
      setTokens('access123', 'refresh456');
      expect(getAccessToken()).toBe('access123');
    });

    it('clears tokens', () => {
      setTokens('access123', 'refresh456');
      clearTokens();
      expect(getAccessToken()).toBeNull();
    });
  });

  describe('apiClient', () => {
    it('makes authenticated requests with token', async () => {
      setTokens('mytoken', 'myrefresh');
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: { id: '1' } }),
      });

      const result = await apiClient('/profile/me');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/profile/me'),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer mytoken',
          }),
        }),
      );
      expect(result).toEqual({ success: true, data: { id: '1' } });
    });

    it('throws on non-ok response', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Bad request' }),
      });

      await expect(apiClient('/test')).rejects.toEqual(
        expect.objectContaining({
          success: false,
          message: 'Bad request',
          statusCode: 400,
        }),
      );
    });

    it('attempts token refresh on 401', async () => {
      setTokens('expired', 'validrefresh');

      // First call returns 401
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: () => Promise.resolve({ message: 'Unauthorized' }),
      });

      // Refresh call succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            data: { accessToken: 'newtoken', refreshToken: 'newrefresh' },
          }),
      });

      // Retry succeeds
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ success: true, data: {} }),
      });

      const result = await apiClient('/test');
      expect(result).toEqual({ success: true, data: {} });
      expect(getAccessToken()).toBe('newtoken');
    });
  });
});

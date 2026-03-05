export const API_BASE_URL =
  (import.meta as any)?.env?.NG_APP_API_URL ||
  (import.meta as any)?.env?.NG_APP_API_BASE ||
  'http://localhost:3300/api/v1';

export const REFRESH_TOKEN_ENDPOINT = '/auth/refresh';

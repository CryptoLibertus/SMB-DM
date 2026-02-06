export interface ApiResponse<T = unknown> {
  data: T | null;
  error: string | null;
  meta?: Record<string, unknown>;
}

export function success<T>(data: T, meta?: Record<string, unknown>): ApiResponse<T> {
  return { data, error: null, meta };
}

export function error(message: string, meta?: Record<string, unknown>): ApiResponse<never> {
  return { data: null, error: message, meta };
}

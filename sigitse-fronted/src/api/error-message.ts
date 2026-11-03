import { isAxiosError } from 'axios';

export function errorMessage(error: unknown, fallback: string): string {
  if (!isAxiosError<{ message?: string | string[] }>(error)) return fallback;
  const message = error.response?.data?.message;
  return Array.isArray(message) ? message.join('. ') : message || fallback;
}

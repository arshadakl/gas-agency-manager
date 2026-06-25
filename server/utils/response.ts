import type { ApiResponse, ApiListResponse } from '~/types/api'

export function success<T>(data: T, message?: string): ApiResponse<T> {
  return { data, ...(message ? { message } : {}) }
}

export function successList<T>(data: T[], total: number): ApiListResponse<T> {
  return { data, total }
}

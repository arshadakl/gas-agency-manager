import { FetchError } from 'ofetch'

export interface ParsedApiError {
  message: string
  isServerError: boolean
  isValidationError: boolean
  statusCode?: number
}

/**
 * Extracts a human-readable, actionable error message from any API error,
 * including Zod field errors, business validation errors, and 500 server crashes.
 */
export function formatApiError(err: unknown, fallback = 'Operation failed'): string {
  return parseApiError(err, fallback).message
}

export function parseApiError(err: unknown, fallback = 'Operation failed'): ParsedApiError {
  if (!err) {
    return { message: fallback, isServerError: false, isValidationError: false }
  }

  // Handle ofetch FetchError
  if (err instanceof FetchError || (typeof err === 'object' && err !== null && ('data' in err || 'statusCode' in err || 'status' in err))) {
    const fetchErr = err as FetchError
    const data = fetchErr.data as any
    const statusCode = fetchErr.status ?? fetchErr.statusCode ?? data?.statusCode

    // 1. Check for Zod validation errors ({ data: { fieldErrors, formErrors } })
    if (data?.data?.fieldErrors && typeof data.data.fieldErrors === 'object') {
      const entries = Object.entries(data.data.fieldErrors).filter(
        ([_, errs]) => Array.isArray(errs) && errs.length > 0
      )
      const firstEntry = entries[0]
      if (firstEntry) {
        const [field, errs] = firstEntry
        const fieldName = field
          .replace(/([A-Z])/g, ' $1')
          .replace(/_/g, ' ')
          .trim()
        const prettyField = fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
        const errorDetail = Array.isArray(errs) ? (errs[0] ?? 'Invalid value') : String(errs)
        return {
          message: `Validation: ${prettyField} — ${errorDetail}`,
          isServerError: false,
          isValidationError: true,
          statusCode: 422,
        }
      }
    }

    if (data?.data?.formErrors && Array.isArray(data.data.formErrors) && data.data.formErrors.length > 0) {
      return {
        message: `Validation: ${data.data.formErrors[0]}`,
        isServerError: false,
        isValidationError: true,
        statusCode: 422,
      }
    }

    // 2. Server Errors (5xx)
    if (statusCode && statusCode >= 500) {
      const detail = data?.message || data?.statusMessage || fetchErr.statusText || fallback
      return {
        message: `Server Error: ${detail}`,
        isServerError: true,
        isValidationError: false,
        statusCode,
      }
    }

    // 3. Explicit business message from server (4xx)
    if (data?.message && data.message !== 'Validation failed') {
      return {
        message: data.message,
        isServerError: false,
        isValidationError: statusCode === 422,
        statusCode,
      }
    }

    if (data?.statusMessage && data.statusMessage !== 'Validation failed') {
      return {
        message: data.statusMessage,
        isServerError: false,
        isValidationError: statusCode === 422,
        statusCode,
      }
    }

    // Network / fetch failure without server response
    if (fetchErr.name === 'FetchError' && (!statusCode || fetchErr.message?.includes('fetch failed'))) {
      return {
        message: 'Network error. Please check your internet connection.',
        isServerError: false,
        isValidationError: false,
      }
    }
  }

  if (err instanceof Error) {
    if (err.name === 'FetchError' || err.message?.includes('fetch failed')) {
      return {
        message: 'Network error. Please check your internet connection.',
        isServerError: false,
        isValidationError: false,
      }
    }
    return { message: err.message, isServerError: false, isValidationError: false }
  }

  if (typeof err === 'string') {
    return { message: err, isServerError: false, isValidationError: false }
  }

  return { message: fallback, isServerError: false, isValidationError: false }
}

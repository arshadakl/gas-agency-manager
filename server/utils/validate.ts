import type { H3Event } from 'h3'
import type { ZodType } from 'zod'

export async function parseBody<T>(event: H3Event, schema: ZodType<T>): Promise<T> {
  const body = await readBody(event)
  const result = schema.safeParse(body)
  if (!result.success) {
    throw createError({ statusCode: 422, message: 'Validation failed', data: result.error.flatten() })
  }
  return result.data
}

export function parseQuery<T>(event: H3Event, schema: ZodType<T>): T {
  const result = schema.safeParse(getQuery(event))
  if (!result.success) {
    throw createError({ statusCode: 422, message: 'Validation failed', data: result.error.flatten() })
  }
  return result.data
}

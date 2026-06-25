import { drizzle } from 'drizzle-orm/d1'
import type { H3Event } from 'h3'
import * as schema from './schema'

export function useDB(event: H3Event) {
  const { cloudflare } = event.context
  return drizzle(cloudflare.env.DB, { schema })
}

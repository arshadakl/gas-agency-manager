const PUBLIC_PATHS = ['/api/auth/login', '/api/backup']

export default defineEventHandler(async (event) => {
  if (!event.path.startsWith('/api/')) return
  if (PUBLIC_PATHS.some((p) => event.path.startsWith(p))) return
  await requireUser(event)
})

export default defineEventHandler(async (event) => {
  await clearUserSession(event)
  return { data: null, message: 'Logged out' }
})

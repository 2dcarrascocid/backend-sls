import { verifyApiKey } from './authMiddleware.js'

export const withAuth = (handlerFn) => async (event, context) => {
  const unauthorized = verifyApiKey(event)
  if (unauthorized) return unauthorized
  return handlerFn(event, context)
}

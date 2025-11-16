import { Env } from './env'

export function planFromPrice(env: Env, priceId?: string) {
  if (!priceId) return undefined
  if (env.STRIPE_PRICE_FREE && priceId === env.STRIPE_PRICE_FREE) return 'free'
  if (env.STRIPE_PRICE_PRO && priceId === env.STRIPE_PRICE_PRO) return 'pro'
  if (env.STRIPE_PRICE_ENTERPRISE && priceId === env.STRIPE_PRICE_ENTERPRISE) return 'enterprise'
  return undefined
}

export function planFromMetadata(meta: any) {
  const plan = meta?.plan as string | undefined
  if (plan === 'free' || plan === 'pro' || plan === 'enterprise') return plan
  return undefined
}
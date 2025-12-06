import { FastifyInstance } from 'fastify'
import Stripe from 'stripe'
import { setWorkspacePlan } from '../lib/limits'
import { planFromPrice, planFromMetadata } from '../lib/stripePlan'
import { z } from 'zod'

export default async function routes(app: FastifyInstance) {
  const stripe = new Stripe(process.env.STRIPE_API_KEY || '', { apiVersion: '2023-10-16' })

  app.post('/stripe/checkout', { preHandler: (app as any).requireAuth, schema: { tags: ['billing'], security: [{ bearerAuth: [] }] } }, async (req, reply) => {
    const body = z.object({ workspace_id: z.string(), plan: z.enum(['pro','enterprise']), success_url: z.string().url(), cancel_url: z.string().url() }).safeParse(req.body)
    if (!body.success) return reply.code(400).send({ error: 'invalid_payload' })
    const { workspace_id, plan, success_url, cancel_url } = body.data
    const env = (app as any).config.env
    const price = plan === 'pro' ? env.STRIPE_PRICE_PRO : env.STRIPE_PRICE_ENTERPRISE
    if (!price) return reply.code(400).send({ error: 'price_not_configured' })
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [{ price, quantity: 1 }],
        success_url,
        cancel_url,
        metadata: { workspace_id, plan }
      })
      return { id: session.id, url: (session as any).url }
    } catch (e: any) {
      return reply.code(500).send({ error: 'checkout_failed', details: e?.message })
    }
  })

  app.post('/stripe/webhook', { schema: { tags: ['billing'] } }, async (req, reply) => {
    let event: Stripe.Event | undefined
    const secret = (app as any).config.env.STRIPE_WEBHOOK_SECRET as string | undefined
    const sig = req.headers['stripe-signature'] as string | undefined

    if (secret && sig && (req as any).rawBody) {
      try {
        event = stripe.webhooks.constructEvent((req as any).rawBody, sig, secret)
      } catch {
        return reply.code(400).send({ error: 'invalid_signature' })
      }
    } else {
      event = req.body as any
    }

    if (!event) return reply.code(400).send({ error: 'invalid_event' })

    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const workspace_id = (sub.metadata as any)?.workspace_id as string | undefined
        const priceId = sub.items?.data?.[0]?.price?.id
        const plan = planFromMetadata(sub.metadata) || planFromPrice((app as any).config.env, priceId) || 'free'
        if (workspace_id) await setWorkspacePlan((app as any).config.supabase, workspace_id, plan as any)
        break
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const workspace_id = (session.metadata as any)?.workspace_id as string | undefined
        const plan = planFromMetadata(session.metadata) || 'free'
        if (workspace_id) await setWorkspacePlan((app as any).config.supabase, workspace_id, plan as any)
        break
      }
      default:
        break
    }

    return { received: true }
  })
}

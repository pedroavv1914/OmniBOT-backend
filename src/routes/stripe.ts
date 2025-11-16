import { FastifyInstance } from 'fastify'
import Stripe from 'stripe'
import { setWorkspacePlan } from '../lib/limits'
import { planFromPrice, planFromMetadata } from '../lib/stripePlan'

export default async function routes(app: FastifyInstance) {
  const stripe = new Stripe(process.env.STRIPE_API_KEY || '', { apiVersion: '2023-10-16' })

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
        if (workspace_id) setWorkspacePlan(workspace_id, plan as any)
        break
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const workspace_id = (session.metadata as any)?.workspace_id as string | undefined
        const plan = planFromMetadata(session.metadata) || 'free'
        if (workspace_id) setWorkspacePlan(workspace_id, plan as any)
        break
      }
      default:
        break
    }

    return { received: true }
  })
}
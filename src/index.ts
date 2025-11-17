import Fastify from 'fastify'
import cors from '@fastify/cors'
import { z } from 'zod'
import dotenv from 'dotenv'
import flows from './routes/flows'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import bots from './routes/bots'
import conversations from './routes/conversations'
import workspaces from './routes/workspaces'
import { EnvSchema } from './lib/env'
import { buildSupabase } from './lib/supabase'
import events from './routes/events'
import { buildIncomingQueue } from './queues/incoming'
import { startIncomingWorker } from './workers/incoming'
import webhooks from './routes/webhooks'
import stripeWebhook from './routes/stripe'
import type { Queue } from 'bullmq'
const jwt: any = require('jsonwebtoken')
import type { SupabaseClient } from '@supabase/supabase-js'

dotenv.config()

const env = EnvSchema.parse(process.env)
const app = Fastify({ logger: true })
const queues: { incoming: Queue | null } = { incoming: buildIncomingQueue(env) }
const supabase: SupabaseClient | undefined = buildSupabase(env)
app.decorate('config', { env, supabase, queues })

app.register(cors, { origin: true })
app.register(swagger, {
  openapi: {
    info: { title: 'OmniBOT API', version: '0.1.0' }
  }
})
app.register(swaggerUi, { routePrefix: '/docs' })

app.get('/health', async () => {
  return { ok: true }
})

app.register(flows)
app.register(bots)
app.register(events)
app.register(conversations)
app.register(workspaces)
app.register(webhooks)
app.register(stripeWebhook)

const port = env.PORT ? Number(env.PORT) : 3000

const requireAuth = async (req: any, reply: any) => {
  const secret = (app as any).config.env.JWT_SECRET as string | undefined
  if (!secret) return
  const h = req.headers?.authorization as string | undefined
  if (!h || !h.startsWith('Bearer ')) return reply.code(401).send({ error: 'unauthorized' })
  const token = h.slice(7)
  try {
    jwt.verify(token, secret)
  } catch {
    return reply.code(401).send({ error: 'invalid_token' })
  }
}
app.decorate('requireAuth', requireAuth)

app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`server ${port}`)
  const cfg = (app as any).config
  if (cfg.queues.incoming) startIncomingWorker(app, env)
})
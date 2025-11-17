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

app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`server ${port}`)
  if (env.REDIS_URL) startIncomingWorker(app, env)
})
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
import auth from './routes/auth'
import users from './routes/users'
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
    info: { title: 'OmniBOT API', version: '0.1.0' },
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }
      }
    },
    security: [{ bearerAuth: [] }]
  }
})
app.register(swaggerUi, { routePrefix: '/docs' })

app.get('/health', { schema: { security: [] } }, async () => {
  const cfg = (app as any).config
  return { ok: true, supabase: !!cfg.supabase, redis: !!cfg.queues.incoming }
})

app.register(flows)
app.register(bots)
app.register(events)
app.register(conversations)
app.register(workspaces)
app.register(webhooks)
app.register(auth)
app.register(users)

const port = env.PORT ? Number(env.PORT) : 3000

const requireAuth = async (req: any, reply: any) => {
  const h = req.headers?.authorization as string | undefined
  const token = h?.startsWith('Bearer ') ? h.slice(7) : undefined
  const secret = (app as any).config.env.JWT_SECRET as string | undefined
  const supabase = (app as any).config.supabase
  if (!secret && !supabase) return
  if (!token) return reply.code(401).send({ error: 'unauthorized' })
  if (secret) {
    try { jwt.verify(token, secret) } catch { return reply.code(401).send({ error: 'invalid_token' }) }
    return
  }
  if (supabase) {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return reply.code(401).send({ error: 'invalid_token' })
    return
  }
}
app.decorate('requireAuth', requireAuth)

app.setErrorHandler(async (err, req, reply) => {
  app.log.error({ msg: 'request_error', url: req.url, method: req.method, params: req.params, query: req.query, body: req.body, err })
  if (!reply.sent) reply.code(500).send({ error: 'internal_error' })
})
app.addHook('onResponse', async (req, reply) => {
  app.log.info({ msg: 'response', url: req.url, method: req.method, statusCode: reply.statusCode })
})

app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`server ${port}`)
  const cfg = (app as any).config
  if (cfg.queues.incoming) startIncomingWorker(app, env)
})

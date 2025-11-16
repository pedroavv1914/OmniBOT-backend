import Fastify from 'fastify'
import cors from '@fastify/cors'
import { z } from 'zod'
import dotenv from 'dotenv'
import flows from './routes/flows'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import bots from './routes/bots'
import conversations from './routes/conversations'
import { EnvSchema } from './lib/env'
import { buildSupabase } from './lib/supabase'
import events from './routes/events'
import { buildIncomingQueue } from './queues/incoming'
import { startIncomingWorker } from './workers/incoming'

dotenv.config()

const env = EnvSchema.parse(process.env)
const app = Fastify({ logger: true })
const queues = { incoming: buildIncomingQueue(env) }
(app as any).config = { env, supabase: buildSupabase(env), queues }

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

const port = env.PORT ? Number(env.PORT) : 3000

app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`server ${port}`)
  startIncomingWorker(app, env)
})
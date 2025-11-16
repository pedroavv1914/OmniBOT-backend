import Fastify from 'fastify'
import cors from '@fastify/cors'
import { z } from 'zod'
import dotenv from 'dotenv'
import flows from './routes/flows'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'

dotenv.config()

const envSchema = z.object({
  PORT: z.string().optional()
})

const env = envSchema.parse(process.env)
const app = Fastify({ logger: true })

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

const port = env.PORT ? Number(env.PORT) : 3000

app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`server ${port}`)
})
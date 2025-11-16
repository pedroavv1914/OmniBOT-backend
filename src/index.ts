import Fastify from 'fastify'
import cors from '@fastify/cors'
import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const envSchema = z.object({
  PORT: z.string().optional()
})

const env = envSchema.parse(process.env)
const app = Fastify({ logger: true })

app.register(cors, { origin: true })

app.get('/health', async () => {
  return { ok: true }
})

const port = env.PORT ? Number(env.PORT) : 3000

app.listen({ port, host: '0.0.0.0' }).then(() => {
  app.log.info(`server ${port}`)
})
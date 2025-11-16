import { FastifyInstance } from 'fastify'
import { FlowSchema, Flow } from '../flow/schema'

const store = new Map<string, Flow>()

export default async function routes(app: FastifyInstance) {
  app.post('/bot_flows', async (req, reply) => {
    const parsed = FlowSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_flow', details: parsed.error.flatten() })
    }
    const id = crypto.randomUUID()
    store.set(id, parsed.data)
    return { id }
  })

  app.get('/bot_flows/:id', async (req, reply) => {
    const id = (req.params as any).id as string
    const flow = store.get(id)
    if (!flow) return reply.code(404).send({ error: 'not_found' })
    return flow
  })
}
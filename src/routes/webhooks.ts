import { FastifyInstance } from 'fastify'
import { z } from 'zod'

const incomingSchema = z.object({ conversation_id: z.string(), text: z.string() })

export default async function routes(app: FastifyInstance) {
  app.post('/webhooks/whatsapp', { schema: { tags: ['webhooks'] } }, async (req, reply) => {
    const parsed = incomingSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_payload' })
    if (!app.config.queues.incoming) return reply.code(503).send({ error: 'queue_unavailable' })
    await app.config.queues.incoming.add('incoming', parsed.data)
    return { ok: true }
  })

  app.post('/webhooks/instagram', { schema: { tags: ['webhooks'] } }, async (req, reply) => {
    const parsed = incomingSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_payload' })
    if (!app.config.queues.incoming) return reply.code(503).send({ error: 'queue_unavailable' })
    await app.config.queues.incoming.add('incoming', parsed.data)
    return { ok: true }
  })
}
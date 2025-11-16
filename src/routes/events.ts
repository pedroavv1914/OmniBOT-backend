import { FastifyInstance } from 'fastify'
import { z } from 'zod'

const incomingSchema = z.object({ conversation_id: z.string(), text: z.string() })

export default async function routes(app: FastifyInstance) {
  app.post('/events/incoming', { schema: { tags: ['events'] } }, async (req, reply) => {
    const parsed = incomingSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_event' })
    await app.config.queues.incoming.add('incoming', parsed.data)
    return { ok: true }
  })
}
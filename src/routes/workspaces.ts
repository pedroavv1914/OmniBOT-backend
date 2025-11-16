import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { setWorkspacePlan } from '../lib/limits'

const planSchema = z.object({ plan: z.enum(['free','pro','enterprise']) })

export default async function routes(app: FastifyInstance) {
  app.post('/workspaces/:id/plan', { schema: { tags: ['workspaces'] } }, async (req, reply) => {
    const id = (req.params as any).id as string
    const parsed = planSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_plan' })
    setWorkspacePlan(id, parsed.data.plan)
    return { ok: true }
  })
}
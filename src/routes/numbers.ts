import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createNumber, listNumbersByOwner, updateNumber, deleteNumber } from '../repo/numbers'

const createSchema = z.object({ owner_id: z.string(), phone_number: z.string(), bot_id: z.string().optional() })
const patchSchema = z.object({ phone_number: z.string().optional(), bot_id: z.string().optional() })

export default async function routes(app: FastifyInstance) {
  app.post('/numbers', { preHandler: (app as any).requireAuth, schema: { tags: ['numbers'], security: [{ bearerAuth: [] }] } }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_number' })
    const n = await createNumber((app as any).config.supabase, parsed.data as any)
    return n
  })

  app.get('/numbers', { preHandler: (app as any).requireAuth, schema: { tags: ['numbers'], security: [{ bearerAuth: [] }] } }, async (req, reply) => {
    const owner_id = (req.query as any).owner_id as string
    if (!owner_id) return reply.code(400).send({ error: 'owner_id_required' })
    const list = await listNumbersByOwner((app as any).config.supabase, owner_id)
    return list
  })

  app.patch('/numbers/:id', { preHandler: (app as any).requireAuth, schema: { tags: ['numbers'], security: [{ bearerAuth: [] }] } }, async (req, reply) => {
    const id = (req.params as any).id as string
    const parsed = patchSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_patch' })
    const upd = await updateNumber((app as any).config.supabase, id, parsed.data as any)
    return upd ?? { ok: true }
  })

  app.delete('/numbers/:id', { preHandler: (app as any).requireAuth, schema: { tags: ['numbers'], security: [{ bearerAuth: [] }] } }, async (req) => {
    const id = (req.params as any).id as string
    await deleteNumber((app as any).config.supabase, id)
    return { ok: true }
  })
}

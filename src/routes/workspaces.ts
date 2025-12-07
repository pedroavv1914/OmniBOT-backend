import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { setWorkspacePlan, getWorkspaceUsage } from '../lib/limits'
import { createWorkspace, listWorkspacesByOwner } from '../repo/workspaces'
const jwt: any = require('jsonwebtoken')

const planSchema = z.object({ plan: z.enum(['free','pro','enterprise']) })

export default async function routes(app: FastifyInstance) {
  app.post('/workspaces', { preHandler: (app as any).requireAuth, schema: { tags: ['workspaces'], security: [{ bearerAuth: [] }], body: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } } }, async (req, reply) => {
    const h = req.headers?.authorization as string | undefined
    const token = h?.startsWith('Bearer ') ? h.slice(7) : undefined
    const secret = (app as any).config.env.JWT_SECRET as string | undefined
    const supabase = (app as any).config.supabase
    if (!token) return reply.code(401).send({ error: 'unauthorized' })
    let ownerId: string | undefined
    if (secret) {
      try { const d = jwt.verify(token, secret); ownerId = (d as any)?.sub as string | undefined } catch {}
    }
    if (!ownerId && supabase) {
      const { data, error } = await supabase.auth.getUser(token)
      if (error || !data?.user?.id) return reply.code(401).send({ error: 'invalid_token' })
      ownerId = data.user.id
    }
    if (!ownerId) return reply.code(401).send({ error: 'invalid_token' })
    const name = (req.body as any).name as string
    const w = await createWorkspace(supabase, { owner_id: ownerId, name })
    return w
  })

  app.get('/workspaces', { preHandler: (app as any).requireAuth, schema: { tags: ['workspaces'], security: [{ bearerAuth: [] }] } }, async (req, reply) => {
    const h = req.headers?.authorization as string | undefined
    const token = h?.startsWith('Bearer ') ? h.slice(7) : undefined
    const secret = (app as any).config.env.JWT_SECRET as string | undefined
    const supabase = (app as any).config.supabase
    if (!token) return reply.code(401).send({ error: 'unauthorized' })
    let ownerId: string | undefined
    if (secret) {
      try { const d = jwt.verify(token, secret); ownerId = (d as any)?.sub as string | undefined } catch {}
    }
    if (!ownerId && supabase) {
      const { data, error } = await supabase.auth.getUser(token)
      if (error || !data?.user?.id) return reply.code(401).send({ error: 'invalid_token' })
      ownerId = data.user.id
    }
    if (!ownerId) return reply.code(401).send({ error: 'invalid_token' })
    const list = await listWorkspacesByOwner(supabase, ownerId)
    return list
  })
  app.post('/workspaces/:id/plan', { schema: { tags: ['workspaces'] } }, async (req, reply) => {
    const id = (req.params as any).id as string
    const parsed = planSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_plan' })
    await setWorkspacePlan((app as any).config.supabase, id, parsed.data.plan)
    return { ok: true }
  })
  app.get('/workspaces/:id/usage', { schema: { tags: ['workspaces'] } }, async (req) => {
    const id = (req.params as any).id as string
    return await getWorkspaceUsage((app as any).config.supabase, id)
  })
}

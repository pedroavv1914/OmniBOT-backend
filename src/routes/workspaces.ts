import { FastifyInstance } from 'fastify'
 
import { createWorkspace, listWorkspacesByOwner, getWorkspaceById, addMember, listMembers, removeMember, updateWorkspaceName, deleteWorkspace } from '../repo/workspaces'
import { getUserByEmail } from '../repo/users'
const jwt: any = require('jsonwebtoken')

 

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
  

  app.get('/workspaces/:id/members', { preHandler: (app as any).requireAuth, schema: { tags: ['workspaces'], security: [{ bearerAuth: [] }] } }, async (req, reply) => {
    const id = (req.params as any).id as string
    const supabase = (app as any).config.supabase
    const list = await listMembers(supabase, id)
    return list
  })

  app.post('/workspaces/:id/members', { preHandler: (app as any).requireAuth, schema: { tags: ['workspaces'], security: [{ bearerAuth: [] }], body: { type: 'object', properties: { email: { type: 'string' }, user_id: { type: 'string' }, role: { type: 'string' } } } } }, async (req, reply) => {
    const id = (req.params as any).id as string
    const { email, user_id, role } = req.body as any
    const supabase = (app as any).config.supabase
    const w = await getWorkspaceById(supabase, id)
    if (!w) return reply.code(404).send({ error: 'workspace_not_found' })
    const h = req.headers?.authorization as string | undefined
    const token = h?.startsWith('Bearer ') ? h.slice(7) : undefined
    const secret = (app as any).config.env.JWT_SECRET as string | undefined
    let requester: string | undefined
    if (secret && token) {
      try { const d = jwt.verify(token, secret); requester = (d as any)?.sub as string | undefined } catch {}
    }
    if (!requester && supabase && token) {
      const { data } = await supabase.auth.getUser(token)
      requester = data?.user?.id
    }
    if (!requester || requester !== w.owner_id) return reply.code(403).send({ error: 'forbidden' })
    let targetId = user_id as string | undefined
    if (!targetId && email) {
      const u = await getUserByEmail(supabase, email)
      targetId = u?.auth_user_id
    }
    if (!targetId) return reply.code(404).send({ error: 'user_not_found' })
    const added = await addMember(supabase, id, targetId, role || 'member')
    return added
  })

  app.delete('/workspaces/:id/members/:user_id', { preHandler: (app as any).requireAuth, schema: { tags: ['workspaces'], security: [{ bearerAuth: [] }] } }, async (req, reply) => {
    const id = (req.params as any).id as string
    const user_id = (req.params as any).user_id as string
    const supabase = (app as any).config.supabase
    const w = await getWorkspaceById(supabase, id)
    if (!w) return reply.code(404).send({ error: 'workspace_not_found' })
    const h = req.headers?.authorization as string | undefined
    const token = h?.startsWith('Bearer ') ? h.slice(7) : undefined
    const secret = (app as any).config.env.JWT_SECRET as string | undefined
    let requester: string | undefined
    if (secret && token) {
      try { const d = jwt.verify(token, secret); requester = (d as any)?.sub as string | undefined } catch {}
    }
    if (!requester && supabase && token) {
      const { data } = await supabase.auth.getUser(token)
      requester = data?.user?.id
    }
    if (!requester || requester !== w.owner_id) return reply.code(403).send({ error: 'forbidden' })
    await removeMember(supabase, id, user_id)
    return { ok: true }
  })

  app.patch('/workspaces/:id', { preHandler: (app as any).requireAuth, schema: { tags: ['workspaces'], security: [{ bearerAuth: [] }], body: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } } }, async (req, reply) => {
    const id = (req.params as any).id as string
    const supabase = (app as any).config.supabase
    const w = await getWorkspaceById(supabase, id)
    if (!w) return reply.code(404).send({ error: 'workspace_not_found' })
    const h = req.headers?.authorization as string | undefined
    const token = h?.startsWith('Bearer ') ? h.slice(7) : undefined
    const secret = (app as any).config.env.JWT_SECRET as string | undefined
    let requester: string | undefined
    if (secret && token) {
      try { const d = jwt.verify(token, secret); requester = (d as any)?.sub as string | undefined } catch {}
    }
    if (!requester && supabase && token) {
      const { data } = await supabase.auth.getUser(token)
      requester = data?.user?.id
    }
    if (!requester || requester !== w.owner_id) return reply.code(403).send({ error: 'forbidden' })
    const name = (req.body as any).name as string
    const upd = await updateWorkspaceName(supabase, id, name)
    return upd ?? { ok: true }
  })

  app.delete('/workspaces/:id', { preHandler: (app as any).requireAuth, schema: { tags: ['workspaces'], security: [{ bearerAuth: [] }] } }, async (req, reply) => {
    const id = (req.params as any).id as string
    const supabase = (app as any).config.supabase
    const w = await getWorkspaceById(supabase, id)
    if (!w) return reply.code(404).send({ error: 'workspace_not_found' })
    const h = req.headers?.authorization as string | undefined
    const token = h?.startsWith('Bearer ') ? h.slice(7) : undefined
    const secret = (app as any).config.env.JWT_SECRET as string | undefined
    let requester: string | undefined
    if (secret && token) {
      try { const d = jwt.verify(token, secret); requester = (d as any)?.sub as string | undefined } catch {}
    }
    if (!requester && supabase && token) {
      const { data } = await supabase.auth.getUser(token)
      requester = data?.user?.id
    }
    if (!requester || requester !== w.owner_id) return reply.code(403).send({ error: 'forbidden' })
    await deleteWorkspace(supabase, id)
    return { ok: true }
  })
}

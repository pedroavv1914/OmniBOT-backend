import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createBot, getBot, listBots, updateBot, deleteBot } from '../repo/bots'

const createSchema = z.object({
  workspace_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  is_active: z.boolean().optional()
})

export default async function routes(app: FastifyInstance) {
  app.post('/bots', {
    preHandler: (app as any).requireAuth,
    schema: {
      tags: ['bots'],
      security: [{ bearerAuth: [] }],
      body: { type: 'object', properties: { workspace_id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, is_active: { type: 'boolean' } }, required: ['workspace_id','name'] },
      response: { 200: { type: 'object', properties: { id: { type: 'string' }, workspace_id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, is_active: { type: 'boolean' } } } }
    }
  }, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_bot' })
    const bot = await createBot((app as any).config.supabase, parsed.data as any)
    return { id: (bot as any).id, workspace_id: (bot as any).workspace_id, name: (bot as any).name, description: (bot as any).description, is_active: (bot as any).is_active }
  })

  app.get('/bots/:id', {
    preHandler: (app as any).requireAuth,
    schema: { tags: ['bots'], security: [{ bearerAuth: [] }], params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }, response: { 200: { type: 'object', properties: { id: { type: 'string' }, workspace_id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, is_active: { type: 'boolean' } } }, 404: { type: 'object' } } }
  }, async (req, reply) => {
    const id = (req.params as any).id as string
    const bot = await getBot((app as any).config.supabase, id)
    if (!bot) return reply.code(404).send({ error: 'not_found' })
    return bot
  })

  app.get('/bots', {
    preHandler: (app as any).requireAuth,
    schema: { tags: ['bots'], security: [{ bearerAuth: [] }], querystring: { type: 'object', properties: { workspace_id: { type: 'string' } }, required: ['workspace_id'] }, response: { 200: { type: 'array', items: { type: 'object', properties: { id: { type: 'string' }, workspace_id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, is_active: { type: 'boolean' } } } } } }
  }, async (req, reply) => {
    const ws = (req.query as any).workspace_id as string
    const bots = await listBots((app as any).config.supabase, ws)
    return bots
  })

  app.patch('/bots/:id', {
    preHandler: (app as any).requireAuth,
    schema: { tags: ['bots'], security: [{ bearerAuth: [] }], params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }, body: { type: 'object' }, response: { 200: { type: 'object', properties: { id: { type: 'string' }, workspace_id: { type: 'string' }, name: { type: 'string' }, description: { type: 'string' }, is_active: { type: 'boolean' } } } } }
  }, async (req) => {
    const id = (req.params as any).id as string
    const patch = req.body as any
    const bot = await updateBot((app as any).config.supabase, id, patch)
    return bot
  })

  app.delete('/bots/:id', {
    preHandler: (app as any).requireAuth,
    schema: { tags: ['bots'], security: [{ bearerAuth: [] }], params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }, response: { 200: { type: 'object', properties: { ok: { type: 'boolean' } } } } }
  }, async (req) => {
    const id = (req.params as any).id as string
    const ok = await deleteBot((app as any).config.supabase, id)
    return { ok }
  })
}
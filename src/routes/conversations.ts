import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createConversation, getConversation, listConversations, updateConversation } from '../repo/conversations'
import { createMessage, listMessages } from '../repo/messages'
import { getBot } from '../repo/bots'
import { canSendMessage, recordSentMessage } from '../lib/limits'
import { publish, subscribe } from '../lib/pubsub'

const convCreate = z.object({ bot_id: z.string(), channel: z.string(), contact_identifier: z.string(), status: z.string().optional() })
const msgCreate = z.object({ sender_type: z.enum(['user','bot','agent']), direction: z.enum(['incoming','outgoing']), channel: z.string(), content: z.string(), payload: z.any().optional() })

export default async function routes(app: FastifyInstance) {
  app.post('/conversations', { preHandler: (app as any).requireAuth, schema: { tags: ['conversations'] } }, async (req, reply) => {
    ;(req.routeOptions as any).schema.security = [{ bearerAuth: [] }]
    const parsed = convCreate.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_conversation' })
    const c = await createConversation((app as any).config.supabase, parsed.data as any)
    return c
  })

  app.get('/conversations/:id', { preHandler: (app as any).requireAuth, schema: { tags: ['conversations'], security: [{ bearerAuth: [] }] } }, async (req, reply) => {
    const id = (req.params as any).id as string
    const c = await getConversation((app as any).config.supabase, id)
    if (!c) return reply.code(404).send({ error: 'not_found' })
    return c
  })

  app.get('/conversations', { preHandler: (app as any).requireAuth, schema: { tags: ['conversations'], security: [{ bearerAuth: [] }] } }, async (req) => {
    const bot_id = (req.query as any).bot_id as string | undefined
    const list = await listConversations((app as any).config.supabase, bot_id)
    return list
  })

  app.patch('/conversations/:id', { preHandler: (app as any).requireAuth, schema: { tags: ['conversations'], security: [{ bearerAuth: [] }] } }, async (req) => {
    const id = (req.params as any).id as string
    const patch = req.body as any
    const c = await updateConversation((app as any).config.supabase, id, patch)
    return c
  })

  app.post('/conversations/:id/messages', { preHandler: (app as any).requireAuth, schema: { tags: ['messages'], security: [{ bearerAuth: [] }] } }, async (req, reply) => {
    const id = (req.params as any).id as string
    const parsed = msgCreate.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_message' })
    const conv = await getConversation((app as any).config.supabase, id)
    if (!conv) return reply.code(404).send({ error: 'conversation_not_found' })
    const bot = await getBot((app as any).config.supabase, conv.bot_id)
    const ws = bot?.workspace_id as string | undefined
    if (parsed.data.direction === 'outgoing' && ws) {
      if (!(await canSendMessage((app as any).config.supabase, ws))) return reply.code(429).send({ error: 'plan_limit_exceeded' })
      await recordSentMessage((app as any).config.supabase, ws)
    }
    const m = await createMessage((app as any).config.supabase, { ...parsed.data, conversation_id: id, channel: conv.channel } as any)
    publish(`conv:${id}`, m)
    return m
  })

  app.get('/conversations/:id/stream', { schema: { tags: ['conversations'] } }, async (req, reply) => {
    const id = (req.params as any).id as string
    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.flushHeaders()
    const off = subscribe(`conv:${id}`, data => {
      reply.raw.write(`data: ${JSON.stringify(data)}\n\n`)
    })
    req.raw.on('close', () => {
      off()
    })
  })

  app.get('/conversations/:id/messages', { schema: { tags: ['messages'] } }, async (req) => {
    const id = (req.params as any).id as string
    const list = await listMessages((app as any).config.supabase, id)
    return list
  })
}

import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createConversation, getConversation, listConversations, updateConversation } from '../repo/conversations'
import { createMessage, listMessages } from '../repo/messages'

const convCreate = z.object({ bot_id: z.string(), channel: z.string(), contact_identifier: z.string(), status: z.string().optional() })
const msgCreate = z.object({ sender_type: z.enum(['user','bot','agent']), direction: z.enum(['incoming','outgoing']), channel: z.string(), content: z.string(), payload: z.any().optional() })

export default async function routes(app: FastifyInstance) {
  app.post('/conversations', { schema: { tags: ['conversations'] } }, async (req, reply) => {
    const parsed = convCreate.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_conversation' })
    const c = await createConversation((app as any).config.supabase, parsed.data as any)
    return c
  })

  app.get('/conversations/:id', { schema: { tags: ['conversations'] } }, async (req, reply) => {
    const id = (req.params as any).id as string
    const c = await getConversation((app as any).config.supabase, id)
    if (!c) return reply.code(404).send({ error: 'not_found' })
    return c
  })

  app.get('/conversations', { schema: { tags: ['conversations'] } }, async (req) => {
    const bot_id = (req.query as any).bot_id as string | undefined
    const list = await listConversations((app as any).config.supabase, bot_id)
    return list
  })

  app.patch('/conversations/:id', { schema: { tags: ['conversations'] } }, async (req) => {
    const id = (req.params as any).id as string
    const patch = req.body as any
    const c = await updateConversation((app as any).config.supabase, id, patch)
    return c
  })

  app.post('/conversations/:id/messages', { schema: { tags: ['messages'] } }, async (req, reply) => {
    const id = (req.params as any).id as string
    const parsed = msgCreate.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_message' })
    const m = await createMessage((app as any).config.supabase, { ...parsed.data, conversation_id: id } as any)
    return m
  })

  app.get('/conversations/:id/messages', { schema: { tags: ['messages'] } }, async (req) => {
    const id = (req.params as any).id as string
    const list = await listMessages((app as any).config.supabase, id)
    return list
  })
}
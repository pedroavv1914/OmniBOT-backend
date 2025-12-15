import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createConversation, findConversationByBotContact, getConversation } from '../repo/conversations'
import { getBot } from '../repo/bots'
import { getLatestFlowByBotRepo } from '../repo/flows'
import { getState, setState } from '../repo/state'
 
import { createMessage } from '../repo/messages'
import { publish } from '../lib/pubsub'

const incomingSchema = z.union([
  z.object({ conversation_id: z.string(), text: z.string() }),
  z.object({ bot_id: z.string(), channel: z.string(), contact_identifier: z.string(), text: z.string() })
])

export default async function routes(app: FastifyInstance) {
  app.post('/webhooks/whatsapp', { schema: { tags: ['webhooks'] } }, async (req, reply) => {
    const parsed = incomingSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_payload' })
    if (!(app as any).config.queues.incoming) {
      const d: any = parsed.data
      let conv = d.conversation_id ? await getConversation((app as any).config.supabase, d.conversation_id) : null
      if (!conv && d.bot_id && d.contact_identifier) {
        conv = await findConversationByBotContact((app as any).config.supabase, d.bot_id, d.contact_identifier)
        if (!conv) conv = await createConversation((app as any).config.supabase, { bot_id: d.bot_id, channel: d.channel, contact_identifier: d.contact_identifier })
      }
      if (!conv) return reply.code(404).send({ error: 'conversation_not_found' })
      const bot = await getBot((app as any).config.supabase, conv.bot_id)
      const flow = bot?.id ? await getLatestFlowByBotRepo((app as any).config.supabase, bot.id) : undefined
      const curState = await getState((app as any).config.supabase, conv.id!)
      const out = await (require('../engine/runner').runFlow)(flow, { text: d.text }, { env: (app as any).config.env, supabase: (app as any).config.supabase, bot_id: bot?.id }, { variables: curState?.variables, awaiting_var: curState?.awaiting_var, awaiting_node_id: curState?.awaiting_node_id })
      await createMessage((app as any).config.supabase, { conversation_id: conv.id!, sender_type: 'bot', direction: 'outgoing', channel: conv.channel, content: out.content })
      if (out.state) await setState((app as any).config.supabase, { conversation_id: conv.id!, bot_id: bot?.id, variables: out.state?.variables ?? {}, awaiting_var: out.state?.awaiting_var, awaiting_node_id: out.state?.awaiting_node_id })
      publish(`conv:${conv.id}`, { conversation_id: conv.id, sender_type: 'bot', direction: 'outgoing', channel: conv.channel, content: out.content })
      return { ok: true }
    }
    await (app as any).config.queues.incoming.add('incoming', parsed.data)
    return { ok: true }
  })

  app.post('/webhooks/instagram', { schema: { tags: ['webhooks'] } }, async (req, reply) => {
    const parsed = incomingSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_payload' })
    if (!(app as any).config.queues.incoming) {
      const d: any = parsed.data
      let conv = d.conversation_id ? await getConversation((app as any).config.supabase, d.conversation_id) : null
      if (!conv && d.bot_id && d.contact_identifier) {
        conv = await findConversationByBotContact((app as any).config.supabase, d.bot_id, d.contact_identifier)
        if (!conv) conv = await createConversation((app as any).config.supabase, { bot_id: d.bot_id, channel: d.channel, contact_identifier: d.contact_identifier })
      }
      if (!conv) return reply.code(404).send({ error: 'conversation_not_found' })
      const bot = await getBot((app as any).config.supabase, conv.bot_id)
      const flow = bot?.id ? await getLatestFlowByBotRepo((app as any).config.supabase, bot.id) : undefined
      const curState = await getState((app as any).config.supabase, conv.id!)
      const out = await (require('../engine/runner').runFlow)(flow, { text: d.text }, { env: (app as any).config.env, supabase: (app as any).config.supabase, bot_id: bot?.id }, { variables: curState?.variables, awaiting_var: curState?.awaiting_var, awaiting_node_id: curState?.awaiting_node_id })
      await createMessage((app as any).config.supabase, { conversation_id: conv.id!, sender_type: 'bot', direction: 'outgoing', channel: conv.channel, content: out.content })
      if (out.state) await setState((app as any).config.supabase, { conversation_id: conv.id!, bot_id: bot?.id, variables: out.state?.variables ?? {}, awaiting_var: out.state?.awaiting_var, awaiting_node_id: out.state?.awaiting_node_id })
      publish(`conv:${conv.id}`, { conversation_id: conv.id, sender_type: 'bot', direction: 'outgoing', channel: conv.channel, content: out.content })
      return { ok: true }
    }
    await (app as any).config.queues.incoming.add('incoming', parsed.data)
    return { ok: true }
  })
}

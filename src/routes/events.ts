import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { getConversation } from '../repo/conversations'
import { getBot } from '../repo/bots'
import { getLatestFlowByBotRepo } from '../repo/flows'
import { getState, setState } from '../repo/state'
import { canSendMessage, recordSentMessage } from '../lib/limits'
import { createMessage } from '../repo/messages'
import { publish } from '../lib/pubsub'
import { runFlow } from '../engine/runner'

const incomingSchema = z.object({ conversation_id: z.string(), text: z.string() })

export default async function routes(app: FastifyInstance) {
  app.post('/events/incoming', { schema: { tags: ['events'] } }, async (req, reply) => {
    const parsed = incomingSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_event' })
    if (!(app as any).config.queues.incoming) {
      const { conversation_id, text } = parsed.data
      const conv = await getConversation((app as any).config.supabase, conversation_id)
      if (!conv) return reply.code(404).send({ error: 'conversation_not_found' })
      const bot = await getBot((app as any).config.supabase, conv.bot_id)
      const flow = bot?.id ? await getLatestFlowByBotRepo((app as any).config.supabase, bot.id) : undefined
      const curState = await getState((app as any).config.supabase, conversation_id)
      const out = await runFlow(flow, { text }, { env: (app as any).config.env, supabase: (app as any).config.supabase, bot_id: bot?.id }, { variables: curState?.variables, awaiting_var: curState?.awaiting_var, awaiting_node_id: curState?.awaiting_node_id })
      const ws = bot?.workspace_id as string | undefined
      if (ws && !canSendMessage(ws)) return reply.code(429).send({ error: 'plan_limit_exceeded' })
      await createMessage((app as any).config.supabase, { conversation_id, sender_type: 'bot', direction: 'outgoing', channel: conv.channel, content: out.content })
      if (out.state) await setState((app as any).config.supabase, { conversation_id, bot_id: bot?.id, variables: out.state?.variables ?? {}, awaiting_var: out.state?.awaiting_var, awaiting_node_id: out.state?.awaiting_node_id })
      if (ws) recordSentMessage(ws)
      publish(`conv:${conversation_id}`, { conversation_id, sender_type: 'bot', direction: 'outgoing', channel: conv.channel, content: out.content })
      return { ok: true }
    }
    await (app as any).config.queues.incoming.add('incoming', parsed.data)
    return { ok: true }
  })
}
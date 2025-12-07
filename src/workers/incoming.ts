import { Worker } from 'bullmq'
import { Env } from '../lib/env'
import { RedisOptions } from 'ioredis'
import { getConversation } from '../repo/conversations'
import { getBot } from '../repo/bots'
import { getLatestFlowByBotRepo } from '../repo/flows'
import { runFlow, type FlowRunState } from '../engine/runner'
import { createMessage } from '../repo/messages'
import { canSendMessage, recordSentMessage } from '../lib/limits'
import { publish } from '../lib/pubsub'
import { getState, setState } from '../repo/state'

export function startIncomingWorker(app: any, env: Env) {
  const opts: RedisOptions | undefined = env.REDIS_URL ? { host: env.REDIS_URL } as any : undefined
  if (!opts) return null as any
  const worker = new Worker('incoming', async job => {
    const d: any = job.data
    let conv = d.conversation_id ? await getConversation(app.config.supabase, d.conversation_id) : null
    if (!conv && d.bot_id && d.contact_identifier) {
      const { findConversationByBotContact, createConversation } = require('../repo/conversations')
      conv = await findConversationByBotContact(app.config.supabase, d.bot_id, d.contact_identifier)
      if (!conv) conv = await createConversation(app.config.supabase, { bot_id: d.bot_id, channel: d.channel, contact_identifier: d.contact_identifier })
    }
    if (!conv) return
    const bot = await getBot(app.config.supabase, conv.bot_id)
    const flow = bot?.id ? await getLatestFlowByBotRepo(app.config.supabase, bot.id) : undefined
    const curState = await getState(app.config.supabase, conv.id!)
    const state: FlowRunState = { variables: curState?.variables, awaiting_var: curState?.awaiting_var, awaiting_node_id: curState?.awaiting_node_id }
    const out = await runFlow(flow, { text: d.text }, { env: app.config.env, supabase: app.config.supabase, bot_id: bot?.id }, state)
    const ws = bot?.workspace_id as string | undefined
    if (ws && !(await canSendMessage(app.config.supabase, ws))) return
    await createMessage(app.config.supabase, { conversation_id: conv.id!, sender_type: 'bot', direction: 'outgoing', channel: conv.channel, content: out.content })
    if (out.state) await setState(app.config.supabase, { conversation_id: conv.id!, bot_id: bot?.id, variables: out.state?.variables ?? {}, awaiting_var: out.state?.awaiting_var, awaiting_node_id: out.state?.awaiting_node_id })
    if (ws) await recordSentMessage(app.config.supabase, ws)
    publish(`conv:${conv.id}`, { conversation_id: conv.id, sender_type: 'bot', direction: 'outgoing', channel: conv.channel, content: out.content })
  }, { connection: opts as any })
  return worker
}

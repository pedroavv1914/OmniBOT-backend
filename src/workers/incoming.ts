import { Worker } from 'bullmq'
import { Env } from '../lib/env'
import { RedisOptions } from 'ioredis'
import { getConversation } from '../repo/conversations'
import { getBot } from '../repo/bots'
import { getLatestFlowByBotRepo } from '../repo/flows'
import { runFlow } from '../engine/runner'
import { createMessage } from '../repo/messages'
import { canSendMessage, recordSentMessage } from '../lib/limits'

export function startIncomingWorker(app: any, env: Env) {
  const opts: RedisOptions | undefined = env.REDIS_URL ? { host: env.REDIS_URL } as any : undefined
  const worker = new Worker('incoming', async job => {
    const { conversation_id, text } = job.data as { conversation_id: string, text: string }
    const conv = await getConversation(app.config.supabase, conversation_id)
    if (!conv) return
    const bot = await getBot(app.config.supabase, conv.bot_id)
    const flow = bot?.id ? await getLatestFlowByBotRepo(app.config.supabase, bot.id) : undefined
    const out = await runFlow(flow, { text })
    const ws = bot?.workspace_id as string | undefined
    if (ws && !canSendMessage(ws)) return
    await createMessage(app.config.supabase, { conversation_id, sender_type: 'bot', direction: 'outgoing', channel: conv.channel, content: out.content })
    if (ws) recordSentMessage(ws)
  }, { connection: opts as any })
  return worker
}
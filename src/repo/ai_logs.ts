import type { SupabaseClient } from '@supabase/supabase-js'

type AiLog = { id?: string, bot_id: string, message_input: string, ai_response: string, tokens: number }

const mem: AiLog[] = []

export async function saveAiLog(client: SupabaseClient | undefined, log: AiLog) {
  if (client) {
    await client.from('ai_logs').insert(log)
    return true
  }
  mem.push(log)
  return true
}
import type { SupabaseClient } from '@supabase/supabase-js'
import { Flow } from '../flow/schema'

const memory = new Map<string, Flow>()
const memoryByBot = new Map<string, Flow>()

export async function saveFlowRepo(client: SupabaseClient | undefined, flow: Flow) {
  if (client) {
    const { data, error } = await client
      .from('bot_flows')
      .insert({ bot_id: flow.bot_id ?? null, flow_json: flow })
      .select('id')
      .single()
    if (!error && data?.id) return data.id as string
  }
  const id = crypto.randomUUID()
  memory.set(id, flow)
  if (flow.bot_id) memoryByBot.set(flow.bot_id, flow)
  return id
}

export async function getFlowRepo(client: SupabaseClient | undefined, id: string) {
  if (client) {
    const { data } = await client
      .from('bot_flows')
      .select('flow_json')
      .eq('id', id)
      .single()
    if (data?.flow_json) return data.flow_json as Flow
  }
  return memory.get(id)
}

export async function getLatestFlowByBotRepo(client: SupabaseClient | undefined, bot_id: string) {
  if (client) {
    const { data } = await client
      .from('bot_flows')
      .select('flow_json, created_at')
      .eq('bot_id', bot_id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data?.flow_json) return data.flow_json as Flow
  }
  return memoryByBot.get(bot_id)
}
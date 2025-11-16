import type { SupabaseClient } from '@supabase/supabase-js'
import { Flow } from '../flow/schema'

const memory = new Map<string, Flow>()

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
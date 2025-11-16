import type { SupabaseClient } from '@supabase/supabase-js'
import { Flow } from '../flow/schema'

type StoredFlow = { id: string, flow: Flow, created_at: string, status: 'draft' | 'published' }
const memory = new Map<string, StoredFlow>()
const memoryByBot = new Map<string, StoredFlow[]>()

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
  const stored: StoredFlow = { id, flow, created_at: new Date().toISOString(), status: 'draft' }
  memory.set(id, stored)
  if (flow.bot_id) {
    const list = memoryByBot.get(flow.bot_id) ?? []
    list.unshift(stored)
    memoryByBot.set(flow.bot_id, list)
  }
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
  const s = memory.get(id)
  return s?.flow
}

export async function getLatestFlowByBotRepo(client: SupabaseClient | undefined, bot_id: string) {
  if (client) {
    const { data } = await client
      .from('bot_flows')
      .select('id, flow_json, created_at, status')
      .eq('bot_id', bot_id)
      .order('status', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data?.flow_json) return data.flow_json as Flow
  }
  const list = memoryByBot.get(bot_id) ?? []
  const pub = list.find(f => f.status === 'published')
  return (pub ?? list[0])?.flow
}

export async function publishFlowRepo(client: SupabaseClient | undefined, bot_id: string, id: string) {
  if (client) {
    await client.from('bot_flows').update({ status: 'published' }).eq('id', id).eq('bot_id', bot_id)
    await client.from('bot_flows').update({ status: 'draft' }).eq('bot_id', bot_id).neq('id', id)
    return true
  }
  const list = memoryByBot.get(bot_id) ?? []
  for (const s of list) s.status = s.id === id ? 'published' : 'draft'
  return true
}

export async function listFlowsByBotRepo(client: SupabaseClient | undefined, bot_id: string) {
  if (client) {
    const { data } = await client.from('bot_flows').select('id, created_at, status').eq('bot_id', bot_id).order('created_at', { ascending: false })
    return data ?? []
  }
  const list = memoryByBot.get(bot_id) ?? []
  return list.map(s => ({ id: s.id, created_at: s.created_at, status: s.status }))
}
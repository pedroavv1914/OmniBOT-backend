import type { SupabaseClient } from '@supabase/supabase-js'

export type Conversation = {
  id?: string
  bot_id: string
  channel: string
  contact_identifier: string
  status?: string
  created_at?: string
  updated_at?: string
}

const convMem = new Map<string, Conversation>()

export async function createConversation(client: SupabaseClient | undefined, c: Conversation) {
  const base = { ...c, status: c.status ?? 'open' }
  if (client) {
    const { data, error } = await client.from('conversations').insert(base).select('*').single()
    if (!error && data) return data as Conversation
  }
  const id = crypto.randomUUID()
  const created = { ...base, id }
  convMem.set(id, created)
  return created
}

export async function getConversation(client: SupabaseClient | undefined, id: string) {
  if (client) {
    const { data } = await client.from('conversations').select('*').eq('id', id).single()
    if (data) return data as Conversation
  }
  return convMem.get(id)
}

export async function listConversations(client: SupabaseClient | undefined, bot_id?: string) {
  if (client) {
    const query = client.from('conversations').select('*')
    const { data } = bot_id ? await query.eq('bot_id', bot_id) : await query
    return (data ?? []) as Conversation[]
  }
  const items = Array.from(convMem.values())
  return bot_id ? items.filter(i => i.bot_id === bot_id) : items
}

export async function updateConversation(client: SupabaseClient | undefined, id: string, patch: Partial<Conversation>) {
  if (client) {
    const { data } = await client.from('conversations').update(patch).eq('id', id).select('*').single()
    if (data) return data as Conversation
  }
  const cur = convMem.get(id)
  if (!cur) return undefined
  const upd = { ...cur, ...patch }
  convMem.set(id, upd)
  return upd
}
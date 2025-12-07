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

export async function listConversations(client: SupabaseClient | undefined, opts?: { bot_id?: string, workspace_id?: string, limit?: number, offset?: number, status?: string }) {
  const bot_id = opts?.bot_id
  const workspace_id = opts?.workspace_id
  const limit = opts?.limit ?? 20
  const offset = opts?.offset ?? 0
  const status = opts?.status
  if (client) {
    if (workspace_id && !bot_id) {
      const { data: bots } = await client.from('bots').select('id').eq('workspace_id', workspace_id)
      const botIds = (bots ?? []).map((b: any) => b.id)
      let q = client.from('conversations').select('*').in('bot_id', botIds).order('created_at', { ascending: false })
      if (status) q = q.eq('status', status)
      const { data } = await q.range(offset, offset + limit - 1)
      return (data ?? []) as Conversation[]
    }
    let q = client.from('conversations').select('*').order('created_at', { ascending: false })
    if (bot_id) q = q.eq('bot_id', bot_id)
    if (status) q = q.eq('status', status)
    const { data } = await q.range(offset, offset + limit - 1)
    return (data ?? []) as Conversation[]
  }
  let items = Array.from(convMem.values())
  if (bot_id) items = items.filter(i => i.bot_id === bot_id)
  if (status) items = items.filter(i => i.status === status)
  items = items.sort((a,b) => (b.created_at||'').localeCompare(a.created_at||''))
  return items.slice(offset, offset + limit)
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

export async function findConversationByBotContact(client: SupabaseClient | undefined, bot_id: string, contact_identifier: string) {
  if (client) {
    const { data } = await client.from('conversations').select('*').eq('bot_id', bot_id).eq('contact_identifier', contact_identifier).maybeSingle()
    return (data ?? null) as Conversation | null
  }
  for (const v of convMem.values()) if (v.bot_id === bot_id && v.contact_identifier === contact_identifier) return v
  return null
}

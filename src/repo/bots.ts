import type { SupabaseClient } from '@supabase/supabase-js'

type Bot = {
  id?: string
  owner_id: string
  name: string
  description?: string
  is_active?: boolean
  phone_number?: string
}

const botsMem = new Map<string, Bot>()

export async function createBot(client: SupabaseClient | undefined, bot: Bot) {
  if (client) {
    const { data, error } = await client.from('bots').insert(bot).select('*').single()
    if (!error && data) return data
  }
  const id = crypto.randomUUID()
  const created = { ...bot, id }
  botsMem.set(id, created)
  return created
}

export async function getBot(client: SupabaseClient | undefined, id: string) {
  if (client) {
    const { data } = await client.from('bots').select('*').eq('id', id).single()
    if (data) return data
  }
  return botsMem.get(id)
}

export async function listBots(client: SupabaseClient | undefined, owner_id: string) {
  if (client) {
    const { data } = await client.from('bots').select('*').eq('owner_id', owner_id)
    return data ?? []
  }
  return Array.from(botsMem.values()).filter(b => b.owner_id === owner_id)
}

export async function updateBot(client: SupabaseClient | undefined, id: string, patch: Partial<Bot>) {
  if (client) {
    const { data } = await client.from('bots').update(patch).eq('id', id).select('*').single()
    if (data) return data
  }
  const cur = botsMem.get(id)
  if (!cur) return undefined
  const upd = { ...cur, ...patch }
  botsMem.set(id, upd)
  return upd
}

export async function deleteBot(client: SupabaseClient | undefined, id: string) {
  if (client) {
    await client.from('bots').delete().eq('id', id)
    return true
  }
  return botsMem.delete(id)
}

import type { SupabaseClient } from '@supabase/supabase-js'

export type PhoneNumber = {
  id?: string
  owner_id: string
  phone_number: string
  bot_id?: string
  created_at?: string
}

const mem = new Map<string, PhoneNumber>()
const byPhone = new Map<string, string>()

export async function createNumber(client: SupabaseClient | undefined, n: PhoneNumber) {
  if (client) {
    const { data, error } = await client.from('numbers').insert(n).select('*').single()
    if (!error && data) return data as PhoneNumber
  }
  const id = crypto.randomUUID()
  const created = { ...n, id }
  mem.set(id, created)
  byPhone.set(n.phone_number, id)
  return created
}

export async function listNumbersByOwner(client: SupabaseClient | undefined, owner_id: string) {
  if (client) {
    const { data } = await client.from('numbers').select('*').eq('owner_id', owner_id)
    return (data ?? []) as PhoneNumber[]
  }
  return Array.from(mem.values()).filter(n => n.owner_id === owner_id)
}

export async function getNumberByPhone(client: SupabaseClient | undefined, phone: string) {
  if (client) {
    const { data } = await client.from('numbers').select('*').eq('phone_number', phone).maybeSingle()
    return (data ?? null) as PhoneNumber | null
  }
  const id = byPhone.get(phone)
  return id ? (mem.get(id) ?? null) : null
}

export async function updateNumber(client: SupabaseClient | undefined, id: string, patch: Partial<PhoneNumber>) {
  if (client) {
    const { data } = await client.from('numbers').update(patch as any).eq('id', id).select('*').single()
    return (data ?? null) as PhoneNumber | null
  }
  const cur = mem.get(id)
  if (!cur) return null
  const upd = { ...cur, ...patch }
  mem.set(id, upd)
  if (patch.phone_number) byPhone.set(patch.phone_number, id)
  return upd
}

export async function deleteNumber(client: SupabaseClient | undefined, id: string) {
  if (client) {
    await client.from('numbers').delete().eq('id', id)
    return true
  }
  const cur = mem.get(id)
  if (cur) byPhone.delete(cur.phone_number)
  return mem.delete(id)
}

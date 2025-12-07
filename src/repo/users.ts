import type { SupabaseClient } from '@supabase/supabase-js'

export type AppUser = {
  id?: string
  auth_user_id?: string
  email?: string
  username?: string
  created_at?: string
  updated_at?: string
}

const mem = new Map<string, AppUser>()

export async function createUser(client: SupabaseClient | undefined, u: AppUser) {
  if (client) {
    const { data, error } = await client.from('users').upsert(u as any, { onConflict: 'auth_user_id' }).select('*').maybeSingle()
    if (!error && data) return data as AppUser
  }
  const id = crypto.randomUUID()
  const created = { ...u, id }
  mem.set(id, created)
  return created
}

export async function getUserByAuthId(client: SupabaseClient | undefined, auth_user_id: string) {
  if (client) {
    const { data } = await client.from('users').select('*').eq('auth_user_id', auth_user_id).maybeSingle()
    if (data) return data as AppUser | null
    return null
  }
  for (const v of mem.values()) if (v.auth_user_id === auth_user_id) return v
  return null
}

export async function getUserByEmail(client: SupabaseClient | undefined, email: string) {
  if (client) {
    const { data } = await client.from('users').select('*').eq('email', email).maybeSingle()
    return (data ?? null) as AppUser | null
  }
  for (const v of mem.values()) if (v.email === email) return v
  return null
}

export async function updateUserByAuthId(client: SupabaseClient | undefined, auth_user_id: string, patch: Partial<AppUser>) {
  if (client) {
    const { data } = await client.from('users').update(patch as any).eq('auth_user_id', auth_user_id).select('*').maybeSingle()
    return (data ?? null) as AppUser | null
  }
  for (const [id, v] of mem) {
    if (v.auth_user_id === auth_user_id) {
      const upd = { ...v, ...patch }
      mem.set(id, upd)
      return upd
    }
  }
  return null
}

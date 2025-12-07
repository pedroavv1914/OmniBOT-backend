import type { SupabaseClient } from '@supabase/supabase-js'

export type Workspace = { id?: string, owner_id: string, name: string }

const mem = new Map<string, Workspace>()

export async function createWorkspace(client: SupabaseClient | undefined, w: Omit<Workspace,'id'>) {
  if (client) {
    const { data, error } = await client.from('workspaces').insert(w).select('*').single()
    if (!error && data) return data as Workspace
  }
  const id = crypto.randomUUID()
  const created = { ...w, id }
  mem.set(id, created)
  return created
}

export async function listWorkspacesByOwner(client: SupabaseClient | undefined, owner_id: string) {
  if (client) {
    const { data } = await client.from('workspaces').select('*').eq('owner_id', owner_id)
    return (data ?? []) as Workspace[]
  }
  return Array.from(mem.values()).filter(w => w.owner_id === owner_id)
}

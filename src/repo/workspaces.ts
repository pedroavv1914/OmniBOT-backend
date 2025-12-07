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

export async function getWorkspaceById(client: SupabaseClient | undefined, id: string) {
  if (client) {
    const { data } = await client.from('workspaces').select('*').eq('id', id).maybeSingle()
    return (data ?? null) as Workspace | null
  }
  return mem.get(id) ?? null
}

export async function addMember(client: SupabaseClient | undefined, workspace_id: string, user_id: string, role: string) {
  if (client) {
    const { data, error } = await client.from('workspace_members').upsert({ workspace_id, user_id, role }).select('*').single()
    if (!error) return data
  }
  return { workspace_id, user_id, role }
}

export async function listMembers(client: SupabaseClient | undefined, workspace_id: string) {
  if (client) {
    const { data } = await client.from('workspace_members').select('*').eq('workspace_id', workspace_id)
    return (data ?? [])
  }
  return []
}

export async function removeMember(client: SupabaseClient | undefined, workspace_id: string, user_id: string) {
  if (client) {
    await client.from('workspace_members').delete().eq('workspace_id', workspace_id).eq('user_id', user_id)
    return { ok: true }
  }
  return { ok: true }
}

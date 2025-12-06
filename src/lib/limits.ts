import type { SupabaseClient } from '@supabase/supabase-js'
type Plan = 'free' | 'pro' | 'enterprise'

const limits: Record<Plan, { max_messages_month: number }> = {
  free: { max_messages_month: 1000 },
  pro: { max_messages_month: 50000 },
  enterprise: { max_messages_month: 1000000 }
}

const usage = new Map<string, { plan: Plan, count: number, period: string }>()

export async function setWorkspacePlan(client: SupabaseClient | undefined, workspace_id: string, plan: Plan) {
  const period = new Date().toISOString().slice(0,7)
  if (client) {
    const { data } = await client.from('workspace_usage').select('*').eq('workspace_id', workspace_id).eq('period', period).maybeSingle()
    const count = (data?.count ?? 0) as number
    await client.from('workspace_usage').upsert({ workspace_id, period, plan, count })
    return
  }
  const cur = usage.get(workspace_id)
  if (!cur || cur.period !== period) usage.set(workspace_id, { plan, count: 0, period })
  else usage.set(workspace_id, { ...cur, plan })
}

export async function canSendMessage(client: SupabaseClient | undefined, workspace_id: string) {
  const period = new Date().toISOString().slice(0,7)
  if (client) {
    const { data } = await client.from('workspace_usage').select('*').eq('workspace_id', workspace_id).eq('period', period).maybeSingle()
    const plan = ((data?.plan as Plan) ?? 'free') as Plan
    const count = (data?.count ?? 0) as number
    const limit = limits[plan].max_messages_month
    return count < limit
  }
  const cur = usage.get(workspace_id) ?? { plan: 'free' as Plan, count: 0, period }
  if (cur.period !== period) cur.count = 0, cur.period = period
  const limit = limits[cur.plan].max_messages_month
  return cur.count < limit
}

export async function recordSentMessage(client: SupabaseClient | undefined, workspace_id: string) {
  const period = new Date().toISOString().slice(0,7)
  if (client) {
    const { data } = await client.from('workspace_usage').select('*').eq('workspace_id', workspace_id).eq('period', period).maybeSingle()
    const plan = ((data?.plan as Plan) ?? 'free') as Plan
    const count = ((data?.count ?? 0) as number) + 1
    await client.from('workspace_usage').upsert({ workspace_id, period, plan, count })
    return
  }
  const cur = usage.get(workspace_id) ?? { plan: 'free' as Plan, count: 0, period }
  if (cur.period !== period) cur.count = 0, cur.period = period
  cur.count += 1
  usage.set(workspace_id, cur)
}

export async function getWorkspaceUsage(client: SupabaseClient | undefined, workspace_id: string) {
  const period = new Date().toISOString().slice(0,7)
  if (client) {
    const { data } = await client.from('workspace_usage').select('*').eq('workspace_id', workspace_id).eq('period', period).maybeSingle()
    const plan = ((data?.plan as Plan) ?? 'free') as Plan
    const count = (data?.count ?? 0) as number
    const limit = limits[plan].max_messages_month
    return { plan, count, limit, period }
  }
  const cur = usage.get(workspace_id) ?? { plan: 'free' as Plan, count: 0, period }
  const limit = limits[cur.plan].max_messages_month
  return { plan: cur.plan, count: cur.count, limit, period: cur.period }
}

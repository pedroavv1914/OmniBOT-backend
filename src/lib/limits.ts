type Plan = 'free' | 'pro' | 'enterprise'

const limits: Record<Plan, { max_messages_month: number }> = {
  free: { max_messages_month: 1000 },
  pro: { max_messages_month: 50000 },
  enterprise: { max_messages_month: 1000000 }
}

const usage = new Map<string, { plan: Plan, count: number, period: string }>()

export function setWorkspacePlan(workspace_id: string, plan: Plan) {
  const period = new Date().toISOString().slice(0,7)
  const cur = usage.get(workspace_id)
  if (!cur || cur.period !== period) usage.set(workspace_id, { plan, count: 0, period })
  else usage.set(workspace_id, { ...cur, plan })
}

export function canSendMessage(workspace_id: string) {
  const period = new Date().toISOString().slice(0,7)
  const cur = usage.get(workspace_id) ?? { plan: 'free' as Plan, count: 0, period }
  if (cur.period !== period) cur.count = 0, cur.period = period
  const limit = limits[cur.plan].max_messages_month
  return cur.count < limit
}

export function recordSentMessage(workspace_id: string) {
  const period = new Date().toISOString().slice(0,7)
  const cur = usage.get(workspace_id) ?? { plan: 'free' as Plan, count: 0, period }
  if (cur.period !== period) cur.count = 0, cur.period = period
  cur.count += 1
  usage.set(workspace_id, cur)
}

export function getWorkspaceUsage(workspace_id: string) {
  const period = new Date().toISOString().slice(0,7)
  const cur = usage.get(workspace_id) ?? { plan: 'free' as Plan, count: 0, period }
  const limit = limits[cur.plan].max_messages_month
  return { plan: cur.plan, count: cur.count, limit, period: cur.period }
}
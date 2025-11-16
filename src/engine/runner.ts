import { Flow } from '../flow/schema'
import { askAI } from '../lib/ai'
import { saveAiLog } from '../repo/ai_logs'
import { setTimeout as sleep } from 'timers/promises'
// usando fetch nativo do Node 18+; caso falhe em tipos, mantemos any
const doFetch: any = (globalThis as any).fetch

export async function runFlow(
  flow: Flow | undefined,
  input: { text: string },
  ctx?: { env: any, supabase: any, bot_id?: string },
  state?: { variables?: Record<string, any>, awaiting_var?: string, awaiting_node_id?: string }
) {
  if (!flow || flow.nodes.length === 0) return { content: `Ack: ${input.text}`, state }
  const vars = { ...(state?.variables ?? {}) }
  if (state?.awaiting_var && state.awaiting_node_id) {
    vars[state.awaiting_var] = input.text
    const qNode = flow.nodes.find(n => n.id === state.awaiting_node_id)
    const nextEdge = flow.edges.find(e => e.source === state.awaiting_node_id)
    const next = nextEdge ? flow.nodes.find(n => n.id === nextEdge.target) : undefined
    const newState = { variables: vars }
    if (next?.type === 'message' && typeof next.data?.text === 'string') return { content: String(next.data.text), state: newState }
    if (next?.type === 'ai') {
      const r = await askAI(ctx?.env ?? {}, input.text)
      if (ctx?.bot_id) await saveAiLog(ctx?.supabase, { bot_id: ctx.bot_id, message_input: input.text, ai_response: r.text, tokens: r.tokens })
      return { content: r.text, state: newState }
    }
    return { content: `Ack: ${input.text}`, state: newState }
  }
  const kwText = input.text.toLowerCase()
  const cond = flow.nodes.find(n => n.type === 'condition' && (
    Array.isArray((n.data as any)?.keywords)
      ? ((n.data as any).keywords as string[]).some(k => kwText.includes(String(k).toLowerCase()))
      : typeof (n.data as any)?.keyword === 'string' && kwText.includes(String((n.data as any).keyword).toLowerCase())
  ))
  if (cond) {
    const edge = flow.edges.find(e => e.source === cond.id)
    if (edge) {
      const target = flow.nodes.find(n => n.id === edge.target)
      if (target?.type === 'message' && typeof target.data?.text === 'string') return { content: String(target.data.text), state: { variables: vars } }
      if (target?.type === 'question') {
        const varName = String(target.data?.var ?? 'answer')
        const question = String(target.data?.text ?? 'Digite sua resposta:')
        return { content: question, state: { variables: vars, awaiting_var: varName, awaiting_node_id: target.id } }
      }
      if (target?.type === 'ai') {
        const r = await askAI(ctx?.env ?? {}, input.text)
        if (ctx?.bot_id) await saveAiLog(ctx?.supabase, { bot_id: ctx.bot_id, message_input: input.text, ai_response: r.text, tokens: r.tokens })
        return { content: r.text, state: { variables: vars } }
      }
      if (target?.type === 'delay') {
        const ms = Number(target.data?.ms ?? 500)
        await sleep(ms)
        const nextEdge = flow.edges.find(e => e.source === target.id)
        if (nextEdge) {
          const next = flow.nodes.find(n => n.id === nextEdge.target)
          if (next?.type === 'message' && typeof next.data?.text === 'string') return { content: String(next.data.text), state: { variables: vars } }
          if (next?.type === 'ai') {
            const r = await askAI(ctx?.env ?? {}, input.text)
            if (ctx?.bot_id) await saveAiLog(ctx?.supabase, { bot_id: ctx.bot_id, message_input: input.text, ai_response: r.text, tokens: r.tokens })
            return { content: r.text, state: { variables: vars } }
          }
        }
      }
      if (target?.type === 'api') {
        const url = String(target.data?.url ?? '')
        const method = String(target.data?.method ?? 'GET')
        const headers = target.data?.headers ?? { 'Content-Type': 'application/json' }
        const body = target.data?.body ? JSON.stringify(target.data.body) : undefined
        if (url && doFetch) {
          try {
            const res = await doFetch(url, { method, headers, body })
            const ct = res.headers.get('content-type') || ''
            let value: any = undefined
            if (ct.includes('application/json')) value = await res.json()
            else value = await res.text()
            const path = String(target.data?.responsePath ?? '')
            const content = path && value && typeof value === 'object'
              ? String(path.split('.').reduce((acc: any, k: string) => acc?.[k], value) ?? '')
              : (typeof value === 'string' ? value : JSON.stringify(value))
            if (content) return { content, state: { variables: vars } }
          } catch {}
        }
        const nextEdge = flow.edges.find(e => e.source === target.id)
        if (nextEdge) {
          const next = flow.nodes.find(n => n.id === nextEdge.target)
          if (next?.type === 'message' && typeof next.data?.text === 'string') return { content: String(next.data.text), state: { variables: vars } }
        }
      }
    }
  }
  const start = flow.nodes.find(n => n.type === 'message')
  if (start && typeof start.data?.text === 'string') return { content: String(start.data.text), state: { variables: vars } }
  const qStart = flow.nodes.find(n => n.type === 'question')
  if (qStart) {
    const varName = String(qStart.data?.var ?? 'answer')
    const question = String(qStart.data?.text ?? 'Digite sua resposta:')
    return { content: question, state: { variables: vars, awaiting_var: varName, awaiting_node_id: qStart.id } }
  }
  const ai = flow.nodes.find(n => n.type === 'ai')
  if (ai) {
    const r = await askAI(ctx?.env ?? {}, input.text)
    if (ctx?.bot_id) await saveAiLog(ctx?.supabase, { bot_id: ctx.bot_id, message_input: input.text, ai_response: r.text, tokens: r.tokens })
    return { content: r.text, state: { variables: vars } }
  }
  return { content: `Ack: ${input.text}`, state: { variables: vars } }
}
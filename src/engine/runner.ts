import { Flow } from '../flow/schema'
import { askAI } from '../lib/ai'
import { saveAiLog } from '../repo/ai_logs'

export async function runFlow(flow: Flow | undefined, input: { text: string }, ctx?: { env: any, supabase: any, bot_id?: string }) {
  if (!flow || flow.nodes.length === 0) return { content: `Ack: ${input.text}` }
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
      if (target?.type === 'message' && typeof target.data?.text === 'string') return { content: String(target.data.text) }
      if (target?.type === 'ai') {
        const r = await askAI(ctx?.env ?? {}, input.text)
        if (ctx?.bot_id) await saveAiLog(ctx?.supabase, { bot_id: ctx.bot_id, message_input: input.text, ai_response: r.text, tokens: r.tokens })
        return { content: r.text }
      }
    }
  }
  const start = flow.nodes.find(n => n.type === 'message')
  if (start && typeof start.data?.text === 'string') return { content: String(start.data.text) }
  const ai = flow.nodes.find(n => n.type === 'ai')
  if (ai) {
    const r = await askAI(ctx?.env ?? {}, input.text)
    if (ctx?.bot_id) await saveAiLog(ctx?.supabase, { bot_id: ctx.bot_id, message_input: input.text, ai_response: r.text, tokens: r.tokens })
    return { content: r.text }
  }
  return { content: `Ack: ${input.text}` }
}
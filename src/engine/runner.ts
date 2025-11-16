import { Flow } from '../flow/schema'

export async function runFlow(flow: Flow | undefined, input: { text: string }) {
  if (!flow || flow.nodes.length === 0) return { content: `Ack: ${input.text}` }
  const start = flow.nodes.find(n => n.type === 'message')
  if (start && typeof start.data?.text === 'string') return { content: String(start.data.text) }
  const ai = flow.nodes.find(n => n.type === 'ai')
  if (ai) return { content: `IA: ${input.text}` }
  return { content: `Ack: ${input.text}` }
}
import { Flow } from '../flow/schema'

export async function runFlow(flow: Flow | undefined, input: { text: string }) {
  if (!flow || flow.nodes.length === 0) return { content: `Ack: ${input.text}` }
  const first = flow.nodes[0]
  if (first.type === 'message' && typeof first.data?.text === 'string') {
    return { content: String(first.data.text) }
  }
  return { content: `Ack: ${input.text}` }
}
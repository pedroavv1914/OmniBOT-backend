import OpenAI from 'openai'
import { Env } from './env'

export async function askAI(env: Env, prompt: string) {
  if (!env.OPENAI_API_KEY) return { text: `IA: ${prompt}`, tokens: 0 }
  try {
    const client = new OpenAI({ apiKey: env.OPENAI_API_KEY })
    const r = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'Você é um assistente do OmniBOT.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5
    })
    const text = r.choices?.[0]?.message?.content ?? `IA: ${prompt}`
    const tokens = (r.usage?.total_tokens ?? 0) as number
    return { text, tokens }
  } catch {
    return { text: `IA: ${prompt}`, tokens: 0 }
  }
}
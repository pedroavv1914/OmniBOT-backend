import type { SupabaseClient } from '@supabase/supabase-js'

export type Message = {
  id?: string
  conversation_id: string
  sender_type: 'user' | 'bot' | 'agent'
  direction: 'incoming' | 'outgoing'
  channel: string
  content: string
  payload?: any
  created_at?: string
}

const msgMem = new Map<string, Message[]>()

export async function createMessage(client: SupabaseClient | undefined, m: Message) {
  if (client) {
    const { data, error } = await client.from('messages').insert(m).select('*').single()
    if (!error && data) return data as Message
  }
  const id = crypto.randomUUID()
  const created = { ...m, id }
  const arr = msgMem.get(m.conversation_id) ?? []
  arr.push(created)
  msgMem.set(m.conversation_id, arr)
  return created
}

export async function listMessages(client: SupabaseClient | undefined, conversation_id: string) {
  if (client) {
    const { data } = await client.from('messages').select('*').eq('conversation_id', conversation_id).order('created_at', { ascending: true })
    return (data ?? []) as Message[]
  }
  return msgMem.get(conversation_id) ?? []
}
import type { SupabaseClient } from '@supabase/supabase-js'

export type ConvState = {
  conversation_id: string
  bot_id?: string
  variables: Record<string, any>
  awaiting_var?: string
  awaiting_node_id?: string
}

const mem = new Map<string, ConvState>()

export async function getState(client: SupabaseClient | undefined, conversation_id: string): Promise<ConvState | undefined> {
  if (client) {
    const { data } = await client.from('conversation_states').select('*').eq('conversation_id', conversation_id).maybeSingle()
    if (data) return {
      conversation_id: data.conversation_id,
      bot_id: data.bot_id ?? undefined,
      variables: data.variables ?? {},
      awaiting_var: data.awaiting_var ?? undefined,
      awaiting_node_id: data.awaiting_node_id ?? undefined
    }
  }
  return mem.get(conversation_id)
}

export async function setState(client: SupabaseClient | undefined, state: ConvState): Promise<void> {
  if (client) {
    await client.from('conversation_states').upsert({
      conversation_id: state.conversation_id,
      bot_id: state.bot_id ?? null,
      variables: state.variables,
      awaiting_var: state.awaiting_var ?? null,
      awaiting_node_id: state.awaiting_node_id ?? null
    })
    return
  }
  mem.set(state.conversation_id, state)
}
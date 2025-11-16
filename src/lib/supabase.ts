import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { Env } from './env'

export function buildSupabase(env: Env): SupabaseClient | undefined {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) return undefined
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
}
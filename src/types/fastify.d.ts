import type { Queue } from 'bullmq'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Env } from '../lib/env'

declare module 'fastify' {
  interface FastifyInstance {
    config: {
      env: Env
      supabase?: SupabaseClient
      queues: { incoming: Queue }
    }
  }
}
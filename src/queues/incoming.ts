import { Queue } from 'bullmq'
import { Env } from '../lib/env'
import { RedisOptions } from 'ioredis'

export function buildIncomingQueue(env: Env): Queue | null {
  if (!env.REDIS_URL) return null
  const opts: RedisOptions = { host: env.REDIS_URL } as any
  return new Queue('incoming', { connection: opts as any })
}
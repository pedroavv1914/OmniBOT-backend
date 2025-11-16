import { Queue } from 'bullmq'
import { Env } from '../lib/env'
import { RedisOptions } from 'ioredis'

export function buildIncomingQueue(env: Env) {
  const opts: RedisOptions | undefined = env.REDIS_URL ? { host: env.REDIS_URL } as any : undefined
  return new Queue('incoming', { connection: opts as any })
}
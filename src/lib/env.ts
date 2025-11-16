import { z } from 'zod'

export const EnvSchema = z.object({
  PORT: z.string().optional(),
  SUPABASE_URL: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  JWT_SECRET: z.string().optional(),
  REDIS_URL: z.string().optional(),
  OPENAI_API_KEY: z.string().optional()
})

export type Env = z.infer<typeof EnvSchema>
import { z } from 'zod'

const BaseNode = z.object({
  id: z.string(),
  type: z.enum(['message','question','condition','api','delay','wa_template','ai']),
  position: z.object({ x: z.number(), y: z.number() }).optional(),
  data: z.record(z.any()).default({})
})

export const EdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional()
})

export const FlowSchema = z.object({
  bot_id: z.string().optional(),
  nodes: z.array(BaseNode),
  edges: z.array(EdgeSchema)
})

export type Flow = z.infer<typeof FlowSchema>
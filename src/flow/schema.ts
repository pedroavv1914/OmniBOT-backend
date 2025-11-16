import { z } from 'zod'

const Position = z.object({ x: z.number(), y: z.number() }).optional()

const MessageNode = z.object({ id: z.string(), type: z.literal('message'), position: Position, data: z.object({ text: z.string() }) })
const QuestionNode = z.object({ id: z.string(), type: z.literal('question'), position: Position, data: z.object({ text: z.string(), var: z.string() }) })
const ConditionNode = z.object({ id: z.string(), type: z.literal('condition'), position: Position, data: z.object({ keyword: z.string().optional(), keywords: z.array(z.string()).optional() }) })
const ApiNode = z.object({ id: z.string(), type: z.literal('api'), position: Position, data: z.object({ url: z.string(), method: z.string().default('GET'), headers: z.record(z.any()).optional(), body: z.any().optional(), responsePath: z.string().optional() }) })
const DelayNode = z.object({ id: z.string(), type: z.literal('delay'), position: Position, data: z.object({ ms: z.number().default(500) }) })
const AiNode = z.object({ id: z.string(), type: z.literal('ai'), position: Position, data: z.object({}) })

const NodeSchema = z.union([MessageNode, QuestionNode, ConditionNode, ApiNode, DelayNode, AiNode])

export const EdgeSchema = z.object({ id: z.string(), source: z.string(), target: z.string(), label: z.string().optional() })

export const FlowSchema = z.object({ bot_id: z.string().optional(), nodes: z.array(NodeSchema), edges: z.array(EdgeSchema) })

export type Flow = z.infer<typeof FlowSchema>
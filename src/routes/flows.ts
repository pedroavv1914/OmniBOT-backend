import { FastifyInstance } from 'fastify'
import { FlowSchema, Flow } from '../flow/schema'
import { randomUUID } from 'crypto'
import { saveFlowRepo, getFlowRepo, getLatestFlowByBotRepo, publishFlowRepo, listFlowsByBotRepo } from '../repo/flows'

const store = new Map<string, Flow>()

export default async function routes(app: FastifyInstance) {
  app.post('/bot_flows', {
    preHandler: (app as any).requireAuth,
    schema: {
      tags: ['flows'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          bot_id: { type: 'string' },
          nodes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                type: { type: 'string', enum: ['message','question','condition','api','delay','wa_template','ai'] },
                position: {
                  type: 'object',
                  properties: { x: { type: 'number' }, y: { type: 'number' } },
                  required: ['x','y']
                },
                data: { type: 'object' }
              },
              required: ['id','type']
            }
          },
          edges: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                source: { type: 'string' },
                target: { type: 'string' },
                label: { type: 'string' }
              },
              required: ['source','target']
            }
          }
        },
        required: ['nodes','edges']
      },
      response: {
        200: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
        400: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const parsed = FlowSchema.safeParse(req.body)
    if (!parsed.success) {
      return reply.code(400).send({ error: 'invalid_flow', details: parsed.error.flatten() })
    }
    const id = await saveFlowRepo((app as any).config.supabase, parsed.data)
    return { id }
  })

  app.get('/bot_flows/:id', {
    preHandler: (app as any).requireAuth,
    schema: {
      tags: ['flows'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      response: {
        200: {
          type: 'object',
          properties: {
            bot_id: { type: 'string' },
            nodes: { type: 'array' },
            edges: { type: 'array' }
          }
        },
        404: { type: 'object', properties: { error: { type: 'string' } } }
      }
    }
  }, async (req, reply) => {
    const id = (req.params as any).id as string
    const flow = await getFlowRepo((app as any).config.supabase, id)
    if (!flow) return reply.code(404).send({ error: 'not_found' })
    return flow
  })

  app.get('/bots/:id/flow', {
    preHandler: (app as any).requireAuth,
    schema: {
      tags: ['flows'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      response: { 200: { type: 'object' }, 404: { type: 'object' } }
    }
  }, async (req, reply) => {
    const botId = (req.params as any).id as string
    const flow = await getLatestFlowByBotRepo((app as any).config.supabase, botId)
    if (!flow) return reply.code(404).send({ error: 'not_found' })
    return flow
  })

  app.post('/bots/:id/flow', {
    preHandler: (app as any).requireAuth,
    schema: {
      tags: ['flows'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      body: { type: 'object', properties: { nodes: { type: 'array' }, edges: { type: 'array' } }, required: ['nodes','edges'] },
      response: { 200: { type: 'object', properties: { id: { type: 'string' } } } }
    }
  }, async (req) => {
    const botId = (req.params as any).id as string
    const parsed = FlowSchema.safeParse({ ...(req.body as any), bot_id: botId })
    if (!parsed.success) return { error: 'invalid_flow' }
    const id = await saveFlowRepo((app as any).config.supabase, parsed.data)
    return { id }
  })

  app.post('/bots/:id/flow/publish', {
    preHandler: (app as any).requireAuth,
    schema: {
      tags: ['flows'],
      security: [{ bearerAuth: [] }],
      params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      body: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
      response: { 200: { type: 'object', properties: { ok: { type: 'boolean' } } } }
    }
  }, async (req) => {
    const botId = (req.params as any).id as string
    const flowId = (req.body as any).id as string
    await publishFlowRepo((app as any).config.supabase, botId, flowId)
    return { ok: true }
  })

  app.get('/bots/:id/flows', {
    preHandler: (app as any).requireAuth,
    schema: { tags: ['flows'], security: [{ bearerAuth: [] }], params: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] }, response: { 200: { type: 'array' } } }
  }, async (req) => {
    const botId = (req.params as any).id as string
    const list = await listFlowsByBotRepo((app as any).config.supabase, botId)
    return list
  })
}
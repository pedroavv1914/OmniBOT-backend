import { FastifyInstance } from 'fastify'
import { FlowSchema, Flow } from '../flow/schema'
import { randomUUID } from 'crypto'

const store = new Map<string, Flow>()

export default async function routes(app: FastifyInstance) {
  app.post('/bot_flows', {
    schema: {
      tags: ['flows'],
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
    const id = randomUUID()
    store.set(id, parsed.data)
    return { id }
  })

  app.get('/bot_flows/:id', {
    schema: {
      tags: ['flows'],
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
    const flow = store.get(id)
    if (!flow) return reply.code(404).send({ error: 'not_found' })
    return flow
  })
}
import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { subscribe, publish } from '../lib/pubsub'

type Session = { id: string, number_id: string, qr_text: string, status: 'pending'|'paired'|'expired', expires_at: number }
const sessions = new Map<string, Session>()

export default async function routes(app: FastifyInstance) {
  const initSchema = z.object({})
  app.post('/numbers/:id/whatsapp/init', { preHandler: (app as any).requireAuth, schema: { tags: ['whatsapp'], security: [{ bearerAuth: [] }] } }, async (req, reply) => {
    const number_id = (req.params as any).id as string
    initSchema.parse({})
    const id = `${number_id}-${Date.now()}`
    const qr_text = `WAPPPAIR:${Math.random().toString(36).slice(2)}:${Date.now()}`
    const expires_at = Date.now() + 60_000
    const s: Session = { id, number_id, qr_text, status: 'pending', expires_at }
    sessions.set(id, s)
    publish(`wapp:${number_id}`, { session_id: id, status: s.status })
    return { session_id: id, qr_text, expires_at }
  })

  app.get('/numbers/:id/whatsapp/status', { preHandler: (app as any).requireAuth, schema: { tags: ['whatsapp'], security: [{ bearerAuth: [] }] } }, async (req, reply) => {
    const number_id = (req.params as any).id as string
    reply.header('Access-Control-Allow-Origin', '*')
    reply.header('Access-Control-Allow-Headers', 'authorization, content-type')
    reply.raw.setHeader('Content-Type', 'text/event-stream')
    reply.raw.setHeader('Cache-Control', 'no-cache')
    reply.raw.setHeader('Connection', 'keep-alive')
    reply.raw.flushHeaders()
    const off = subscribe(`wapp:${number_id}`, data => { reply.raw.write(`data: ${JSON.stringify(data)}\n\n`) })
    req.raw.on('close', () => off())
  })

  // endpoint de teste para simular leitura do QR
  app.post('/numbers/:id/whatsapp/mock-scan', { preHandler: (app as any).requireAuth, schema: { tags: ['whatsapp'], security: [{ bearerAuth: [] }] } }, async (req) => {
    const number_id = (req.params as any).id as string
    const last = Array.from(sessions.values()).filter(s => s.number_id === number_id).sort((a,b)=>b.expires_at-a.expires_at)[0]
    if (!last) return { ok: false }
    const now = Date.now()
    if (last.expires_at < now) { last.status = 'expired' } else { last.status = 'paired' }
    sessions.set(last.id, last)
    publish(`wapp:${number_id}`, { session_id: last.id, status: last.status })
    return { ok: true }
  })
}

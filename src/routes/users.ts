import { FastifyInstance } from 'fastify'
import { getUserByAuthId, updateUserByAuthId } from '../repo/users'
const jwt: any = require('jsonwebtoken')

export default async function routes(app: FastifyInstance) {
  app.get('/users/me', { preHandler: (app as any).requireAuth, schema: { tags: ['users'], security: [{ bearerAuth: [] }] } }, async (req, reply) => {
    const h = req.headers?.authorization as string | undefined
    const token = h?.startsWith('Bearer ') ? h.slice(7) : undefined
    const secret = (app as any).config.env.JWT_SECRET as string | undefined
    const supabase = (app as any).config.supabase
    if (!token) return reply.code(401).send({ error: 'unauthorized' })
    if (secret) {
      try {
        const d = jwt.verify(token, secret)
        const sub = (d as any)?.sub as string | undefined
        if (sub) {
          const u = await getUserByAuthId(supabase, sub)
          return u ?? { auth_user_id: sub }
        }
      } catch {}
      return reply.code(401).send({ error: 'invalid_token' })
    }
    if (supabase) {
      const { data, error } = await supabase.auth.getUser(token)
      if (error || !data?.user?.id) return reply.code(401).send({ error: 'invalid_token' })
      const u = await getUserByAuthId(supabase, data.user.id)
      return u ?? { auth_user_id: data.user.id, email: data.user.email }
    }
    return reply.code(400).send({ error: 'auth_not_configured' })
  })

  app.patch('/users/me', { preHandler: (app as any).requireAuth, schema: { tags: ['users'], security: [{ bearerAuth: [] }], body: { type: 'object', properties: { username: { type: 'string' }, email: { type: 'string' } } } } }, async (req, reply) => {
    const h = req.headers?.authorization as string | undefined
    const token = h?.startsWith('Bearer ') ? h.slice(7) : undefined
    const secret = (app as any).config.env.JWT_SECRET as string | undefined
    const supabase = (app as any).config.supabase
    if (!token) return reply.code(401).send({ error: 'unauthorized' })
    let authId: string | undefined
    let email: string | undefined
    if (secret) {
      try {
        const d = (require('jsonwebtoken') as any).verify(token, secret)
        authId = (d as any)?.sub as string | undefined
      } catch {}
      if (!authId) return reply.code(401).send({ error: 'invalid_token' })
    } else if (supabase) {
      const { data, error } = await supabase.auth.getUser(token)
      if (error || !data?.user?.id) return reply.code(401).send({ error: 'invalid_token' })
      authId = data.user.id
      email = data.user.email ?? undefined
    } else {
      return reply.code(400).send({ error: 'auth_not_configured' })
    }
    const patch = req.body as any
    const upd = authId ? await updateUserByAuthId(supabase, authId, { username: patch.username, email: patch.email ?? email }) : null
    return upd ?? { ok: true }
  })
}

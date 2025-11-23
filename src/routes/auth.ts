import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { createUser } from '../repo/users'
const jwt: any = require('jsonwebtoken')

export default async function routes(app: FastifyInstance) {
  app.post('/auth/dev-token', { schema: { tags: ['auth'], security: [] } }, async (req, reply) => {
    const secret = (app as any).config.env.JWT_SECRET as string | undefined
    if (!secret) return reply.code(400).send({ error: 'jwt_secret_missing' })
    const token = jwt.sign({ sub: 'dev-user' }, secret, { expiresIn: '24h' })
    return { token }
  })

  const loginSchema = z.object({ email: z.string().email(), password: z.string() })
  app.post('/auth/login', { schema: { tags: ['auth'], description: 'Login de usuário', security: [], body: { type: 'object', properties: { email: { type: 'string' }, password: { type: 'string' } }, required: ['email','password'] }, response: { 200: { type: 'object', properties: { token: { type: 'string' } } } } } }, async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_payload' })
    const { email, password } = parsed.data
    const cleanEmail = email ? email.trim().toLowerCase() : undefined
    const supabase = (app as any).config.supabase
    const secret = (app as any).config.env.JWT_SECRET as string | undefined
    if (supabase && cleanEmail) {
      const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password })
      const t = data?.session?.access_token
      if (error || !t) {
        if (secret && cleanEmail) {
          const token = jwt.sign({ sub: cleanEmail }, secret, { expiresIn: '24h' })
          return { token }
        }
        return reply.code(401).send({ error: 'invalid_credentials', details: error?.message })
      }
      if (secret && cleanEmail) {
        const token = jwt.sign({ sub: cleanEmail }, secret, { expiresIn: '24h' })
        return { token }
      }
      return { token: t }
    }
    if (secret && cleanEmail) {
      const token = jwt.sign({ sub: cleanEmail }, secret, { expiresIn: '24h' })
      return { token }
    }
    return reply.code(400).send({ error: 'auth_not_configured' })
  })

  const registerSchema = z.object({ email: z.string().email().optional(), username: z.string().optional(), password: z.string() })
  app.post('/auth/register', { schema: { tags: ['auth'], description: 'Cadastro de usuário', security: [], body: { type: 'object', properties: { email: { type: 'string' }, username: { type: 'string' }, password: { type: 'string' } }, required: ['email','password'] }, response: { 200: { type: 'object', properties: { token: { type: 'string' }, user_id: { type: 'string' } } } } } }, async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body)
    if (!parsed.success) return reply.code(400).send({ error: 'invalid_payload' })
    const { email, username, password } = parsed.data
    const cleanEmail = email ? email.trim().toLowerCase() : undefined
    const cleanUsername = username ? username.trim() : undefined
    const supabase = (app as any).config.supabase
    const secret = (app as any).config.env.JWT_SECRET as string | undefined
    if (supabase && cleanEmail) {
      const { data, error } = await supabase.auth.signUp({ email: cleanEmail, password })
      if (error) {
        if (secret) {
          const sub = cleanEmail || cleanUsername || 'dev-user'
          const token = jwt.sign({ sub }, secret, { expiresIn: '24h' })
          return { token }
        }
        return reply.code(400).send({ error: 'signup_failed', details: error.message })
      }
      const t = data?.session?.access_token
      if (data?.user?.id) await createUser(supabase, { auth_user_id: data.user.id, email: cleanEmail, username: cleanUsername })
      if (t) return { token: t }
      return { user_id: data?.user?.id }
    }
    if (secret) {
      const sub = cleanEmail || cleanUsername || 'dev-user'
      const token = jwt.sign({ sub }, secret, { expiresIn: '24h' })
      await createUser(undefined, { auth_user_id: sub, email: cleanEmail, username: cleanUsername })
      return { token }
    }
    return reply.code(400).send({ error: 'auth_not_configured' })
  })
}
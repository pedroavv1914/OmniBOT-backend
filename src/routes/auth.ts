import { FastifyInstance } from 'fastify'
const jwt: any = require('jsonwebtoken')

export default async function routes(app: FastifyInstance) {
  app.post('/auth/dev-token', { schema: { tags: ['auth'] } }, async (req, reply) => {
    const secret = (app as any).config.env.JWT_SECRET as string | undefined
    if (!secret) return reply.code(400).send({ error: 'jwt_secret_missing' })
    const token = jwt.sign({ sub: 'dev-user' }, secret, { expiresIn: '24h' })
    return { token }
  })
}
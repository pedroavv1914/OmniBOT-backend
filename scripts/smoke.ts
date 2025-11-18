const env: any = (globalThis as any).process?.env || {}
const base = env.API_URL || 'http://localhost:3000'

async function req(path: string, init?: any) {
  const r = await fetch(`${base}${path}`, init)
  if (!r.ok) throw new Error(`${path} ${r.status}`)
  return r.json()
}

async function main() {
  try {
    const h = await req('/health')
    console.log('health', h)

    let token: string | undefined
    try {
      const dt = await req('/auth/dev-token', { method: 'POST' })
      token = dt?.token
      console.log('dev-token ok')
    } catch {
      console.log('dev-token indisponível, seguindo sem Authorization')
    }

    const auth = token ? { Authorization: `Bearer ${token}` } : {}

    const bot = await req('/bots', { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify({ workspace_id: 'ws-demo', name: 'Smoke Bot' }) })
    console.log('bot', bot)

    const list = await req(`/bots?workspace_id=${encodeURIComponent('ws-demo')}`, { headers: { ...auth } })
    console.log('bots_list', list)

    const flow = await req(`/bots/${bot.id}/flow`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify({ nodes: [{ id: 'n1', type: 'message', position: { x: 0, y: 0 }, data: { text: 'hello' } }], edges: [] }) })
    console.log('flow', flow)

    const conv = await req('/conversations', { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify({ bot_id: bot.id, channel: 'webchat', contact_identifier: 'user1' }) })
    console.log('conv', conv)

    const msg = await req(`/conversations/${conv.id}/messages`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...auth }, body: JSON.stringify({ sender_type: 'user', direction: 'incoming', channel: 'webchat', content: 'hi' }) })
    console.log('msg', msg)

    console.log('ok')
  } catch (e: any) {
    console.error('fail', e?.message || String(e))
    throw e
  }
}

main()
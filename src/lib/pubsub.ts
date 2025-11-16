type Subscriber = (data: any) => void

const channels = new Map<string, Set<Subscriber>>()

export function subscribe(channel: string, sub: Subscriber) {
  const set = channels.get(channel) ?? new Set<Subscriber>()
  set.add(sub)
  channels.set(channel, set)
  return () => {
    set.delete(sub)
  }
}

export function publish(channel: string, data: any) {
  const set = channels.get(channel)
  if (!set) return
  for (const sub of set) sub(data)
}
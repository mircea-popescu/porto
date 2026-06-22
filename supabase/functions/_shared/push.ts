export interface PushMessage {
  to: string
  title: string
  body: string
  data?: Record<string, unknown>
}

export interface PushTicket {
  status: 'ok' | 'error'
  id?: string
  message?: string
  details?: Record<string, unknown>
}

/** Expo recomandă maximum 100 de mesaje per request push. */
const EXPO_BATCH_SIZE = 100

/**
 * Plafon de siguranță: numărul maxim de notificări trimise într-o singură
 * rulare a unei funcții (anti-runaway / limitare de cost pe fan-out).
 * Suprascriabil prin env `MAX_PUSH_PER_RUN`.
 */
export const MAX_PUSH_PER_RUN = Number(Deno.env.get('MAX_PUSH_PER_RUN') ?? '2000')

/**
 * Trunchiază două liste paralele (mesaje + metadate) la plafonul de siguranță.
 * Întoarce numărul de elemente eliminate (0 dacă nu s-a depășit plafonul), ca
 * apelantul să poată loga depășirea.
 */
export function capToLimit<A, B>(a: A[], b: B[], max = MAX_PUSH_PER_RUN): number {
  if (a.length <= max) return 0
  const dropped = a.length - max
  a.length = max
  b.length = max
  return dropped
}

/** Trimite notificări push prin Expo Push API, în loturi de cel mult 100. */
export async function sendExpoPush(messages: PushMessage[]): Promise<PushTicket[]> {
  if (messages.length === 0) return []
  const tickets: PushTicket[] = []
  for (let i = 0; i < messages.length; i += EXPO_BATCH_SIZE) {
    const batch = messages.slice(i, i + EXPO_BATCH_SIZE)
    const resp = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(batch),
    })
    const json = await resp.json()
    const data = Array.isArray(json.data) ? json.data : [json.data]
    for (const ticket of data) tickets.push(ticket)
  }
  return tickets
}

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

/** Trimite notificări push prin Expo Push API (batch). */
export async function sendExpoPush(messages: PushMessage[]): Promise<PushTicket[]> {
  if (messages.length === 0) return []
  const resp = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify(messages),
  })
  const json = await resp.json()
  return Array.isArray(json.data) ? json.data : [json.data]
}

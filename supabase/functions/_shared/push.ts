import { SupabaseClient } from 'jsr:@supabase/supabase-js@2';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

export type NotificationType =
  | 'daily_reminder'
  | 'daily_reminder_followup'
  | 'value_inactivity'
  | 'milestone_achieved'
  | 'friend_milestone';

type ExpoMessage = {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
};

type ExpoTicket = { status: 'ok' | 'error'; id?: string; message?: string };

/** Trimite un batch de mesaje la Expo Push API și întoarce ticket-urile. */
async function sendToExpo(messages: ExpoMessage[]): Promise<ExpoTicket[]> {
  if (messages.length === 0) return [];
  const res = await fetch(EXPO_PUSH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'Accept-Encoding': 'gzip, deflate',
    },
    body: JSON.stringify(messages),
  });
  if (!res.ok) {
    throw new Error(`Expo push HTTP ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  return (json.data ?? []) as ExpoTicket[];
}

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  goalId?: string | null;
  data?: Record<string, unknown>;
};

/**
 * Trimite o notificare către toate device-urile active ale unui user și
 * jurnalizează fiecare push în tabelul `notifications` (§6.4).
 * Întoarce numărul de push-uri trimise cu succes.
 */
export async function notifyUser(supabase: SupabaseClient, input: NotifyInput): Promise<number> {
  const { data: devices, error } = await supabase
    .from('user_devices')
    .select('expo_push_token')
    .eq('user_id', input.userId)
    .eq('is_active', true);
  if (error) throw error;

  const payload = {
    type: input.type,
    title: input.title,
    body: input.body,
    goal_id: input.goalId ?? null,
    data: input.data ?? null,
  };

  // Niciun device activ — logăm intenția ca „failed” pentru debug, fără push.
  if (!devices || devices.length === 0) {
    await supabase.from('notifications').insert({
      user_id: input.userId,
      goal_id: input.goalId ?? null,
      type: input.type,
      status: 'failed',
      payload: { ...payload, reason: 'no_active_device' },
    });
    return 0;
  }

  const messages: ExpoMessage[] = devices.map((d) => ({
    to: d.expo_push_token,
    title: input.title,
    body: input.body,
    data: { type: input.type, goalId: input.goalId ?? null, ...input.data },
  }));

  let tickets: ExpoTicket[] = [];
  try {
    tickets = await sendToExpo(messages);
  } catch (err) {
    // Eșec la transport: logăm toate ca failed, dar nu oprim restul jobului.
    await supabase.from('notifications').insert(
      messages.map(() => ({
        user_id: input.userId,
        goal_id: input.goalId ?? null,
        type: input.type,
        status: 'failed' as const,
        payload: { ...payload, error: err instanceof Error ? err.message : String(err) },
      })),
    );
    return 0;
  }

  let sent = 0;
  const rows = messages.map((_, i) => {
    const ticket = tickets[i];
    const ok = ticket?.status === 'ok';
    if (ok) sent++;
    return {
      user_id: input.userId,
      goal_id: input.goalId ?? null,
      type: input.type,
      status: ok ? ('sent' as const) : ('failed' as const),
      expo_ticket_id: ticket?.id ?? null,
      payload: ok ? payload : { ...payload, error: ticket?.message ?? 'unknown' },
      sent_at: ok ? new Date().toISOString() : null,
    };
  });
  await supabase.from('notifications').insert(rows);
  return sent;
}

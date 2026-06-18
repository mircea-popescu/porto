# Edge Functions (Faza 1, pasul 9)

Worker-e server-side rulate pe Supabase (Deno). Fiecare folder = o funcție
(`<nume>/index.ts`, §12). Secretele (service role) NU sunt niciodată în codul
aplicației — doar aici, injectate de runtime.

| Funcție | Rol | Cron recomandat |
|---|---|---|
| `daily-reminder` | Reminder confirmare Tip A. Body `{"followup":true}` la 15/20. | `0 11 * * *`, `0 15 * * *`, `0 20 * * *` |
| `inactivity-checker` | Notificare Tip B inactiv ≥7 zile (dedup la 7 zile/goal). | `0 9 * * *` |
| `notification-cleanup` | Șterge notificări > 90 zile. | `0 3 * * *` |

> Orele de cron sunt **UTC**. Ajustează pentru fusul orar al userilor (RO = UTC+2/+3).

`_shared/` conține clientul service-role (`client.ts`) și trimiterea/jurnalizarea
push prin Expo (`push.ts`). Variabilele `SUPABASE_URL` și
`SUPABASE_SERVICE_ROLE_KEY` sunt injectate automat în runtime — nu le seta manual.

## Deploy

```bash
supabase functions deploy daily-reminder
supabase functions deploy inactivity-checker
supabase functions deploy notification-cleanup
```

## Test local

```bash
supabase functions serve daily-reminder
# alt terminal:
curl -i -X POST http://127.0.0.1:54321/functions/v1/daily-reminder \
  -H "Authorization: Bearer $SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" -d '{"followup":false}'
```

## Programare cron (rulează o singură dată în SQL Editor pe proiectul cloud)

Necesită extensiile `pg_cron` și `pg_net` (Database → Extensions). Pune URL-ul
proiectului și service role key în Vault, ca să nu apară în definiția jobului:

```sql
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url');
select vault.create_secret('<service-role-key>', 'service_role_key');
```

```sql
-- helper: apelează o edge function cu service role din Vault
create or replace function public.invoke_edge(fn text, body jsonb default '{}'::jsonb)
returns void language plpgsql security definer as $$
declare url text; key text;
begin
  select decrypted_secret into url  from vault.decrypted_secrets where name = 'project_url';
  select decrypted_secret into key  from vault.decrypted_secrets where name = 'service_role_key';
  perform net.http_post(
    url := url || '/functions/v1/' || fn,
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||key),
    body := body
  );
end $$;

select cron.schedule('daily-reminder-11',  '0 11 * * *', $$select public.invoke_edge('daily-reminder', '{"followup":false}')$$);
select cron.schedule('daily-reminder-15',  '0 15 * * *', $$select public.invoke_edge('daily-reminder', '{"followup":true}')$$);
select cron.schedule('daily-reminder-20',  '0 20 * * *', $$select public.invoke_edge('daily-reminder', '{"followup":true}')$$);
select cron.schedule('inactivity-checker', '0 9 * * *',  $$select public.invoke_edge('inactivity-checker')$$);
select cron.schedule('notification-cleanup','0 3 * * *', $$select public.invoke_edge('notification-cleanup')$$);
```

Verificare: `select * from cron.job;` și `select * from cron.job_run_details order by start_time desc limit 20;`

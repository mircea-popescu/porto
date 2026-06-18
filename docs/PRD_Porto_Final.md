# PRD — Porto (Habit & Goal Progression Tracker)

**Versiune:** 2.0 (finală)
**Autor:** Mircea
**Data:** 17 iunie 2026
**Status:** Gata pentru implementare în Claude Code

---

## 1. Rezumat

Porto este o aplicație mobilă (iOS + Android) pentru urmărirea și menținerea obiceiurilor bune. Userul își definește goaluri cu un orizont de timp și o bară de progres, le grupează pe categorii, și le actualizează fie prin confirmare zilnică, fie prin adăugarea de valori numerice. O componentă socială permite urmărirea altor useri, vizualizarea goalurilor lor publice, notificări la atingerea milestone-urilor și felicitări cu emoji.

### Obiective
- Userul vede dintr-o privire cât a progresat la fiecare goal.
- Confirmarea zilnică creează un ritual care întărește obiceiul.
- Componenta socială adaugă accountability și motivație prin recunoaștere de la prieteni.

### Non-obiective (out of scope v1)
- Monetizare / abonamente — totul gratuit.
- Funcționare offline — aplicația necesită conexiune la internet.
- Mesagerie directă între useri / comentarii.
- Moderare de conținut avansată, feed-uri algoritmice.

---

## 2. Concepte de bază

### 2.1 Goal (obiectiv)
Un goal are: titlu, categorie, tip, vizibilitate (public/privat), dată de start (poate fi în trecut), orizont/target, și progres curent.

### 2.2 Categorii
Categoriile sunt fixe, definite în baza de date, nu pot fi create de useri. Fiecare categorie are un `slug` unic folosit în frontend pentru a mapa culoarea și iconița corespunzătoare dintr-un fișier de configurare (nu stocate în DB).

**Categorii disponibile:** Sănătate, Educație, Sport, Finanțe, Altele.

### 2.3 Tipuri de goal

**Tip A — Daily (confirmare zilnică, auto-increment cu 1)**
- Exemplu: „100 de zile fără fumat", „citește 30 min/zi 60 de zile".
- Target = număr de zile. Progres = zile confirmate.
- Bara se umple proporțional: ziua 30 din 100 → 30%.
- Nu se distinge între goal „activ" (faci ceva) și „pasiv/abstinență" (eviți ceva) — tratament identic.
- Incrementarea cu 1/zi are loc **doar după confirmare activă** a userului.

**Tip B — Value (incrementat de user, unitate liberă)**
- Exemplu: „aleargă 1000 km", „economisește 5000 lei".
- Target = valoare numerică + unitate. Unitatea poate fi predefinită (km, ore, min, EUR, RON, USD, pași, kg, L, pagini) sau custom (text liber one-off).
- Progres = suma intrărilor. Acceptă **decimale** (8.3) și **valori negative / corecții**.
- Userul poate **edita sau șterge** intrări individuale.
- Are și un orizont de timp **informativ**: se salvează în câte zile a fost atins targetul, dar nu blochează sau expiră goalul.
- Atingerea targetului = suma ≥ target, indiferent de timp.

### 2.4 Bara de progres
- Tip A: `zile_confirmate / target_zile`.
- Tip B: `suma_intrari / target_valoare` (poate depăși 100%).
- Progresul se calculează live din baza de date (nu e stocat denormalizat) prin VIEW `goals_with_progress`.
- Lângă bară pot apărea emoji de felicitare primite în ziua curentă (vezi §5.3).

---

## 3. Logica de tracking

### 3.1 Goaluri Tip A — confirmare zilnică

**Confirmarea normală**
În fiecare zi userul confirmă că s-a ținut de goal → progresul crește cu 1 zi.

**Start în trecut (backdating)**
- La creare, userul poate seta o dată de start anterioară (ex. „m-am lăsat de fumat în aprilie").
- Userul declară printr-o **afirmație unică în bloc** „m-am ținut de la data X până azi", iar progresul inițial = numărul de zile dintre data de start și azi.

**Zile ratate (nu a deschis aplicația / nu a confirmat)**
- Lipsa confirmării e **neutră**: goalul NU se pierde, doar nu se incrementează acele zile.
- Când userul revine, i se cere să confirme retroactiv perioada ratată.

**Confirmarea în bloc a perioadei ratate**
- Userul confirmă în bloc: „m-am ținut toată perioada?" (Da / Nu).
- **Dacă DA:** toate zilele ratate se adaugă la progres.
- **Dacă NU (a eșuat măcar o zi):** trackerul se **resetează la 0** și reîncepe de azi. Progresul și istoricul vechi se șterg.

**Eșec declarat activ**
- Dacă userul confirmă activ că a eșuat, goalul se **resetează la 0**.
- Dacă userul **nu spune nimic** (nu confirmă, nu neagă), goalul rămâne pe loc — neutru.

**Ștergere**
Userul poate șterge oricând un tracker.

### 3.2 Goaluri Tip B — valoare

- Userul adaugă intrări (valoare + dată implicită azi). Acceptă decimale și corecții negative.
- Poate edita/șterge intrări individuale.
- Progresul = suma curentă. La atingerea targetului se notează durata (zile de la start la atingere) ca informație.
- Goalul rămâne „completat" dar poate fi continuat (suma poate trece de 100%).

---

## 4. Milestone-uri

### 4.1 Definiție
- **Tip A (zile):** milestone la fiecare **multiplu de 10 zile** ȘI la fiecare **lună întreagă calculată calendaristic** (ex. start 5 apr → milestone la 5 mai, 5 iun etc.). Cele două seturi de praguri coexistă.
- **Tip B (valoare):** milestone la fiecare **10% din target** (10%, 20%, ... 100%).
- Dacă o intrare sare peste un prag (99 → 107 km trece de 100 km / 10%), milestone-ul **se declanșează** la prima intrare care depășește pragul.

### 4.2 Deduplicare
Tabelul `milestones_sent` cu UNIQUE pe `(goal_id, milestone_key)` garantează că notificarea pentru un milestone (ex. „day_30", „10pct", „month_1") se trimite o singură dată per goal, indiferent de câte ori rulează cron-ul.

### 4.3 Efect social
La atingerea unui milestone de către un user urmărit, **toți followerii** primesc o notificare de felicitare (vezi §5).

---

## 5. Componenta socială (Faza 2)

### 5.1 Model de relație
- **Follow unidirectional** (ca Instagram): userul A poate urmări userul B fără reciprocitate.
- Ca să vezi goalurile publice ale unui user, **trebuie să-l urmărești**.
- Goalurile private nu sunt vizibile nimănui în afară de owner.
- `CHECK follower_id != following_id` — nu te poți urmări pe tine însuți.

### 5.2 Cont, profil, căutare
- **Username unic** (folosit pentru dezambiguizare) + **display name** (poate fi duplicat).
- Căutarea se face **după display name**, dar rezultatele arată și username-ul (ex. două rezultate „Andrei Popescu" se disting după username).
- Vizibilitatea se setează **per goal** la creare și se poate **modifica** ulterior.

### 5.3 Felicitări (emoji)
- Cei **5 emoji** posibili: 👍 (thumbs up), ❤️ (inimă), 💪 (muscle), 🥂 (cheers), 🎉 (tada).
- **Flux:** primești notificare „Andrei a atins 100 de zile la «zile fără fumat». Felicită-l!" → tap pe notificare → ajungi direct în view-ul acelui tracker al lui Andrei → alegi unul din cei 5 emoji.
- Poți felicita și fără notificare, **oricând** vizitezi profilul/trackerul unui prieten.
- Emoji-ul primit apare lângă bara de progres a destinatarului **în ziua respectivă**.
- Dacă mai mulți prieteni felicită în aceeași zi: **emoji-urile distincte afișate cu counter pe cele repetate** (ex. 👍×3 ❤️×1).

---

## 6. Notificări

### 6.1 Confirmare zilnică (Tip A)
- **11:00** — notificare: „Intră să-ți confirmi goalurile de azi."
- Dacă userul **nu intră** sau intră și **nu confirmă toate** goalurile Tip A → reminder la **15:00** și **20:00**.
- O singură notificare grupează toate goalurile Tip A nerezolvate.

### 6.2 Inactivitate (Tip B)
- Dacă au trecut **7 zile** de la ultima intrare la un goal Tip B → notificare: „Hei, nu uita de targetul tău «1000 km»!"

### 6.3 Milestone social (Faza 2)
- La atingerea unui milestone de către un user urmărit → notificare de felicitare către followeri.

### 6.4 Monitorizare notificări
- Toate notificările sunt înregistrate în tabelul `notifications` cu: tip, status (pending/sent/failed/delivered), `expo_ticket_id` pentru verificarea livrării, payload complet pentru debug, și `opened_at` pentru tracking de engagement.
- Job de cleanup automat șterge notificările mai vechi de 90 de zile.

---

## 7. Autentificare
- **Email + parolă** ca metodă principală.
- Opțional în viitor: Sign in with Apple + Google (dacă se adaugă social login, Apple îl cere obligatoriu pe iOS).

---

## 8. Stack tehnic (decis)

| Componentă | Tehnologie |
|---|---|
| Frontend mobil | React Native (Expo) — un cod pentru iOS + Android |
| Auth + DB + Realtime | Supabase (Postgres, Auth, Realtime) |
| Cron / push worker | Supabase Edge Functions (cu scheduling) |
| Push notifications | Expo Push Notifications |

**Decizie:** Supabase pur, fără Railway. Supabase oferă auth, DB, realtime și cron într-un singur loc, fără servere de administrat.

---

## 9. Schema bazei de date

### 9.1 Tabele Faza 1 (Core)

| Tabel | Rol |
|---|---|
| `profiles` | Identitatea userului, extinde `auth.users` din Supabase |
| `categories` | Categorii fixe cu slug pentru mapare design în frontend (seed data) |
| `units` | Unități de măsură predefinite + custom one-off (seed data) |
| `goals` | Entitatea centrală — ambele tipuri A și B |
| `daily_confirmations` | Un rând per zi confirmată per goal Tip A |
| `value_entries` | Intrări manuale per goal Tip B (acceptă decimale și negative) |
| `milestones_sent` | Jurnal de milestone-uri notificate, previne duplicate |
| `notifications` | Log complet al tuturor notificărilor push trimise |

### 9.2 Tabele Faza 2 (Social) — create în DB din Faza 1

| Tabel | Rol |
|---|---|
| `follows` | Relații de follow unidirectional între useri |
| `emoji_reactions` | Felicitările emoji trimise pe goalurile prietenilor |

### 9.3 Tabele Ops/Admin

| Tabel | Rol |
|---|---|
| `user_devices` | Device-uri și push tokens per user (înlocuiește câmpul din profiles) |
| `error_logs` | Erori din Edge Functions și cron jobs, cu severitate și context |
| `feature_flags` | Toggleuri pentru funcționalități (ex. `social_enabled`) |

### 9.4 View

| View | Rol |
|---|---|
| `goals_with_progress` | Goaluri cu progres calculat live: COUNT(daily_confirmations) pentru Tip A, SUM(value_entries) pentru Tip B, plus completed_in_days |

### 9.5 ENUM types

```
goal_type:          'daily' | 'value'
notification_type:  'daily_reminder' | 'daily_reminder_followup' |
                    'value_inactivity' | 'milestone_achieved' | 'friend_milestone'
notif_status:       'pending' | 'sent' | 'failed' | 'delivered'
emoji_type:         'thumbs_up' | 'heart' | 'muscle' | 'cheers' | 'tada'
device_platform:    'ios' | 'android'
log_severity:       'info' | 'warning' | 'error' | 'critical'
```

### 9.6 Decizii de arhitectură DB

- **Progres calculat live** (nu denormalizat) — simplitate de întreținut, performanță suficientă pentru volumul unui side project.
- **Soft delete** pe `goals` prin câmpul `is_deleted` — goalurile șterse nu sunt eliminate fizic imediat.
- **Toate tabelele Faza 2 create în prima migrare** — schema DB evoluează greu, codul evoluează ușor. Costul e zero, beneficiul e că nu atingi DB-ul după.
- **RLS (Row Level Security)** activat pe toate tabelele — un user poate vedea doar datele proprii, plus goalurile publice ale userilor pe care îi urmărește.

---

## 10. Structura repository

```
porto/
├── app/                        # codul Expo / React Native
│   ├── (tabs)/                 # ecranele principale (home, search, profile)
│   ├── components/             # componente reutilizabile (ProgressBar, GoalCard, etc.)
│   ├── lib/                    # client Supabase, helpers, utils
│   │   ├── supabase.ts         # inițializare client Supabase
│   │   └── notifications.ts    # toate apelurile de push notifications
│   └── types/                  # tipuri TypeScript generate din schema Supabase
├── supabase/
│   ├── migrations/             # schema DB versionată (SQL)
│   │   ├── 20240617000001_enums.sql
│   │   ├── 20240617000002_core_tables.sql
│   │   ├── 20240617000003_social_tables.sql
│   │   ├── 20240617000004_ops_tables.sql
│   │   ├── 20240617000005_views.sql
│   │   ├── 20240617000006_rls.sql
│   │   └── 20240617000007_seed.sql
│   └── functions/              # Edge Functions
│       ├── daily-reminder/     # cron 11:00, 15:00, 20:00
│       ├── milestone-checker/  # verifică milestone-uri după fiecare confirmare
│       ├── inactivity-checker/ # cron zilnic pentru Tip B inactive 7 zile
│       └── notification-cleanup/ # șterge notificări > 90 zile
├── docs/
│   ├── PRD_Porto.md            # acest fișier
│   └── schema.html             # diagrama vizuală a schemei DB
├── .env.local                  # chei Supabase (nu se commitează)
├── .gitignore
├── app.json                    # config Expo (name: "Porto", slug: "porto")
├── package.json
└── README.md
```

---

## 11. Identificatori aplicație

- **Nume:** Porto
- **Bundle ID (iOS):** `app.porto.habit`
- **Application ID (Android):** `app.porto.habit`
- **Supabase project slug:** `porto-habit`
- **Repo name:** `porto`

---

## 12. Convenții de cod (pentru Claude Code)

- **Limbă:** TypeScript strict (`"strict": true` în tsconfig).
- **Stilul componentelor:** functional components + hooks, fără class components.
- **Supabase types:** generate automat cu `npx supabase gen types typescript --local > app/types/database.ts` după fiecare migrare nouă. Nu scrie tipurile manual.
- **Migrări:** orice modificare de schemă = fișier nou în `supabase/migrations/`. Nu modifica migrările existente.
- **Edge Functions:** un folder per funcție în `supabase/functions/<nume>/index.ts`.
- **Notificări push:** toate apelurile trec prin `app/lib/notifications.ts` (un singur loc).
- **Variabile de mediu:** toate variabilele publice încep cu `EXPO_PUBLIC_`. Secretele (service role key etc.) doar în Edge Functions, niciodată în codul aplicației.
- **Feature flags:** înainte de a implementa orice funcționalitate Faza 2, verifică flag-ul `social_enabled` din tabelul `feature_flags`.

---

## 13. Faze de implementare

### Faza 1 — Core (MVP funcțional, single-player)
1. Setup repo, Supabase, Expo (✅ done)
2. Migrări DB complete (toate tabelele, inclusiv Faza 2 și Ops)
3. Autentificare (email + parolă)
4. Creare goal: categorie, tip (A/B), vizibilitate, dată start (inclusiv backdating), target/orizont, unitate
5. Tip A: confirmare zilnică, recuperare zile ratate în bloc, reset la eșec, ștergere
6. Tip B: intrări cu decimale/negative, editare/ștergere intrări, sumă + durată informativă
7. Bara de progres + pagina principală cu lista goalurilor grupate pe categorii
8. Notificări locale de confirmare (11:00 / 15:00 / 20:00) + inactivitate Tip B (7 zile)
9. Edge Functions: daily-reminder, inactivity-checker, notification-cleanup

### Faza 2 — Social
1. Activare flag `social_enabled`
2. Follow unidirectional, căutare după display name (+ username afișat)
3. Vizualizarea goalurilor publice ale userilor urmăriți
4. Milestone checker: Tip A (multiplu 10 / lună calendaristică), Tip B (10%)
5. Notificări de milestone către followeri
6. Felicitări cu cei 5 emoji + afișare lângă bară cu counter

---

## 14. Decizii finalizate

| # | Decizie | Alegere |
|---|---|---|
| 1 | Zile ratate Tip A | Confirmare în bloc (Da/Nu), reset la Nu |
| 2 | Backdating | Afirmație unică în bloc de la data X până azi |
| 3 | Goal activ vs abstinență | Tratament identic |
| 4 | Timeline Tip B | Informativ, nu blochează goalul |
| 5 | Unități custom | Text liber one-off (nu se salvează per user) |
| 6 | „Lună întreagă" la milestone | Dată calendaristică (start 5 apr → milestone 5 mai) |
| 7 | Milestone Tip B | La fiecare 10% din target |
| 8 | Milestone dacă sari pragul | Se declanșează la prima intrare care depășește pragul |
| 9 | Notificare milestone | Către toți followerii |
| 10 | Model social | Follow unidirectional (ca Instagram) |
| 11 | Emoji multiple aceeași zi | Distincte cu counter pe cele repetate (👍×3 ❤️×1) |
| 12 | Vizibilitate goal | Per goal, setată la creare, modificabilă ulterior |
| 13 | Autentificare | Email + parolă (social login opțional viitor) |
| 14 | Notificări zilnice | 11:00 + followup 15:00 și 20:00 dacă neconfirmat |
| 15 | Inactivitate Tip B | Notificare după 7 zile fără intrare |
| 16 | Eșec nedeclarat | Neutru — goalul nu se pierde |
| 17 | Reset Tip A | Șterge progresul și istoricul (nu arhivează) |
| 18 | Stack | Supabase pur (fără Railway) |
| 19 | Progres DB | Calculat live în VIEW, nu stocat denormalizat |
| 20 | Tabelele Faza 2 în DB | Create din prima migrare, implementate în cod în Faza 2 |
| 21 | Categorii | Fixe în DB cu slug, design mapat în frontend |
| 22 | Push tokens | Tabel separat `user_devices` (suportă multi-device) |
| 23 | Monetizare | Totul gratuit |
| 24 | Offline | Nu — necesită conexiune |
| 25 | Numele aplicației | Porto |

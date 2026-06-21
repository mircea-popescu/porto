# PRD — Porto (Habit & Goal Progression Tracker)

**Versiune:** 2.1
**Autor:** Mircea
**Data:** 17 iunie 2026 (actualizat 18 iunie 2026)
**Status:** Faza 1 (MVP single-player) completă pe `main`. Faza 2 (social) neîncepută. Vezi §13 pentru stare detaliată, scopuri și ce mai rămâne.

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
| Widget home-screen | iOS: `expo-widgets` (SwiftUI) · Android: `react-native-android-widget` (RemoteViews) |
| Build & livrare | EAS Build (APK pentru sideload / AAB pentru store) + EAS Update (OTA pentru schimbări JS) |

**Decizie:** Supabase pur, fără Railway. Supabase oferă auth, DB, realtime și cron într-un singur loc, fără servere de administrat.

**Decizie (livrare):** Build nativ prin EAS (managed workflow, fără directoare `android/`/`ios/`). Schimbările doar-JS se livrează **OTA** prin `eas update` (canalul `preview`), fără rebuild de ~20 min. `runtimeVersion` are politica `appVersion` — un update OTA ajunge doar la build-urile cu același `version` din `app.json`; orice bump de versiune cere un build nou.

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
├── src/widget/                 # widget home-screen, cross-platform (vezi §13.5)
│   ├── types.ts                # WidgetGoal / WidgetData (fără dependențe native)
│   ├── bridge.ts               # no-op (web / fallback)
│   ├── bridge.ios.tsx          # expo-widgets (SwiftUI) — rezolvat de Metro pe iOS
│   ├── bridge.android.tsx      # react-native-android-widget — rezolvat de Metro pe Android
│   ├── PortoWidgetAndroid.tsx  # layout-ul widget-ului Android
│   └── task-handler.tsx        # render headless al widget-ului Android (cerut de OS)
├── docs/
│   ├── PRD_Porto.md            # acest fișier
│   └── schema.html             # diagrama vizuală a schemei DB
├── .env.local                  # chei Supabase (nu se commitează)
├── .gitignore
├── index.js                    # entry point: expo-router + înregistrare task handler widget (Android)
├── app.json                    # config Expo (name: "Porto", slug: "porto") + plugins widget + updates OTA
├── eas.json                    # profile build EAS (development/preview/production) + env Supabase
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

## 13. Stare implementare, scopuri și ce mai rămâne

Această secțiune e sursa de adevăr pentru *ce face aplicația*, *de ce*, *ce e gata* și *ce mai trebuie ca să fie funcțională*. Restul PRD-ului (§1–§12) e specificația; aici e starea.

### 13.0 Scopul aplicației (de ce există)

Porto ajută userul să-și **formeze și mențină obiceiuri** prin trei mecanisme:
1. **Vizibilitate** — fiecare obicei e un goal cu bară de progres, ca userul să vadă dintr-o privire cât a avansat spre țintă.
2. **Ritual** — confirmarea zilnică (Tip A) sau adăugarea de valori (Tip B) transformă obiceiul într-o acțiune repetată conștient, care întărește comportamentul.
3. **Accountability social** (Faza 2) — prietenii văd goalurile publice, primesc notificări la milestone-uri și felicită cu emoji; recunoașterea de la alții e motivația care ține userul pe drum.

„Funcțional" are două praguri:
- **MVP single-player** (Faza 1): un user poate trăi întreg ciclul singur — cont → goal → progres → reminder. **Atins.**
- **Produs complet** (Faza 2): se adaugă stratul social. **Neînceput.**

### 13.1 Faza 1 — Core (MVP single-player) ✅ COMPLETĂ pe `main`

Fiecare task, cu *scopul* lui și ce livrează concret:

| # | Task | Scop (de ce) | Livrat | PR |
|---|---|---|---|---|
| 1 | Setup repo, Supabase, Expo | Fundația: un cod RN pentru iOS+Android, backend Supabase | Proiect Expo Router (`src/`), client Supabase | #1 |
| 2 | Migrări DB complete | Toată schema (inclusiv tabele Faza 2 + Ops) dintr-o dată, ca să nu mai atingi DB-ul | 8 migrări: enums, core, social, ops, view, RLS, seed, triggere auth | #1 |
| 3 | Autentificare email+parolă | Userul are identitate proprie, datele lui sunt izolate (RLS) | Sign-in / sign-up, sesiune, profil creat la signup | #1 |
| 4 | Creare goal | Userul își definește obiceiul: categorie, tip A/B, vizibilitate, dată start (+ backdating), target, unitate | Ecran `goal/new`, validări pe tip | #2 |
| 5 | Tip A — confirmare zilnică | Ritualul zilnic: confirmi azi, recuperezi zile ratate în bloc, resetezi la eșec, ștergi | Ecran `goal/[id]` cu acțiuni Tip A | #3 |
| 6 | Tip B — intrări valoare | Tracking cantitativ: adaugi/editezi/ștergi intrări (decimale + corecții negative), sumă live + durată informativă la atingerea targetului | `value-entries.tsx` + funcții în `goals.ts` | #4 |
| 7 | Bară progres + home | Vizibilitatea: lista goalurilor grupate pe categorii, fiecare cu bara lui | Tab home, `ProgressBar`, grupare pe categorii | #3 |
| 8 | Notificări **locale** | Reminder pe device fără server: confirmare Tip A (11/15/20) + inactivitate Tip B | `lib/notifications.ts`, programare la deschiderea app-ului | #3 |
| 9 | Edge Functions (server-side) | Worker-e care trimit push **remote** și fac curățenie, independent de app | `daily-reminder`, `inactivity-checker`, `notification-cleanup` + cron jobs | #5 |

**Concluzie Faza 1:** pe un device real, un user poate parcurge tot fluxul single-player, iar notificările **locale** funcționează. Vezi totuși gap-ul de la §13.2.

### 13.2 Înregistrare push token — ✅ REZOLVAT

Edge Functions-urile din pasul 9 trimit push către token-urile din tabelul `user_devices`. Acest gap e acum închis: la stabilirea sesiunii, `src/lib/push.ts` (`registerForPushNotifications`) cere permisiunea de notificări, ia Expo push token-ul și face upsert în `user_devices` (cu `platform`, `is_active`, `last_seen_at`). Apelul e declanșat din `src/context/auth.tsx`.

- Notificările **locale** (programate pe device) — **merg**.
- Notificările **remote** (daily-reminder, inactivity, milestone social) — pipeline-ul e funcțional cap-coadă (token-uri înregistrate).

**Notă de robustețe (RN):** apelurile Supabase auth declanșate din `onAuthStateChange` / `getSession` se amână cu `setTimeout(0)` și `registerForPushNotifications` primește `userId` din sesiune (nu apelează `supabase.auth.getUser()`), ca să nu re-intre în lock-ul de auth — altfel sesiunea nu se rezolvă la redeschiderea app-ului (loading infinit).

### 13.3 Faza 2 — Social (neîncepută)

Tabelele (`follows`, `emoji_reactions`) și ENUM-urile există deja în DB din migrarea #1 — rămâne **doar codul**. Înainte de orice task, verifică flag-ul `social_enabled` (§12).

| # | Task | Scop (de ce) |
|---|---|---|
| 1 | Activare `social_enabled` + **înregistrare push token** în `user_devices` la login | Pornește stratul social; fără token, niciun push remote nu pleacă (vezi §13.2) |
| 2 | Follow unidirectional + căutare după display name (cu username afișat) | Userul își găsește și urmărește prietenii (model Instagram) |
| 3 | Vizualizarea goalurilor publice ale userilor urmăriți | Vezi progresul prietenilor — baza accountability-ului |
| 4 | Felicitări cu cei 5 emoji + afișare lângă bară cu counter | Recunoașterea socială vizibilă pentru owner (👍×3 ❤️×1) |
| 5 | Milestone checker (Edge Function, cron 15 min): Tip A (multiplu 10 / lună calendaristică), Tip B (10%) | Detectează automat reușitele, cu dedup prin `milestones_sent` |
| 6 | Notificări de milestone către followeri (`friend_milestone`), deep-link în goal-ul prietenului | Închide bucla: prietenul atinge un prag → tu afli → îl feliciți |

**Decizii de arhitectură Faza 2 (confirmate):**
- Milestone-checker = cron periodic la 15 min (consistent cu infra Faza 1).
- Înregistrarea push token în `user_devices` e precondiție pentru toate push-urile.
- Milestone „lună întreagă" Tip A = dată calendaristică pură (`started_at + N luni`).

### 13.5 Widget home-screen + livrare OTA — ✅ IMPLEMENTAT

Widget 2×4 (medium) cu progresul a maximum 3 goaluri alese de user, fără să deschidă app-ul. Tap pe un rând → deep link `porto://goal/{id}` → ecranul de detaliu.

**Arhitectură cross-platform (Metro platform-files).** Un bridge uniform expune `pushWidgetData` / `reloadWidget`, iar Metro alege automat fișierul per platformă, deci Android nu importă niciodată module iOS și invers:
- `bridge.ios.tsx` → `expo-widgets` (SwiftUI, App Group `group.app.porto.habit`).
- `bridge.android.tsx` → `react-native-android-widget` (RemoteViews); `PortoWidgetAndroid.tsx` e layout-ul, `task-handler.tsx` îl randează headless la cererea OS-ului.
- Datele se scriu în AsyncStorage (`@porto/widget_data`) ca task handler-ul Android să le citească fără rețea/auth. Configurarea goalurilor: `src/app/widget-settings.tsx`.

**Decizii / capcane rezolvate (Android):**
- **Crash la pornire** — `@expo/ui` (SDK 55) e incompatibil binar cu expo-modules-core (SDK 54); exclus din autolinking Android prin `package.json` → `expo.autolinking.android.exclude`. E folosit doar pe iOS, deci Metro nu-l include pe Android.
- **Widget invizibil** — React Compiler (`experiments.reactCompiler`) împachetează componentele, dar `react-native-android-widget` apelează funcțiile componente direct. Fix: directiva `"use no memo";` în fișierele widget Android.

**Livrare:** prima dată build complet EAS; ulterior schimbările doar-JS (inclusiv layout widget) merg **OTA** prin `eas update --branch preview` (vezi §8).

### 13.4 Ce mai trebuie ca aplicația să fie complet funcțională (rezumat)

1. **Înregistrarea push token** (§13.2) — ✅ rezolvat; push-urile remote din Faza 1 au token-uri.
2. **Faza 2 integrală** (§13.3, 6 task-uri) — pentru produsul social complet.
3. **Deploy + cron** pe proiectul cloud — `supabase functions deploy` + programarea cron (vezi `supabase/functions/README.md` și migrarea `20240618000001_cron_jobs.sql`).

> Notă de structură: codul real e în `src/app/` (Expo Router), nu `app/` cum arată schița din §10 — folderele `lib/`/`components/`/`types/` nu pot sta în interiorul folderului de rute. Aliasul `@/` → `src/`.

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
| 26 | Widget cross-platform | Un bridge uniform + Metro platform-files (iOS `expo-widgets`, Android `react-native-android-widget`) |
| 27 | Livrare nativă | EAS Build (managed); APK pentru sideload (`preview`), AAB pentru store (`production`) |
| 28 | Update-uri JS | OTA prin EAS Update; `runtimeVersion` = `appVersion` |
| 29 | `@expo/ui` pe Android | Exclus din autolinking (incompatibil binar SDK 55 vs 54); doar iOS |
| 30 | React Compiler + widget Android | `"use no memo";` în fișierele widget (biblioteca cere funcții raw) |

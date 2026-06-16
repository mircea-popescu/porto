# PRD — Porto (Habit & Goal Progression Tracker)

**Versiune:** 1.1
**Autor:** Mircea
**Data:** 16 iunie 2026
**Status:** Gata pentru implementare în Claude Code

---

## 1. Rezumat

Aplicație mobilă (iOS + Android) pentru urmărirea și menținerea obiceiurilor bune. Userul își definește goaluri cu un orizont de timp și o bară de progres, le grupează pe categorii, și le actualizează fie prin confirmare zilnică, fie prin adăugarea de valori. O componentă socială permite urmărirea altor useri, vizualizarea goalurilor lor publice, notificări la atingerea milestone-urilor și felicitări cu emoji.

### Obiective
- Userul vede dintr-o privire cât a progresat la fiecare goal.
- Confirmarea zilnică creează un ritual care întărește obiceiul.
- Componenta socială adaugă accountability și motivație prin recunoaștere de la prieteni.

### Non-obiective (out of scope v1)
- Monetizare / abonamente (totul gratis).
- Funcționare offline (aplicația cere conexiune).
- Mesagerie directă între useri / comentarii.
- Moderare de conținut avansată, feed-uri algoritmice.

---

## 2. Concepte de bază

### 2.1 Goal (obiectiv)
Un goal are: titlu, categorie, tip, vizibilitate (public/privat), dată de start (poate fi în trecut), orizont/target, și progres curent.

**Categorii** (extensibile): Sănătate, Educație, Sport, Finanțe, Altele. Userul alege o categorie la creare.

### 2.2 Tipuri de goal

**Tip A — Daily (confirmare zilnică, auto-increment cu 1)**
- Exemplu: „100 de zile fără fumat", „citește 30 min/zi 60 de zile".
- Target = număr de zile. Progres = zile confirmate.
- Bara se umple proporțional: ziua 30 din 100 → 30%.
- Nu se distinge între goal „activ" (faci ceva) și „pasiv/abstinență" (eviți ceva) — tratament identic.
- Incrementarea cu 1/zi are loc **doar după confirmare activă** a userului.

**Tip B — Value (incrementat de user, unitate liberă)**
- Exemplu: „aleargă 1000 km", „economisește 5000 lei".
- Target = valoare numerică + unitate (text liber, ex. „km", „lei", „pagini"). Userul poate crea orice unitate.
- Progres = suma intrărilor. Acceptă **decimale** (8.3) și **valori negative / corecții**.
- Userul poate **edita sau șterge** intrări individuale.
- Are și un orizont de timp **informativ**: se salvează în câte zile a fost atins targetul (ex. „1000 km în 403 zile"), dar **nu** blochează/expiră goalul. Atingerea targetului = suma ≥ target, indiferent de timp.

### 2.3 Bara de progres
- Tip A: `zile_confirmate / target_zile`.
- Tip B: `suma_intrari / target_valoare` (poate depăși 100%).
- Lângă bară pot apărea emoji de felicitare primite în ziua curentă (vezi §5.3).

---

## 3. Logica de tracking

### 3.1 Goaluri Tip A — confirmare zilnică

**Confirmarea normală**
- În fiecare zi userul confirmă că s-a ținut de goal → progresul crește cu 1 zi.

**Start în trecut (backdating)**
- La creare, userul poate seta o dată de start anterioară (ex. „m-am lăsat de fumat în aprilie").
- Userul declară printr-o **afirmație unică în bloc** „m-am ținut de la data X până azi", iar progresul inițial = numărul de zile dintre data de start și azi.

**Zile ratate (nu a deschis aplicația / nu a confirmat)**
- Lipsa confirmării e **neutră**: goalul NU se pierde, doar nu se incrementează acele zile.
- Când userul revine, i se cere să confirme retroactiv perioada ratată.

**Confirmarea în bloc a perioadei ratate**
- Userul confirmă în bloc: „m-am ținut toată perioada?" (Da / Nu).
- **Dacă DA:** toate zilele ratate se adaugă la progres.
- **Dacă NU (a eșuat măcar o zi):** by default **trackerul se resetează la 0** și reîncepe de azi.
  - *Notă: confirmarea „am eșuat o zi" e echivalentă cu reset. Nu există „pierd doar o zi". La reset, progresul revine la 0 și istoricul vechi se șterge (nu se arhivează).*

**Eșec declarat activ**
- Dacă userul confirmă activ că a eșuat (ex. „azi am fumat"), goalul se **resetează la 0**.
- Dacă userul **nu spune nimic**, nu pierde goalul (neutru).

**Ștergere**
- Userul poate șterge oricând un tracker.

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

### 4.2 Efect
- La atingerea unui milestone de către un user urmărit, **toți followerii** primesc o notificare de felicitare (vezi §5).

---

## 5. Componenta socială

### 5.1 Model de relație
- **Follow unidirecțional** (ca Instagram): userul A poate urmări userul B fără reciprocitate.
- Ca să vezi goalurile publice ale unui user, **trebuie să-l urmărești**.
- Goalurile private nu sunt vizibile nimănui în afară de owner.

### 5.2 Cont, profil, căutare
- **Username unic** (folosit pentru dezambiguizare) + **display name** (poate fi duplicat).
- Căutarea se face **după display name**, dar rezultatele arată și username-ul (ca să distingi între doi „Andrei Popescu").
- Vizibilitatea se setează **per goal** la creare și se poate **modifica** ulterior.

### 5.3 Felicitări (emoji)
- Cei **5 emoji** posibili: 👍 (thumbs up), ❤️ (inimă), 💪 (muscle), 🥂 (cheers), 🎉 (tada).
- **Flux:** primești notificare „Andrei a atins 100 de zile la «zile fără fumat». Felicită-l!" → tap pe notificare → ajungi direct în view-ul acelui tracker al lui Andrei → alegi unul din cei 5 emoji.
- Poți felicita și fără notificare, **oricând** vizitezi profilul/trackerul unui prieten.
- Emoji-ul primit apare lângă bara de progres a destinatarului **în ziua respectivă**.
- Dacă mai mulți prieteni felicită în aceeași zi, afișăm **emoji-urile distincte, cu counter pe cele repetate** (ex. 👍×3 ❤️×1).

---

## 6. Notificări

### 6.1 Confirmare zilnică (Tip A)
- **11:00** — notificare: „Intră să-ți confirmi goalurile de azi."
- Dacă userul **nu intră** sau intră și **nu confirmă toate** goalurile Tip A → reminder la **15:00** și **20:00**.
- O singură notificare grupează toate goalurile Tip A nerezolvate.

### 6.2 Inactivitate (Tip B)
- Dacă au trecut **7 zile** de la ultima intrare la un goal Tip B → notificare: „Hei, nu uita de targetul tău «1000 km»!"

### 6.3 Milestone social
- La atingerea unui milestone de către un user urmărit → notificare de felicitare către followeri (vezi §5.3).

---

## 7. Autentificare
- **Email + parolă** ca metodă principală (cea mai simplă).
- Opțional: Sign in with Apple + Google (dacă se adaugă social login, Apple îl cere obligatoriu pe iOS — gestionat de furnizorul de auth).

---

## 8. Stack tehnic (decis)

| Componentă | Tehnologie |
|---|---|
| Frontend mobil | React Native (Expo) — un cod pt iOS + Android |
| Auth + DB + realtime | Supabase (Postgres, Auth, Realtime) |
| Cron / push worker | Supabase Edge Functions (cu scheduling) |
| Push notifications | Expo Push Notifications |

**Decizie:** Supabase pur, fără Railway. Pentru o aplicație nouă, Supabase oferă auth, DB, realtime și cron într-un singur loc, fără servere de administrat. Railway (folosit anterior pentru proiecte web) ar adăuga o piesă de întreținut fără beneficiu aici.

---

## 9. Faze de implementare

### Faza 1 — Core (MVP funcțional, single-player)
- Cont (email+parolă) + profil (username, display name).
- Creare goal: categorie, tip (A/B), vizibilitate, dată start (inclusiv backdating), target/orizont.
- Tip A: confirmare zilnică, recuperare zile ratate (confirmare în bloc), reset la eșec, ștergere.
- Tip B: intrări cu decimale/negative, editare/ștergere intrări, sumă + durată informativă.
- Bară de progres + pagina principală cu lista goalurilor pe categorii.
- Notificări locale de confirmare (11/15/20) + inactivitate Tip B (7 zile).

### Faza 2 — Social
- Follow unidirecțional, căutare după display name (+ username afișat).
- Vizualizarea goalurilor publice ale userilor urmăriți.
- Milestone-uri (Tip A: multiplu 10 / lună; Tip B: 10%) + notificări de milestone către followeri.
- Felicitări cu cei 5 emoji + afișarea lor lângă bară.

---

## 10. Decizii finalizate (foste întrebări deschise)
1. **Backdating Tip A:** confirmarea inițială „m-am ținut de la X până azi" e o singură afirmație în bloc. ✓
2. **„Lună întreagă" la milestone:** dată calendaristică (start 5 apr → milestone 5 mai). ✓
3. **Emoji multiple în aceeași zi:** distincte + counter pe cele repetate. ✓
4. **Reset Tip A:** progresul revine la 0 și istoricul se șterge. ✓
5. **Stack:** Supabase pur (fără Railway). ✓
6. **Numele aplicației:** Porto. ✓

---

## 11. Numele aplicației

**Porto** — ales pentru sonoritate caldă și memorabilă. Nu se vizează profit sau scalare la nivel de produs comercial major; aplicația e un proiect personal/side project.

- **Bundle ID (iOS):** `app.porto.habit`
- **Application ID (Android):** `app.porto.habit`
- **Supabase project slug:** `porto-habit`
- **Repo name:** `porto`

---

## 12. Structura repository

Un singur repo (monorepo). Codul de backend (migrări SQL + Edge Functions) trăiește lângă app — mai simplu de întreținut pentru un singur developer, tipurile TypeScript rămân în sync cu schema DB.

```
porto/
├── app/                        # codul Expo / React Native
│   ├── (tabs)/                 # ecranele principale (home, search, profile)
│   ├── components/             # componente reutilizabile (ProgressBar, GoalCard, etc.)
│   ├── lib/                    # client Supabase, helpers, utils
│   └── types/                  # tipuri TypeScript (generate din schema Supabase)
├── supabase/
│   ├── migrations/             # schema DB versionată (SQL) — NU modifica tabelele direct din dashboard
│   └── functions/              # Edge Functions (cron notificări la 11/15/20, milestone worker, inactivitate Tip B)
├── docs/
│   └── PRD.md                  # acest fișier
├── app.json                    # config Expo (name: "Porto", slug: "porto")
├── package.json
└── README.md
```

---

## 13. Setup inițial (pași pentru Claude Code)

Urmează pașii în ordine. Nu sări peste `supabase init` — migrările trebuie versionate de la primul commit.

### Pasul 1 — Creează proiectul Expo
```bash
npx create-expo-app@latest porto --template blank-typescript
cd porto
```

### Pasul 2 — Inițializează Git și conectează la GitHub
```bash
git init
git add .
git commit -m "chore: init expo project"
# creează repo gol pe GitHub cu numele `porto`, apoi:
git remote add origin https://github.com/<username>/porto.git
git push -u origin main
```

### Pasul 3 — Inițializează Supabase local
```bash
npx supabase init
# creează folderul supabase/ cu structura de bază
```

### Pasul 4 — Leagă proiectul de Supabase Cloud
```bash
npx supabase login
npx supabase link --project-ref <project-ref-din-dashboard>
```

### Pasul 5 — Instalează dependențele de bază
```bash
npx expo install @supabase/supabase-js
npx expo install expo-notifications
npx expo install expo-secure-store
npx expo install @react-navigation/native @react-navigation/bottom-tabs
npx expo install react-native-safe-area-context react-native-screens
```

### Pasul 6 — Creează `app/lib/supabase.ts`
```typescript
import { createClient } from '@supabase/supabase-js'
import * as SecureStore from 'expo-secure-store'

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: SecureStore,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})
```

### Pasul 7 — Adaugă `.env.local` (nu îl commit!)
```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

Adaugă `.env.local` în `.gitignore`.

### Pasul 8 — Commit structura finală
```bash
git add .
git commit -m "chore: add supabase init, deps, and project structure"
git push
```

---

## 14. Convenții de cod (pentru Claude Code)

- **Limbă:** TypeScript strict (`"strict": true` în tsconfig).
- **Stilul componentelor:** functional components + hooks, fără class components.
- **Supabase types:** generate automat cu `npx supabase gen types typescript --local > app/types/database.ts` după fiecare migrare nouă. Nu scrie tipurile manual.
- **Migrări:** orice modificare de schemă = fișier nou în `supabase/migrations/`. Nu modifica migrările existente.
- **Edge Functions:** un fișier per funcție în `supabase/functions/<nume>/index.ts`.
- **Notificări push:** toate apelurile de schedulare trec prin `app/lib/notifications.ts` (un singur loc).
- **Variabile de mediu:** toate variabilele publice încep cu `EXPO_PUBLIC_`. Secretele (service role key etc.) doar în Edge Functions, niciodată în app.

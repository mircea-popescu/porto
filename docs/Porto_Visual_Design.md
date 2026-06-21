# Porto — Visual Design Reference & Soft-Revamp Brief

> **Purpose of this file.** A self-contained handoff for a *new chat* focused on a
> **soft visual revamp** of Porto — refreshing colors, typography, spacing, iconography,
> the app logo, the splash, and the widget look **without touching core components**
> (data layer, navigation, auth, business logic). It documents every screen, the design
> system, the widget, and the current logo/icon as they exist today, plus the known
> visual inconsistencies that are the natural revamp targets.

---

## 0. How to use this document

- **Sections 1–6** describe the *current* state (ground truth, read from the code).
- **Section 7** lists concrete visual inconsistencies (the "why a revamp helps" list).
- **Section 8** defines the **soft-revamp guardrails**: what is safe to restyle vs. what
  counts as a "core component" and must not be touched.
- **Section 9** offers optional revamp directions to react to — not prescriptive.

When in doubt: *change tokens and styles, not structure, props, navigation, or data flow.*

---

## 1. Project context

- **App:** Porto — a habit / goal tracker (Romanian-language UI). Daily-confirmation
  goals ("Tip A": X days) and value goals ("Tip B": reach a numeric target). Plus a light
  social layer (follow users, see public goals, send emoji congratulations) and a
  home-screen widget showing up to 3 goals.
- **Stack:** Expo SDK 54 (managed), React Native 0.81.5, Expo Router (file-based),
  TypeScript, Supabase backend. React Compiler is **on** (`experiments.reactCompiler`).
- **Platforms:** Android-first (current focus), iOS supported, web builds.
- **Where the visual code lives:**
  - Design tokens → `src/constants/theme.ts`
  - Category colors/icons → `src/constants/categories.ts`
  - Shared UI primitives → `src/components/ui.tsx`, `src/components/progress-bar.tsx`
  - Screens → `src/app/**` (Expo Router routes)
  - Widget UI → `src/widget/PortoWidgetAndroid.tsx` (Android), `src/widget/bridge.ios.tsx` (iOS)
  - Icon / splash / adaptive icon → `assets/images/**`, `assets/expo.icon/**`, `app.json`
- **Fonts loaded** (`src/app/_layout.tsx`, via `@expo-google-fonts`):
  `Fraunces_600SemiBold` (serif display), `Inter_400Regular`, `Inter_500Medium`,
  `Inter_600SemiBold` (sans UI).

---

## 2. Design system / tokens — `src/constants/theme.ts`

The current system is named **"Calm & Premium" (light-first, v1)**. Every screen is meant
to consume these tokens — no hardcoded hex per screen (a few screens violate this; see §7).

### 2.1 Palette (`palette`)

| Token | Hex | Role |
|---|---|---|
| `bg` | `#FBFAF8` | App background — warm off-white |
| `surface` | `#FFFFFF` | Cards, inputs, raised surfaces |
| `surface2` | `#F4F2EE` | Subtle fills (track, segmented control, pills) |
| `line` | `#ECE9E3` | Hairline borders / separators |
| `ink` | `#1A1A18` | Primary text (near-black, warm) |
| `ink2` | `#56544E` | Secondary text |
| `ink3` | `#8B887F` | Tertiary / muted text, eyebrows |
| `ink4` | `#B5B2A8` | Faint text, placeholders, disabled icons |
| `accent` | `#3D4EAD` | **Primary accent — deep indigo** (buttons, active states, links) |
| `accentSoft` | `#EAECF7` | Accent tint (avatar bg, selected pickers) |
| `accentInk` | `#2C3A8A` | Text on accent-soft |
| `ok` | `#2F7A56` | Success (confirm, reached target) |
| `okSoft` | `#E5F0EA` | Success tint (confirmed-day card) |
| `danger` | `#B4453A` | Destructive (delete, reset, errors) |

> **The brand color in-app is a deep, slightly desaturated indigo `#3D4EAD` on a warm
> off-white.** Calm, editorial, premium. (Note: this is NOT the blue used by the app
> icon / splash / a couple of stray screens — see §7.)

### 2.2 Radius (`radius`)
`card: 18`, `btn: 14`, `input: 12`, `pill: 999`.

### 2.3 Shadows (`shadow`) — subtle, replace heavy borders
- `sm` — barely-there lift (cards, inputs): y1, opacity .04, radius 2, elevation 1.
- `md` — y6, opacity .06, radius 20, elevation 3.
- `lg` — y16, opacity .10, radius 40, elevation 8.
- `accentBtn` — indigo-tinted glow under the primary button: color `#3D4EAD`, y4,
  opacity .28, radius 14, elevation 4.

### 2.4 Typography (`font`)
- `serif: 'Fraunces_600SemiBold'` — display: screen titles, brand wordmark, big % numbers,
  avatar initials. Editorial, high-contrast.
- `sans: 'Inter_400Regular'` — body.
- `sansMedium: 'Inter_500Medium'` — meta, values.
- `sansSemibold: 'Inter_600SemiBold'` — buttons, labels, eyebrows, card titles.

**Type roles observed:** Eyebrow = 11px Inter-SemiBold, uppercase, letter-spacing .88,
`ink3`. Screen title = 26px Fraunces. Detail screen big % = 34px Fraunces. Brand (sign-in) =
44px Fraunces. Card title = 16px Inter-SemiBold.

### 2.5 Spacing
`space = { screen: 18, screenLg: 24, gap: 12 }`. There is also a legacy `Spacing` scale
(half…six) and legacy `Colors`/`Fonts` (light/dark) at the top of `theme.ts` from the Expo
template — **largely unused by the actual screens**; the app forces light mode.

### 2.6 Category styling — `src/constants/categories.ts`
Slug → `{ color, tint (~13% alpha), Ionicon }`. Drives the colored dot, section header,
percentage, and progress-bar fill on goal cards.

| Slug | Color | Icon |
|---|---|---|
| `sanatate` (health) | `#3F8A6E` green | `heart` |
| `educatie` (education) | `#5C5BC4` violet | `book` |
| `sport` | `#C76B3F` terracotta | `barbell` |
| `finante` (finance) | `#B08428` ochre | `cash` |
| `altele` (other) | `#7C7A72` warm gray | `ellipsis-horizontal` |
| *(fallback)* | `accent` indigo | `flag` |

These 5 hues are muted/curated and harmonize with the indigo accent — a good base to keep.

---

## 3. Shared UI primitives

### 3.1 `src/components/ui.tsx`
- **`Eyebrow`** — small uppercase muted label above titles.
- **`ScreenTitle`** — Fraunces 26px title.
- **`ScreenHeader`** — Eyebrow + ScreenTitle stack.
- **`Card`** — `surface` bg, `radius.card` (18), padding 18, 1px `line` border, `shadow.sm`.
- **`Button`** — variants:
  - `primary` — indigo fill, white text, `accentBtn` glow, pressed scales to .985.
  - `success` — green (`ok`) fill, white text.
  - `ghost` — white surface, `line` border, `shadow.sm`, ink text.
  - `dangerOutline` — white surface, `danger` border + text.
  - `dangerText` — borderless centered danger text.
  - `linkDiscreet` — faint underlined `ink4` link text.
  - base button: `radius.btn` (14), paddingVertical 15, centered; loading → ActivityIndicator.
- **`Avatar`** — circle, `accentSoft` bg, Fraunces initial in `accentInk`, size-driven.

### 3.2 `src/components/progress-bar.tsx`
Track = `surface2`, fully rounded (`pill`), fill = passed `color` (defaults to accent),
clamped 0–100%. Heights: 9 (cards) / 11 (detail).

These primitives are the visual backbone — restyling them propagates everywhere (see §8).

---

## 4. Screen-by-screen design

> Layout convention across the app: warm `bg` screens; content padded 18 (or 24 on
> auth/profile); SafeArea-aware top/bottom; bottom padding ~96 to clear the floating tab
> bar; loading states are a centered large `accent` ActivityIndicator.

### 4.1 Transitional index — `src/app/index.tsx`
Just a centered indigo spinner on `bg` while the session resolves, then `RootNavigator`
redirects to `(auth)` or `(tabs)`.

### 4.2 Auth — `src/app/(auth)/sign-in.tsx`
Vertically centered. **"Porto" wordmark in 44px Fraunces**, subtitle "Bine ai revenit"
(15px medium, `ink3`). Two inputs (email, password) — white surface, `line` border,
`radius.input`, `shadow.sm`, 14px padding. Primary button "Intră în cont". Footer link
"Creează unul" in accent. `KeyboardAvoidingView`.

### 4.3 Auth — `src/app/(auth)/sign-up.tsx`
Same input style, in a `ScrollView`. Title "Creează cont" (30px Fraunces). Fields: email,
display name, username (lowercased, validated `^[a-z0-9_]{3,30}$`), password. Validation via
native `Alert`. Footer link to sign-in.

### 4.4 Tab bar — `src/app/(tabs)/_layout.tsx`
3 tabs: **Acasă** (home), **Caută** (search), **Profil** (person). Floating bar:
`position:absolute`, height 72, hairline top border (`line`), `elevation:0`. Background is a
`BlurView` — **iOS only** (`intensity 40`); on Android intensity 0 with a 90%-white overlay
(`rgba(255,255,255,0.9)`). Active tint = accent, inactive = `ink4`. Labels 10px Inter-SemiBold.

### 4.5 Home — `src/app/(tabs)/index.tsx`
- Header: Eyebrow `Salut, {first name}` + ScreenTitle "Obiceiurile tale", with an `Avatar`
  on the right.
- Primary button **"+ Goal nou"** → `/goal/new` (modal).
- Goals grouped **by category**; each group has a header (tinted square Ionicon + colored
  category name) then **GoalCard**s.
- **GoalCard**: `Card` with title (1 line) + colored % (Fraunces 22px), progress bar in the
  category color, and a detail line (`X / Y zile` or `progress / target unit`).
- Empty state: centered muted text. 
- Pull-to-refresh (accent tint).
- **Error/retry state (recent):** on load failure, a centered `cloud-offline-outline` icon,
  a muted message, the raw error text (12px, `ink4`, selectable), and a "Reîncearcă" button.

### 4.6 Search — `src/app/(tabs)/search.tsx`
Header Eyebrow "Comunitate" + title "Caută prieteni". Search row = input + square accent
search button (`accentBtn` glow, white search icon). `FlatList` of **UserRow** cards (Avatar
+ display name + `@username` + chevron). Section label toggles "Rezultate" / "Urmăriți".
Empty + searching states present.

### 4.7 Profile — `src/app/(tabs)/profile.tsx`
Header Eyebrow "Contul tău" + title "Profil". Large centered `Avatar` (84). A `Card` with 3
**Field** rows (uppercase label + value): display name, `@username`, email. Then a `ghost`
button **"Configurează widget"** → `/widget-settings`, and a `dangerOutline`
**"Deconectează-te"**.

### 4.8 Goal detail — `src/app/goal/[id].tsx`
- Top bar: back chevron only (no header bar).
- Header: category Eyebrow (in category color) + title (26px Fraunces).
- **Progress block**: big % (34px Fraunces, category color) + target label on the baseline;
  11px-tall progress bar; "🎯 Target atins în N zile" for completed value goals; emoji
  reactions (read-only) if the goal is public.
- **Daily (Tip A) actions** (`DailyActions`): 
  - Unconfirmed gap → a `Card` "Perioadă neconfirmată" with two buttons:
    "Da, m-am ținut" (success) / "Nu, am ratat" (dangerOutline).
  - Today confirmed → an `okSoft` card "✓ Ai confirmat ziua de azi".
  - Else → success button "Confirmă ziua de azi".
  - Always a discreet link "Am eșuat — resetează trackerul".
- **Value (Tip B)** → the `ValueEntries` component.
- A **visibility row** (Public switch, accent track) above a top hairline.
- Bottom: `dangerText` "Șterge goalul".

### 4.9 New goal — `src/app/goal/new.tsx` (presented as a **modal**)
- Top bar with an `×` close. Header Eyebrow "Obicei nou" + title "Goal nou".
- **Field** wrapper (uppercase label + control). Controls:
  - Title input.
  - **Category chips** (`chipRow`): pill chips, active = accent fill + white text.
  - **Type segmented control** (`segment`): `surface2` track with a raised white active
    segment (`shadow.sm`), active text in accent. Options "Zilnic (confirmare)" / "Valoare".
  - Tip A → "Câte zile" number input. Tip B → target value + **unit chips** (incl.
    "Custom…" → free text).
  - **DateField** (start date; platform date picker).
  - **SwitchRow**s (label + hint + Switch, accent track): backfill (only if backdated daily)
    and "Public".
  - Primary "Creează goalul".

### 4.10 Value entries — `src/components/value-entries.tsx` (inside Tip B detail)
Add/edit inline **form** on a `surface2` card (value input, DateField, optional note, with
ghost "Anulează" + primary save). Entry list rows: signed value (16px semibold) + meta
(date · note), with plain text **"Editează"** (accent) and **"Șterge"** (danger) actions and
a bottom hairline. Empty = muted "Nicio intrare încă."

### 4.11 Widget settings — `src/app/widget-settings.tsx`
> **This screen is the visual outlier.** It is the only one shown with a **header bar**
> (`headerShown: true`, title "Widget") and it **hardcodes a slate/blue palette** instead of
> the design tokens:
> - hint/meta text `#64748b`, titles `#0f172a`, borders `#e2e8f0`, white cards;
> - selected row → blue border `#2563eb` on `#eff6ff` tint;
> - order **badge** and **Save** button → solid blue `#2563eb`.
>
> Functionally: pick up to 3 goals (selection order = widget order, shown as a numbered
> badge), each row has a category color dot, title, and `progress/target · %`. "Salvează"
> persists + syncs the widget. **Prime soft-revamp target — re-tokenize to indigo/warm.**

### 4.12 User profile — `src/app/user/[id].tsx`
Back chevron; centered Avatar (84) + display name (24px Fraunces) + `@username`. A
follow/unfollow button (`primary` when not following, `ghost` when following). If not
following → locked message; else a "Goaluri publice" section of **FriendGoalCard**s
(like GoalCard but % is always plain `accent`, not category color).

### 4.13 Friend goal view — `src/app/user/[id]/goal/[goalId].tsx`
Read-only goal: back chevron, title, progress block (big % in **accent**, 11px bar), "🎯"
line for completed value goals, then a **"Felicită-l"** Eyebrow + the emoji **picker**
(`EmojiReactions canReact`).

### 4.14 Emoji reactions — `src/components/emoji-reactions.tsx`
- **Counts**: pill chips (`surface2`) showing each emoji + `×N` if >1.
- **Picker** (when `canReact`): 5 round 52×52 buttons (`line` border, white); selected =
  accent border + `accentSoft` fill. Emoji set comes from `EMOJI_LIST` in `lib/social`.

---

## 5. Home-screen widget

Two native implementations behind one bridge (`src/widget/bridge.*`); both render up to 3
goals, deep-link `porto://goal/{id}` on tap, and read cached data so they work without the
app open. **Configured in `app.json`** (Android: `react-native-android-widget`, 4×2 cells,
min 250×110dp, 30-min refresh; iOS: `expo-widgets`, `systemMedium`).

### 5.1 Android — `src/widget/PortoWidgetAndroid.tsx`
Hardcoded **slate** palette (RemoteViews can't use the JS theme):
`BG #ffffff`, `TITLE #0f172a`, `MUTED #64748b`, `TRACK #e2e8f0`. Layout: white card, padding
14; "PORTO" label (12px bold, muted); each goal row = title (semibold, slate) + % (bold, in
**category color**), a 6px progress bar (category color fill on slate track, built from flex
weights since RemoteViews has no border-radius → **square corners**), and a detail line
(11px muted). Empty → "Deschide Porto și configurează widget-ul din profil."

### 5.2 iOS — `src/widget/bridge.ios.tsx`
SwiftUI via `@expo/ui/swift-ui`: same structure ("PORTO" header, title + % in category
color, `ProgressView`, detail line), title color `#0f172a`. Uses the system rounded
`ProgressView` (so it picks up iOS styling).

> **Revamp note:** the widget uses a cool slate/white identity with square progress bars,
> not the warm-off-white + indigo + rounded look of the app. Aligning it is a soft-revamp
> target — but mind the constraint that Android RemoteViews can't round corners and can't
> read JS tokens (values must be hardcoded in the widget file).

---

## 6. App logo, icon & splash

> **Finding: the app currently ships the default Expo template icon, not a custom Porto
> brand.** The mark is the Expo "A"/upward-chevron on a blue blueprint-grid background.

- **Main icon** — `assets/images/icon.png`: a soft glossy **light-blue chevron/“A”** mark
  centered on a **royal-blue gradient** with a faint blueprint **grid + sparkles**. Classic
  Expo placeholder aesthetic.
- **iOS icon** — `app.json` points iOS at `./assets/expo.icon` (the `.icon` bundle in
  `assets/expo.icon/`, containing `expo-symbol` SVG + `grid.png`) — again the Expo symbol.
- **Android adaptive icon** (`app.json` → `android.adaptiveIcon`):
  - `foregroundImage`: `android-icon-foreground.png` — the **blue chevron** mark on transparent.
  - `backgroundColor`: **`#E6F4FE`** (very light sky blue) + `backgroundImage`
    `android-icon-background.png`.
  - `monochromeImage`: present (themed-icon support).
- **Splash** (`app.json` → `expo-splash-screen`): `backgroundColor` **`#208AEF`** (bright
  blue); `splash-icon.png` is a **white** version of the mark, shown at `imageWidth: 76`.
- **Favicon (web):** `assets/images/favicon.png`.

> **Brand mismatch:** icon/splash blues (`#208AEF`, `#E6F4FE`, `#2563eb`) are sky/royal
> blue, while the in-app brand is **deep indigo `#3D4EAD` on warm off-white `#FBFAF8`**.
> A real Porto logo + a splash/adaptive-icon palette that matches the indigo/warm system is
> the single highest-impact item of a visual revamp.
>
> Other unused brand-ish assets in `assets/images/`: `logo-glow.png`, `react-logo*.png`,
> `expo-logo.png`, `expo-badge*.png`, `tabIcons/*` (template leftovers — ignore/clean up).

---

## 7. Known visual inconsistencies (revamp targets)

1. **No real logo.** App icon, iOS icon, adaptive icon, and splash are all the **default
   Expo placeholder** (blue chevron + blueprint grid). → Design a Porto wordmark/symbol.
2. **Two color identities.** In-app = warm off-white + **indigo `#3D4EAD`**. Icon/splash =
   **sky/royal blue** (`#208AEF`, `#E6F4FE`). They should converge.
3. **`widget-settings.tsx` is off-system** — hardcoded slate + **blue `#2563eb`**, white
   cards, the only screen with a navigation header bar. Re-tokenize to match (indigo accent,
   `Card`, tokens).
4. **The widgets (Android/iOS) use a cool slate palette** + square progress bars, unlike the
   warm/indigo/rounded app. Align colors where the platform allows.
5. **Legacy template tokens** linger in `theme.ts` (`Colors` light/dark, `Fonts`, `Spacing`,
   `BottomTabInset`, `MaxContentWidth`) and unused template images in `assets/images/`.
   Safe to prune during a revamp.
6. **Android tab bar has no blur** (BlurView intensity 0 + flat white overlay) while iOS
   gets a frosted bar — Android could get a more intentional treatment.
7. **Splash icon is monochrome white** at a tiny 76dp on bright blue — feels unbranded.

---

## 8. Soft-revamp guardrails — safe vs. core

**The brief: refresh the *look*, not the *machinery*.**

### ✅ Safe to change (visual)
- Token **values** in `src/constants/theme.ts` (`palette`, `radius`, `shadow`, `font`
  family choices, spacing) — this is the intended single source of truth and cascades
  everywhere.
- Category colors/icons in `src/constants/categories.ts`.
- **Styles** (`StyleSheet` blocks), colors, spacing, font sizes, icon choices inside any
  screen/component.
- Re-tokenizing the off-system screens/widgets (`widget-settings.tsx`, widget files) to use
  the palette.
- The **logo, app icon, adaptive icon, splash** assets + their `app.json` colors.
- Adding *new* presentational components (e.g., a branded header, a logo component) as long
  as they don't change behavior.

### ⛔ Treat as "core" — do not alter structurally
- **Navigation / routing**: `src/app/_layout.tsx`, `(tabs)/_layout.tsx`, route file
  names, `Stack`/`Tabs` config, deep-link handling, auth redirect logic.
- **Data & logic**: anything in `src/lib/**` (`goals.ts`, `social.ts`, `supabase.ts`,
  `widget-storage.ts`, `notifications.ts`, `dialog.ts`), the auth context
  (`src/context/auth.tsx`), Supabase queries, validation rules.
- **Component *contracts*** of the shared primitives in `ui.tsx` and `progress-bar.tsx`:
  you may restyle them, but **keep their props, variant names, and exports stable** so every
  screen keeps working (e.g., don't rename the `Button` `variant` values, don't drop
  `ProgressBar`'s `ratio`/`color`/`height`).
- **Widget data flow / native registration**: the bridge function signatures
  (`pushWidgetData`, `reloadWidget`), `task-handler.tsx`, `app.json` widget *names*
  (`PortoGoals`) and the `"use no memo";` pragmas in widget files (required for the React
  Compiler + `react-native-android-widget`).
- Functional constraints noted inline (RemoteViews can't round corners / can't read JS
  tokens; widget colors must stay hardcoded in the widget file).

**Rule of thumb:** if a change would alter what a tap *does*, what data is shown, or a
component's API — it's core. If it only changes how something *looks* — it's fair game.

---

## 9. Optional revamp directions (react, don't obey)

These are starting points to confirm/redirect in the new chat, not decisions:

- **Lean into "Calm & Premium."** The Fraunces + Inter + warm-off-white + indigo system is
  already distinctive and good. The fastest high-impact win is **making the brand assets
  (logo, icon, splash) match it** and **fixing the two off-system surfaces** (widget
  settings + widgets), so the whole product reads as one identity.
- **Logo concept:** a "Porto" Fraunces wordmark and/or a simple geometric mark (e.g., an
  arch/"porto"=gate/harbor motif, or a progress-ring glyph) in indigo `#3D4EAD` on warm
  `#FBFAF8` (or reversed). Generate icon (1024²), adaptive foreground (transparent),
  monochrome, and a splash mark; set `app.json` splash bg to a warm/indigo tone instead of
  `#208AEF`.
- **Micro-polish candidates:** consistent card elevation, slightly larger touch targets on
  text-link actions in `value-entries`, a branded empty-state illustration, and an
  intentional Android tab-bar background.
- **Accessibility:** verify contrast of muted inks (`ink3`/`ink4`) on `surface2`, and the
  white-on-success/danger button text, if the palette shifts.

---

### Quick file index
| Area | Path |
|---|---|
| Tokens | `src/constants/theme.ts` |
| Category style | `src/constants/categories.ts` |
| Primitives | `src/components/ui.tsx`, `src/components/progress-bar.tsx` |
| Auth | `src/app/(auth)/sign-in.tsx`, `sign-up.tsx` |
| Tabs shell | `src/app/(tabs)/_layout.tsx` |
| Home | `src/app/(tabs)/index.tsx` |
| Search | `src/app/(tabs)/search.tsx` |
| Profile | `src/app/(tabs)/profile.tsx` |
| Goal detail | `src/app/goal/[id].tsx` |
| New goal (modal) | `src/app/goal/new.tsx` |
| Value entries | `src/components/value-entries.tsx` |
| Emoji reactions | `src/components/emoji-reactions.tsx` |
| Widget settings | `src/app/widget-settings.tsx` |
| User profile | `src/app/user/[id].tsx` |
| Friend goal | `src/app/user/[id]/goal/[goalId].tsx` |
| Widget (Android) | `src/widget/PortoWidgetAndroid.tsx` |
| Widget (iOS) | `src/widget/bridge.ios.tsx` |
| Root layout / nav | `src/app/_layout.tsx` |
| Icon / splash config | `app.json`, `assets/images/**`, `assets/expo.icon/**` |
</content>
</invoke>

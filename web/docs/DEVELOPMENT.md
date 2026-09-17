<!--
SPDX-FileCopyrightText: 2026 Bruno Zingg
SPDX-License-Identifier: MPL-2.0
-->

# LingoLab web/: developer documentation

This is the developer-facing documentation for the React app in `web/`. It's written for
someone joining the project who has **not** seen the legacy SvelteKit app (`frontend/`) —
where this doc says "legacy," that's the app being replaced, kept around only as a
behavioural spec until the rewrite reaches parity (see the root `CLAUDE.md` and
`MIGRATION.md`).

New sections are added here as each migration phase lands. This first section covers
**Phase 0: Foundation** — the app shell, design system, routing, API client, auth and i18n
that every later route is built on top of.

## Contents

- [Running the app](#running-the-app)
- [Design tokens](#design-tokens)
- [The API client and `gen:api`](#the-api-client-and-genapi)
- [Why TypeScript is pinned to 5.9.3](#why-typescript-is-pinned-to-593)
- [Auth: httpOnly cookies and `requireAuth`](#auth-httponly-cookies-and-requireauth)
- [i18n: adding a key or a language](#i18n-adding-a-key-or-a-language)
- [Replacing a `ComingSoon` placeholder](#replacing-a-comingsoon-placeholder)

## Running the app

The React app runs on your machine directly (not in Docker); only the backend and its
data stores run in containers.

```bash
# from the repo root
docker compose -f compose.dev.yml up -d   # postgres, redis, meilisearch, api, worker on :8000
pnpm -C web dev                           # React app on http://localhost:5173
```

Open `http://localhost:5173`, not `:8000`. Vite's dev server proxies `/api`, `/openapi.json`
and `/socket.io` to the backend on `:8000` (see the `server.proxy` block in
[`vite.config.ts`](../vite.config.ts)). That proxy is what makes the browser treat the app
and the API as the same origin in dev — which matters for auth (see below) and avoids CORS
entirely.

If you also want the old app running side by side for comparison while porting a route:

```bash
docker compose -f compose.dev.yml --profile legacy up -d   # legacy app on http://localhost:8080
```

Useful commands (all run from the repo root; `-C web` points pnpm at the app):

```bash
pnpm -C web typecheck   # tsc --noEmit
pnpm -C web lint        # Biome
pnpm -C web test        # Vitest (unit)
pnpm -C web e2e         # Playwright (e2e, needs the app + backend running)
pnpm -C web gen:api     # regenerate src/api/schema.d.ts from the running backend
```

Run `typecheck`, `lint` and `test` before considering any task done — this is a hard
requirement in the project's `CLAUDE.md`, not just a suggestion.

## Design tokens

All colours, fonts and radii live as CSS custom properties in
[`src/index.css`](../src/index.css), authored in OKLCH. Components never use raw hex —
they reference a token (`bg-primary`, `text-muted-foreground`, `bg-highlight`, …), which
Tailwind v4 picks up through the `@theme inline` block in the same file. This isn't a style
preference: it's how light/dark mode and any future rebrand work — swap the values under
`:root` / `.dark` and every component updates.

The source of truth for *what* the tokens should be (which colour is "primary", contrast
targets, the answer-tile palette) is the `lingolab-design` skill, not this file. `index.css`
is that skill's values translated into code.

### Why Coral is `--highlight` and not `--accent`

This tripped us up during Phase 0 and is worth understanding before you touch theming:

- **shadcn/ui's convention** is that `--accent` is the subtle background used for hover and
  focus states — ghost-button hovers, dropdown-menu hover rows, that kind of thing. It's
  meant to be quiet.
- **LingoLab's design system** calls its coral colour "the accent colour" in the branding
  sense — the colour used for celebration, streaks, and highlights.

Those are two different meanings of "accent" colliding. Wiring Coral into shadcn's
`--accent` variable made every ghost-button hover and loading skeleton render in full
Coral, because shadcn's components all reference `--accent` for exactly those quiet
surfaces. This was caught during manual browser verification of `/styleguide`, not by any
automated check — Tailwind and TypeScript have no way to know a colour is "supposed to" be
rare.

The fix: Coral got its own token, `--highlight` / `--highlight-foreground`, wired into
Tailwind as `bg-highlight` / `text-highlight-foreground`. `--accent` was freed up to be
what shadcn expects: a warm neutral, identical in value to `--secondary` and `--muted`.

**The rule going forward:** if you want Coral, use `bg-highlight`, never `bg-accent`. If a
new shadcn component you add references `--accent`, that's correct and should stay a
neutral. Coral is reserved for moments that deserve attention (a correct-answer flash, a
streak counter) — not chrome.

### Answer tile colours

The six `--answer-1` … `--answer-6` tokens are the Okabe–Ito colour-blind-safe palette,
each already checked against WCAG AA (documented in the PR that introduced them, and worth
re-verifying if you ever change them). Colour is never the only signal on an answer tile —
each slot also gets a fixed shape (circle, square, triangle, star, hexagon, diamond). If
you build a new component that uses these tokens, keep pairing colour with shape; don't add
a seventh option without checking contrast and finding it a shape too.

### Reduced motion

`index.css` already disables animation/transition durations under
`prefers-reduced-motion: reduce`. You don't need to add per-component reduced-motion
handling for CSS transitions — it's handled globally. Only worry about it yourself if
you're adding animation via JS (e.g. a canvas confetti effect) that ignores CSS.

## The API client and `gen:api`

The backend is documented via OpenAPI at `/openapi.json`. Rather than hand-writing request
types, we generate them:

```bash
pnpm -C web gen:api
# runs: openapi-typescript http://localhost:8000/openapi.json -o src/api/schema.d.ts
```

This requires the backend to be running (`docker compose -f compose.dev.yml up -d`) because
it fetches the live schema. **Never hand-edit `src/api/schema.d.ts`** — it's regenerated
wholesale and any manual change is silently lost next time someone runs `gen:api`. If the
generated types look wrong, the fix belongs in the backend's route/response models, not in
this file.

[`src/api/client.ts`](../src/api/client.ts) wraps the generated types in two clients:

- `fetchClient` — an `openapi-fetch` instance, typed against `paths` from `schema.d.ts`.
- `$api` — an `openapi-react-query` instance built on top of `fetchClient`, giving you typed
  TanStack Query hooks (`$api.useQuery(...)`, etc.) instead of writing `queryFn`s by hand.

Two details in that file matter if you're debugging API calls or writing tests:

- `credentials: 'include'` is set on every request, because auth is a cookie (see below),
  not a bearer token you attach yourself.
- `fetch` is resolved **per call** (`fetch: (request) => globalThis.fetch(request)`) instead
  of being captured once at module load. `openapi-fetch` would otherwise grab whatever
  `globalThis.fetch` was when the module first ran — which in tests is *before* MSW patches
  it, so every mocked request would silently hit the real network instead of MSW's handler.
  If you ever see a test where MSW mocks don't seem to apply, check this isn't the cause.

Not everything from the backend has a typed response. `GET /api/v1/users/check` returns a
bare dict with no schema in the OpenAPI spec, so [`src/auth/auth.ts`](../src/auth/auth.ts)
declares its own `CurrentUser` type and validates the response shape at runtime with a type
guard, rather than trusting a generated type that doesn't exist. Follow the same pattern
(declare + runtime-check) for any other under-specified endpoint you hit.

## Why TypeScript is pinned to 5.9.3

`package.json` pins `"typescript": "5.9.3"` — not the newer 7.0.2. This isn't an oversight;
don't "helpfully" bump it.

TypeScript 7 is the native Go port of the compiler. It's faster, but as of this writing it
ships **without the programmatic compiler API** (the `ts.factory`/`ts.createProgram` surface
that tools use to generate or transform code) — that API is planned for TS 7.1, not yet
released. `openapi-typescript`, which powers `gen:api`, is built on exactly that API, so
`gen:api` fails outright under TS 7. On top of that, `openapi-typescript`'s own
`package.json` declares a `typescript@^5.x` peer dependency, so npm/pnpm would refuse to
install a coherent tree with TS 7 anyway.

Every other dependency in `web/` is on its current major (Vite 8, React 19, Vitest 5,
Tailwind 4) — TypeScript is the one deliberate exception. Revisit this once
`openapi-typescript` supports TS 7.1+; until then, treat a TS-version bump here as a
breaking change that needs `gen:api` re-verified, not a routine dependency update.

## Auth: httpOnly cookies and `requireAuth`

The backend authenticates with an **httpOnly `access_token` cookie**. "httpOnly" means
JavaScript cannot read it — `document.cookie` won't show it, and no client-side code ever
sees the token itself. This is deliberate (see the project's privacy rules) and it means the
frontend can never just "check if the user is logged in" by inspecting local state; it has
to ask the server.

That ask is `GET /api/v1/users/check`:

- Signed in → returns `{ email: ... }` and refreshes the cookie as a side effect.
- Signed out → responds `401`/`403`.

[`src/auth/auth.ts`](../src/auth/auth.ts) wraps this in `fetchCurrentUser()`, which returns
`CurrentUser | null` (null on 401/403, throws on any other failure — a 500 is not "signed
out", it's broken). That function is wired into TanStack Query as `currentUserQuery`
(`queryKey: ['currentUser']`, `staleTime: 30_000`, `retry: false` — auth failures don't
deserve a retry storm).

Two ways this gets used:

- **`useCurrentUser()`** ([`src/auth/useCurrentUser.ts`](../src/auth/useCurrentUser.ts)) — a
  hook for components that want to *render differently* depending on auth state (e.g. the
  navbar showing a login link vs. an avatar menu). `user` is `null` when signed out and
  `undefined` while the check is still in flight — check `isPending` if you need to
  distinguish "don't know yet" from "signed out".
- **`requireAuth(queryClient, href)`** — a guard for routes that must not render at all for a
  signed-out visitor. Call it from a route's `beforeLoad`:

  ```ts
  export const Route = createFileRoute('/dashboard')({
    beforeLoad: ({ context, location }) =>
      requireAuth(context.queryClient, location.href),
    component: DashboardPage,
  });
  ```

  It calls `queryClient.ensureQueryData(currentUserQuery)`, and if that resolves to `null`,
  throws a TanStack Router `redirect()` to `/account/login?returnTo=<href>` — the same
  redirect-when-logged-out behaviour the legacy app got from its SvelteKit
  `+page.server.ts` files, just expressed as a router guard instead of a server-side load
  function (there is no SSR here; everything is client-side).

`logout(queryClient)` calls `GET /api/v1/users/logout` (which clears the cookie
server-side) and then `queryClient.clear()`, so no stale cached data survives a sign-out.

One rule that falls out of all this: **never store a token in `localStorage` or read/write
the cookie yourself.** If you find yourself wanting to, the correct move is almost always
"call `/users/check` again" or "read `useCurrentUser()`" — the backend is the source of
truth for session state, not the client.

## i18n: adding a key or a language

Translations live in [`src/locales/en.json`](../src/locales/en.json) and
[`src/locales/de.json`](../src/locales/de.json), loaded and configured in
[`src/i18n/index.ts`](../src/i18n/index.ts) via `i18next` + `react-i18next`.

**The keys are copied verbatim from the legacy app**
(`frontend/src/lib/i18n/locales`), not renamed or restructured, specifically so that when a
route is ported, the same `t('key')` calls carry over and already have working copy in both
languages. Don't invent a new naming scheme for keys — match whatever the legacy app used
for the string you're porting.

### Adding a translation key

1. Add the key to **both** `src/locales/en.json` and `src/locales/de.json`. A key that
   exists in English but not German (or vice versa) is a bug, not something to leave for
   later — `en` is only the fallback language (`fallbackLng: 'en'`), not a substitute for a
   missing German string a user will actually see.
2. Use it in a component with `useTranslation()`:
   ```tsx
   const { t } = useTranslation();
   return <p>{t('words.home')}</p>;
   ```
3. There is no hardcoded user-facing string anywhere in the app — if you're writing a
   literal string a user will read, it should be a translation key instead.

Keys are nested/dotted (e.g. `styleguide.not_ported_title`, `words.home`). A `TranslationKey`
type is derived automatically from `en.json`'s shape (see the `DotPaths` type at the bottom
of `src/i18n/index.ts`), so if you reference a key that doesn't exist in English, and you
plumb it through a `TranslationKey`-typed prop, TypeScript will catch the typo — but plain
`t('...')` calls are not checked at compile time, so double-check both JSON files by eye.

### Adding a language

Only `en` and `de` are enabled right now (upstream's legacy app ships 34 locales; the rest
were deliberately not carried over — this was a scope decision, not an oversight). To add
one back:

1. Copy the language's JSON file from `frontend/src/lib/i18n/locales/<code>.json` into
   `src/locales/<code>.json`.
2. Import it and add it to the `resources` object and the `SUPPORTED_LANGUAGES` array in
   `src/i18n/index.ts`:
   ```ts
   import fr from '@/locales/fr.json';
   // ...
   export const SUPPORTED_LANGUAGES = [
     { code: 'en', label: 'English' },
     { code: 'de', label: 'Deutsch' },
     { code: 'fr', label: 'Français' },
   ] as const;
   // ...
   export const resources = { en: {...}, de: {...}, fr: { translation: fr } } as const;
   ```
3. That's it — `LanguageToggle` reads `SUPPORTED_LANGUAGES`, so the new language appears in
   the switcher automatically. Language detection order (`localStorage` → browser →
   `<html lang>`) and the `lingolab-language` localStorage key don't need to change.

Note `nonExplicitSupportedLngs: true` and `load: 'languageOnly'` in the i18next config: a
browser reporting `de-CH` or `de-AT` is treated as `de`, not rejected as unsupported. Keep
that in mind if you ever add regional variants of the same language — you'd need to turn
this off to distinguish them.

## Replacing a `ComingSoon` placeholder

Every route that belongs to a later migration phase (`/play`, `/dashboard`, `/account/*`,
`/docs/*`, …) is already registered in the router, but renders
[`ComingSoon`](../src/components/ComingSoon.tsx) instead of a real page:

```tsx
export const Route = createFileRoute('/play')({
  component: () => <ComingSoon route="/play" />,
});
```

This exists so the app shell's links (navbar, footer, buttons that point at `/dashboard`,
etc.) are real, type-checked TanStack Router routes from day one — clicking them navigates
somewhere sensible-looking instead of 404ing or requiring the surrounding UI to be built
around routes that don't exist yet.

**A `ComingSoon` route is not a "ported" route** — don't tick it off in `MIGRATION.md` and
don't treat its existence as satisfying a phase's checklist item. To actually port the
route (use the `port-route` skill for this rather than doing it ad hoc):

1. Read the equivalent page in `frontend/` — the legacy SvelteKit route is the spec for
   what this page must do. Note any `+page.server.ts` auth redirect, any `load()` data
   fetching, and any behaviour that looks like a bug (log it under "Legacy quirks" in
   `MIGRATION.md` instead of silently fixing it — see the project's parity-first rule).
2. Replace the route file's `component` with the real component. If the legacy page had a
   server-side auth redirect, that becomes a `beforeLoad: requireAuth(...)` guard (see
   above); if it had a `load()` for data, that becomes a route `loader` using
   `queryClient.ensureQueryData`.
3. Keep any `validateSearch` schema that was already on the placeholder (e.g.
   `/account/login`'s `returnTo` search param exists specifically because `requireAuth`
   already redirects there) — it's part of the contract other code depends on, not
   scaffolding to throw away.
4. Reuse the existing translation keys (see above) rather than writing new copy.
5. Delete the `ComingSoon` import once nothing in the file references it.
6. Before calling it done: `pnpm -C web typecheck && pnpm -C web lint && pnpm -C web test`
   pass, at least one Playwright e2e test covers the main flow, and it's been checked in
   the browser in both themes at mobile and desktop width (see "Definition of done" in
   `web/CLAUDE.md` for the full checklist). Tick the item in `MIGRATION.md`.

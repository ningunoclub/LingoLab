# Frontend migration: SvelteKit (`frontend/`) → React (`web/`)

Line counts are the legacy `+page*` files only. Shared `$lib` components add a lot more;
the biggest are `lib/editor` (~3,100 lines), `lib/play` (~1,900) and `lib/quiztivity` (~1,000).

Work top to bottom. Each phase should be usable end to end before starting the next one.

## Phase 0: Foundation (no routes yet)

- [ ] Vite + React + TS strict scaffold, Biome, Vitest, Playwright configured
- [ ] Tailwind v4 + shadcn/ui initialised; tokens, fonts and light/dark theme implemented per the `lingolab-design` skill
- [ ] `/styleguide` dev-only route showing colours, type scale, buttons, inputs, cards and answer tiles in both themes
- [ ] TanStack Router (file-based) + TanStack Query wired up, 404 and error boundary (legacy `+error.svelte`)
- [ ] `gen:api` script + `api/client.ts` (cookies included)
- [ ] Auth context: `/api/v1/users/check`, `requireAuth` guard helper, logout
- [ ] i18n: locales copied from `frontend/src/lib/i18n/locales`, language detection, `LanguageToggle`
- [ ] App shell: Navbar, Footer (legacy `lib/navbar.svelte`, `lib/footer.svelte`), `navbarVisible` behaviour
- [ ] `realtime/socket.ts` + `realtime/events.ts` (typed from `classquiz/socket_server` + `SocketIo.md`)
- [ ] Port `lib/hashcash.ts` (proof-of-work captcha used on register/login)

## Phase 1: Accounts

- [ ] `/account/login` (146)
- [ ] `/account/register` (385)
- [ ] `/account/password-reset` (172)
- [ ] `/account/reset-password` (145)
- [ ] `/account/oauth-error` (54)
- [ ] `/account/settings` (331)
- [ ] `/account/settings/security` (295): passkeys via `@simplewebauthn/browser`
- [ ] `/account/settings/avatar` (178)

## Phase 2: Core loop (create → host → play → results). The thesis-critical part

- [ ] `/dashboard` (438)
- [ ] `/create` (138)
- [ ] `/edit` (176): quiz editor, `lib/editor/*`. **Largest piece. Split into several PRs:**
  - [ ] editor shell + sidebar + slide list (drag and drop)
  - [ ] question types: ABCD, CHECK, TEXT, ORDER, RANGE, VOTING, SLIDE
  - [ ] media/image upload (`uploader`, `MediaComponent`)
  - [ ] rich text (CKEditor → Tiptap)
- [ ] `/view/[quiz_id]` (343)
- [ ] `/play` (220): student join + answer screens, `lib/play/*`
- [ ] `/admin` (340): host/game-master screen, `lib/play/admin/*`
- [ ] `/results` (85) and `/results/[result_id]`
- [ ] `/edit/files` (185) and `/dashboard/files` (49)

## Phase 3: Discovery and import

- [ ] `/` landing page (495)
- [ ] `/explore` (52)
- [ ] `/search` (116)
- [ ] `/user/[user_id]` (183)
- [ ] `/import` (282): includes the Kahoot importer

## Phase 4: Decide first: port, simplify, or cut?

Candidates to **cut** because they aren't needed for the thesis. Cutting means the backend endpoints stay, but we don't build UI for them.

- [ ] `/practice` (97): self-paced mode. *Possibly useful for a flashcard archetype later*
- [ ] `/quiztivity/create` (43), `/quiztivity/edit` (72), `/quiztivity/play` (74)
- [ ] `/remote` (330): phone as remote control for the host
- [ ] `/controller` (13) and `/account/controllers/*` (hardware buzzer boxes)
- [ ] `/edit/videos` (227): needs ffmpeg.wasm (large, check licensing)
- [ ] `/moderation` (79)
- [ ] `/docs/*` (9 pages): replace with our own docs; **keep attribution and privacy policy, rewritten for our instance**

## Phase 5: Cut-over

- [ ] Production `Dockerfile.web` (build `web/`, serve `dist/` from Caddy with SPA fallback)
- [ ] Update `docker-compose.yml`: remove the `frontend` service
- [ ] Delete `frontend/` in a single, clearly named commit
- [ ] README: fork notice, attribution to ClassQuiz, licence

## After parity (not now)

- Class/group management
- New EFL game archetypes (matching/categorisation, flashcards, …)

## Legacy quirks

Behaviour in the old app that looks unintended. Log it here instead of silently changing it.

| Route | Quirk | Decision |
|---|---|---|
| | | |

# Frontend migration: SvelteKit (`frontend/`) → React (`web/`)

Line counts are the legacy `+page*` files only. Shared `$lib` components add a lot more;
the biggest are `lib/editor` (~3,100 lines), `lib/play` (~1,900) and `lib/quiztivity` (~1,000).

Work top to bottom. Each phase should be usable end to end before starting the next one.

## Phase 0: Foundation (no routes yet)

- [x] Vite + React + TS strict scaffold, Biome, Vitest, Playwright configured
- [x] Tailwind v4 + shadcn/ui initialised; tokens, fonts and light/dark theme implemented per the `lingolab-design` skill
- [x] `/styleguide` dev-only route showing colours, type scale, buttons, inputs, cards and answer tiles in both themes
- [x] TanStack Router (file-based) + TanStack Query wired up, 404 and error boundary (legacy `+error.svelte`)
- [x] `gen:api` script + `api/client.ts` (cookies included)
- [x] Auth context: `/api/v1/users/check`, `requireAuth` guard helper, logout
- [x] i18n: locales copied from `frontend/src/lib/i18n/locales`, language detection, `LanguageToggle`
- [x] App shell: Navbar, Footer (legacy `lib/navbar.svelte`, `lib/footer.svelte`), `navbarVisible` behaviour
- [x] `realtime/socket.ts` + `realtime/events.ts` (typed from `classquiz/socket_server` + `SocketIo.md`)
- [x] Port `lib/hashcash.ts` (proof-of-work helper; **unused** — see the note under `/account/register`)

### Phase 0 notes

- **TypeScript is pinned to 5.9.3.** TS 7 (the native Go port) ships without the
  programmatic compiler API until 7.1, which `openapi-typescript` needs; `gen:api`
  fails outright on it. Revisit when 7.1 lands.
- **Languages: en + de only.** Upstream ships 34 locales; the rest were not copied.
  Adding one back is just a file plus an entry in `SUPPORTED_LANGUAGES`.
- **Routes for later phases are registered as placeholders** (`ComingSoon`), so the
  app shell's links stay type-checked by the router. Replace each one when its
  phase is ported; the placeholder is not a ported route.
- **`--accent` vs `--highlight`.** shadcn uses `--accent` for the subtle hover/focus
  surface, but the design system calls Coral the accent. Coral therefore lives in
  `--highlight`, and `--accent` stays a warm neutral. Use `bg-highlight` when you
  want Coral.

## Phase 1: Accounts

- [x] `/account/login` (146): password + OAuth entry. TOTP/backup/passkey branches land with `/account/settings/security`.
- [x] `/account/register` (385): email/username/password + consent. **No captcha or proof-of-work** — legacy has none on this route and the backend accepts no such field.
- [x] `/account/reset-password` (145): **requests** the reset mail. Despite the name, this is the entry point linked from login/register.
- [x] `/account/password-reset` (172): **consumes** the token from that mail. The names are inverted upstream; kept, since they appear in already-sent emails.
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
| `lib/hashcash.ts` | `mint()` takes a `bits` argument but immediately overwrites it with 8, so the parameter has never had any effect. | Behaviour kept as-is (the backend validates against 8 bits). Documented in the port; a test pins it. |
| `lib/hashcash.ts` | Calls the global `plausible()` for timing telemetry, which throws anywhere the analytics script is absent. | Removed. Third-party analytics are ruled out by the privacy rules. |
| `lib/footer.svelte` | Footer solicits donations for the upstream author. | Dropped. MPL attribution to ClassQuiz is kept. |
| `account/login` | `/login/start` answers for unknown *and* unverified accounts with a decoy session offering PASSWORD, so the password step then fails with 401. | Intentional anti-enumeration in the backend. Preserved: the UI reveals nothing about whether an account exists. |
| `account/login` | `check_auto()` removes unsupported methods with `splice` inside an index-based loop, which skips an element when two unsupported entries are adjacent. | Reimplemented as a non-mutating filter. Same observable result for a set of at most four members. |
| `account/login` | Wrong credentials are reported with a native `alert()`; an unparseable 401 body does `alert("This shouldn't happen")` + reload. The translated `login_page.modal.error.*` keys sit unused behind commented-out code. | Replaced with an inline field error plus a toast, using those existing keys. |
| `account/login` | `?verified` is tested with `!== null`, so `?verified=false` also shows the success badge. | Kept as presence-only. |
| `account/login` | Success calls `window.location.reload()` after a 100 ms `setTimeout` and lets the server layout redirect. | Replaced with query invalidation + client-side navigation. No full reload. |
| `account/login` | `returnTo` is taken from the query string and redirected to unchecked (open redirect). | **Fixed, not replicated.** Only same-origin paths are accepted; anything else falls back to `/dashboard`. |
| `login/select_method.svelte` | Options are `<div>`s with `onclick`/`onkeyup`, so the picker is not reliably keyboard operable, and its labels are hardcoded English while the rest of the page is translated. | Rebuilt as real `<button>`s with new `login_page.methods.*` keys in en + de. |
| `login/oauth_block.svelte` | Stray `console.log(github_auth_enabled)` on every render. | Dropped (debug residue; privacy rules forbid logging). |
| `account/register` | The task brief assumed registration was gated by `VITE_CAPTCHA_ENABLED` + hCaptcha/reCAPTCHA. It is not: that flag's only consumer is `dashboard/start_game.svelte` (captcha for *players joining a game*) and the third-party scripts load in `play/join.svelte`. | No captcha on register. The third-party-script decision belongs to `/play` and `/dashboard` and is deferred to those routes. |
| `lib/hashcash.ts` | Dead code upstream: nothing imports `mint()`. Phase 0 ported it on the assumption that register used it. | Left unused in `web/` too (the `plausible` call was already stripped in Phase 0). Keep or drop it with the `/play` captcha decision; note the backend has no PoW verifier. |
| `account/register` | `423 Locked` (`settings.registration_disabled`) is not handled; it falls into the generic "unexpected error" branch. | Replicated. Worth its own message once self-hosting docs exist — an admin disabling registration is a state this deployment target will reach. |
| `account/register` | The 400 modal says "This email-address doesn't exist!", but the backend returns 400 when `validate_email` rejects a *malformed* address. | Meaning kept (bad address), wording corrected — the legacy sentence states something false. |
| `account/register` | Unreachable `You stupid Mawoka!` fallback title and body. | Dropped: debug residue and upstream branding. |
| `account/register` | Every failed attempt calls `window.location.reload()`, discarding everything typed — painful after a 409, where one field needs changing. | **Not replicated.** Closing the dialog leaves the form intact. Success navigates to `/account/login` instead of `/`, which said nothing about the confirmation mail. |
| `account/register` | A "Forgot password?" link sits on the registration form, for people who by definition have no account yet. | Kept. |
| `account/reset-password` | Route names are inverted: `/account/reset-password` *requests* the mail while `/account/password-reset` *consumes* the token. Confirmed by `forgotten_password.jinja2`, which links to `/account/password-reset?token=`. | Kept. The names are in already-sent emails and in users' bookmarks; renaming is not a parity-phase change. |
| `account/password-reset` | `let { token: string } = data` is a destructuring **rename**, binding the token to a local called `string` and leaving `token` undefined where the body is built. Every reset therefore goes out as `{password, token: undefined}` and fails with 400 — **the legacy route cannot complete a reset at all.** | **Fixed, not replicated.** A broken route, not intended behaviour: the server loader exists only to read `?token`. Unit + e2e tests pin that the token is actually sent. |
| `account/reset-password` | `else if (res.status === 404) alert('user not found!')` is unreachable: `forgotten_password` filters on `verified=True` and returns 200 whatever it finds. | **Dropped.** Porting it would leak account existence the moment the backend changed. The confirmation is worded conditionally ("if an account exists for ..."), and a unit test pins the anti-enumeration contract. |
| `account/password-reset` | Neither page handles a missing or empty `?token`; legacy renders the form and fails on submit. | **New state**: the form is replaced by an explanation and a link to request a fresh mail. Legacy only ever reached that path because of the `token` bug above. |
| both reset routes | Errors are reported with native `alert()`; success uses `window.location.assign`. | Replaced with inline messages, a toast on success, and client-side navigation, matching login and register. |
| both reset routes | Each page hardcodes an `<h2>ClassQuiz</h2>` wordmark. | Replaced with `APP_NAME` from `config.ts` (no-ClassQuiz-branding rule). |
| `account/reset-password` | Sets `navbarVisible.visible = true` while `account/password-reset` does not, so the two halves of one flow render with different chrome. | Both render in the standard app shell; `web/` has no `navbarVisible` equivalent. |
| `account/password-reset` | The password form has no username field, so password managers cannot file the new password against an account (Chrome warns in the console). | A hidden, empty `autocomplete="username"` input is added. The page knows only the token, and no endpoint maps a token to a user — deliberately, since that would leak the address to anyone holding a token. |

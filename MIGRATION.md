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

- [x] `/account/login` (146): password + OAuth entry. The TOTP/backup/passkey sign-in branches followed in their own PR (below).
- [x] `/account/register` (385): email/username/password + consent. **No captcha or proof-of-work** — legacy has none on this route and the backend accepts no such field.
- [x] `/account/reset-password` (145): **requests** the reset mail. Despite the name, this is the entry point linked from login/register.
- [x] `/account/password-reset` (172): **consumes** the token from that mail. The names are inverted upstream; kept, since they appear in already-sent emails.
- [x] `/account/oauth-error` (54): landing page for a failed GitHub sign-in. Reached only by a backend redirect.
- [x] `/account/settings` (331): profile, password change, API keys, sessions. Ported as one page; the four sections are independent.
- [x] `/account/settings/security` (295 + 133 in two child components): backup code, TOTP, passkeys via `@simplewebauthn/browser`, and the require-password switch.
- [x] `/account/settings/avatar` (178): 12-step avataaars wizard. **Not** an upload/crop screen and no `@uppy` — the uploader decision belongs to Phase 2's editor/media routes.
- [x] **Login second-factor branches** (~450 legacy lines): TOTP, backup-code and passkey *sign-in* in `/account/login`. `SUPPORTED_METHODS` is gone; the only filter left is legacy's own (PASSKEY dropped when the browser has no WebAuthn).

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

## Manual checks before cut-over

The author does no hands-on testing until parity; automated tests and browser checks still run per PR.
Anything only a person with a real backend/device can confirm goes here, for one pass before Phase 5.

- [ ] `/account/login` (PR #10): real sign-in against `compose.dev.yml` with TOTP, with a backup code, and with a
  passkey (the passkey request body is only unit-tested with a mocked `startAuthentication`).

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
| `account/oauth-error` | The page is hardcoded English while the rest of the app is translated, and has no i18n keys at all upstream. | New `oauth_error_page.*` keys in en + de. |
| `account/oauth-error` | Both messages are phrased as questions at the user ("Are you sure you've got an email? Is the Email verified?") and the generic branch doesn't say what to do next. | Reworded: each branch names the one thing the user can act on, and says the account is unchanged so retrying is safe. |
| `account/oauth-error` | Tells users to open an issue on the **upstream author's** GitHub tracker. | **Dropped.** Third-party, and wrong for a self-hosted instance whose users have a local admin. Replaced with "contact the person who runs this LingoLab server". A unit test pins that the page links nowhere external. |
| `account/oauth-error` | `?error` is compared only against `'email'`; any other value silently falls through to the generic text. | Kept, and made explicit: the route maps anything that is not `email` to `generic`, so an unexpected `?error` can never blank the page. |
| `account/settings` | `getUser()` returns `undefined` on a non-200 and calls `window.location.assign`, so the `{#await}` block renders with an undefined user before the redirect happens. | Replaced by the route's `beforeLoad` auth guard, so an unauthenticated visitor never renders the page at all. |
| `account/settings` | `get_api_keys()` logs the full API-key list to the console on every load. | **Dropped.** API keys are credentials and the privacy rules forbid logging. |
| `account/settings` | API keys are rendered in full, permanently. Teachers regularly mirror their screen onto a projector. | Keys are masked (`abcd••••••••5678`) with an explicit reveal and a copy button. The full key is never in the DOM until asked for. |
| `account/settings` | Deleting an API key uses a native `confirm()`; deleting a session has no confirmation at all, despite being able to sign you out of the browser you are using. | Both use a shadcn `AlertDialog` with a destructive confirm button. Ending the current session says so explicitly and is treated as the sign-out it is. |
| `account/settings` | Password change reports both success and failure with `alert()`, then `window.location.assign('/account/login')`. | Inline field errors, a toast, `queryClient.clear()` and client-side navigation, matching login/register. A wrong current password is reported on the field, not as a generic failure. |
| `account/settings` | The "This session?" column is ✅/❌ only, which carries meaning by glyph alone and is not translated. | A text badge ("This device") with an icon, on the browser column. |
| `account/settings` | The session table renders `session_key` nowhere, but the endpoint returns it, so the secret sits in the page's JS memory. | The API layer strips `session_key` and `ip_address` before the data reaches any component. A unit test pins that it cannot leak. |
| `account/settings` | Session timestamps are formatted with luxon and user agents with `ua-parser-js`. **`ua-parser-js` v2 is AGPL-3.0**, outside the allowed licences (v1 is MIT but unmaintained). | Neither dependency added. Dates use the built-in `Intl.DateTimeFormat` (already locale-aware); a ~30-line local parser in `lib/userAgent.ts` produces the same "Chrome 140 (macOS)" label and never echoes a raw UA string. |
| `account/settings` | Timestamps are naive `datetime.now()` server-side and serialise without a zone, so `new Date()` reads them as the viewer's local time. | Normalised to UTC before formatting, which is correct because the api container runs UTC. Worth fixing in the backend later (aware UTC timestamps). |
| `account/settings` | The avatar `<img>` has no error handling; a 401/404 leaves a broken image with the alt text spilling out of the layout. | Falls back to the username's initial. |
| `account/settings` | Links to `/account/controllers` (hardware buzzer boxes). | Left out: that route is a Phase 4 cut candidate with no React page. Restore the link if it is ever ported. |
| `components/ui/card.tsx` | shadcn's `CardTitle` renders a `<div>`, so a card used as a page section contributes no heading. | Local addition: `CardTitle` accepts `asChild`, and the settings sections render real `<h2>`s. This is a deviation from the generated component; re-running the shadcn CLI would overwrite it. |
| `account/settings/avatar` | The route is a 12-step avatar *builder*, not an image upload. `@uppy/svelte` is a legacy dependency but is imported only by `lib/editor/*` and `routes/edit/files/uploader.svelte`. | No dependency added. The `@uppy/react` vs. dropzone choice in `web/CLAUDE.md` is deferred to the Phase 2 editor work, where it actually applies. |
| `account/settings/avatar` | `GET /api/v1/avatar/custom` is declared `response_class=PlainTextResponse` and then *appends* a second Content-Type, so the response carries both `text/plain; charset=utf-8` and `image/svg+xml`. Browsers honour the first, so **every avatar image is blank in the legacy app**. | Backend is out of scope, so the bytes are relabelled client-side (`useAvatarSvg`): fetch the markup, serve it from a blob URL typed `image/svg+xml`. Works in dev and behind the production proxy, unlike a Vite-proxy header rewrite. Remove the hook once the upstream `Content-Type` is fixed. |
| `account/settings/avatar` | Backend indexes `hair_color` into the 15-member `Color` enum instead of the 10-member `HairColor` (`classquiz/routers/avatar.py:54`, `:107`). `?hair_color=12` returns 200. The ten swatches shown are the first ten `Color` members, not the hair palette. | Replicated: the UI still offers 10 options. Fixing it means touching the backend, which the rewrite phase forbids. |
| `account/settings/avatar` | `Finish` is enabled only on the last step and has no click handler at all; the step is completed by clicking a tile. | **Fixed.** It opens the reveal, which is what the label and its enabled state imply. |
| `account/settings/avatar` | No auth guard: a signed-out visitor can complete all twelve steps and only fail at `POST /avatar/save`. | **Fixed, not replicated.** `requireAuth`, matching `/account/settings`. |
| `account/settings/avatar` | A failed save is ignored (`if (res.ok)` with no `else`), leaving the spinner spinning forever with nothing said. | **Fixed.** Inline error message and Save returns to its idle state. |
| `account/settings/avatar` | The reveal fades its controls in after an unconditional 3.5s delay and animates for 4s, ignoring `prefers-reduced-motion`. | **Fixed.** Motion is dropped and the controls are usable immediately under reduced motion. |
| `account/settings/avatar` | `grid-cols-6` with a fixed preview column: at 390px the preview collapses to ~65px and the wizard is unusable on a phone. | **Fixed.** Preview sits above the grid on small screens, sticky beside it from `sm` up. |
| `account/settings` (PR #6) | `avatar.tsx` and `security.tsx` sat under `routes/account/settings/`, which TanStack nests under `/account/settings`. That route renders no `<Outlet />`, so **neither child could ever render**, and the parent guard redirected with its own `returnTo`. Legacy has no shared settings layout. | **Fixed here.** Moved to `routes/account/settings_/`; the trailing underscore un-nests them, so both are top-level routes again. URLs unchanged. |
| `account/settings/security` | `save_password_required()` sends the request even when the password prompt is cancelled (`pw` is `null`), then reads `.require_password` off the resulting 401 body `{detail:"Invalid"}`, setting the switch to `undefined`. The other five handlers all guard with `if (!pw) return;`. | **Fixed.** Same guard as its five siblings; a 401 raises `WrongPasswordError` and the switch keeps its server value. |
| `account/settings/security` | `aria-checked` is hardcoded as the string `"true"`/`"false"` in two branches instead of bound to state. The values happen to match their branch, so the exposed state is accidentally correct. | **Fixed by construction.** shadcn `Switch` derives `aria-checked` and `disabled` from `checked`. |
| `account/settings/security` | Dead loop in `add_security_key`: `for (let i = 0; i++; i < resp_data.excludeCredentials.length)` has the condition and update clauses swapped, so the body never runs. It meant to strip `transports` from excluded credentials. | **Dropped, no behaviour change.** The backend already sends `transports: []`. |
| `account/settings/security` | `authenticatorAttachment` is forced to `'cross-platform'`, overriding the backend and preventing platform authenticators (Touch ID, Windows Hello) from enrolling. | **Replicated.** Changing which devices can enrol is a behaviour change; flagged for after parity. |
| `account/settings/security` | A failed WebAuthn ceremony rethrows and shows nothing: a dismissed browser prompt or an already-registered key looks like the button simply did nothing. | **Fixed.** `WebAuthnError` is reported as a toast, with a distinct message for a cancelled ceremony. |
| `account/settings/security` | Clicking the backup-code *text* downloads it, but only once (`already_downloaded`), while the button always downloads. Invisible to keyboard users and fires a download on what looks like a text selection. | **Dropped.** The explicit download button covers it for every input method; the code stays selectable. |
| `account/settings/security` | The overlays are fixed `p-48` three-column grids, unusable below roughly 1100px. | **Fixed.** Ordinary dialogs that stack on a phone; verified at 390px. |
| `account/login` (2FA) | `backup_component` treats **every** non-200 as "go to step 2" (`step += 1; selected_method = null`), so a mistyped backup code silently drops the user into the second-factor picker, or into an empty picker on a one-step account. | **Fixed, not replicated.** Inline error, the user stays on the backup screen. A unit test pins it. |
| `account/login` (2FA) | `webauthn_component` catches a failed/dismissed ceremony, `alert('Unknown error')`s, then **still POSTs** `data: undefined`, which the backend rejects with 422 and nothing is shown. | **Fixed.** A failed ceremony sends nothing: a dismissed prompt gets a "cancelled" toast, other WebAuthn errors a "failed" toast. |
| `account/login` (2FA) | The passkey 401 handler checks `detail === 'webauthn failed'`, but `verify_webauthn` raises a bare `HTTPException(401)`, so a rejected passkey is silent. | **Fixed** without touching the backend: every 401 on a factor shows that factor's own inline message. The backend `detail` is not relied on. |
| `account/login` (2FA) | TOTP and passkey errors use native `alert()`; the passkey screen's "Start the Security-Key verification" is hardcoded English. `isSubmitting` is never set on the TOTP screen, so it shows no pending state. | Inline errors plus new `login_page.*` keys (en + de); the Continue/Start buttons show a spinner while pending. |
| `account/login` (2FA) | The backup screen shows its own "Use backup-code" link, which re-selects the screen you are already on. | Dropped. The backup screen has Back instead, which returns to the screen that linked to it (legacy had no way back at all). |
| `account/login` (2FA) | A passkey-only account in a browser without WebAuthn: `check_auto` strips PASSKEY and renders an **empty picker**, a dead end. | Explains the situation and offers the backup code, which the backend accepts at step 1 for any session. |
| `account/login` (2FA) | The backup code must be exactly 64 characters, and the code is pasted from the downloaded `.txt`, so a trailing newline keeps Continue disabled with no hint why. | Surrounding whitespace is trimmed before the length check. The value sent is otherwise unchanged. |
| `account/login` (2FA) | A successful backup-code sign-in rotates the code server-side (`os.urandom(32).hex()`), and nothing tells the user their saved code is now void. | **Replicated** (parity). Worth a post-sign-in notice pointing to `/account/settings/security` after parity. |
| `locales` | `words.totp` reads "Totp" (de: "TOTP"), used only as the login code field's label. | Value changed to "One-time code" / "Einmalcode"; key kept. |

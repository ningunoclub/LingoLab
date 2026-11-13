# 2026-11-13: The host lobby (`/admin` before the game starts)

- **Phase / area:** Phase 2: Core loop (PR 6 of 12, ADR-0016; the first of four live-game PRs)
- **Related:** PR #23 (open; commit `3c7ff7a` on `web/play-host-lobby`, branched from `main` after #21 and #22
  were merged); `MIGRATION.md` item "`/admin` and `/play`", sub-item PR 6, and five new Legacy quirks rows.
  No ADR written (one was suggested at the end of the session, see Open points)
- **Time spent (approx.):** TODO(Bruno)

## Goal

Port the part of the host screen that the teacher sees before a game starts: connecting to the game as its
host, the join address, the PIN, the QR code, the list of waiting players, removing ("kicking") a player and
starting the game. Bruno's instruction was one line: first merge PRs #21 and #22, then "Next coding task:
PR 6, the host lobby." The scope of PR 6 had been set earlier in `MIGRATION.md`. The question loop, final
results and export belong to PR 8.

## What happened

1. **Merges.** Claude squash-merged PR #21 (SLIDE, `c66935f`) and PR #22 (its docs, `00e2d84`), deleted
   both branches and created `web/play-host-lobby` from the updated `main`. This order avoided the stacked-PR
   conflicts noted in the handoff memory.
2. **Inventory.** Claude read the legacy route (`admin/+page.server.ts`, the lobby half of `+page.svelte`),
   `lib/play/admin/game_not_started.svelte`, `socket_game_controls.ts` and `game_state.ts`, and the backend
   handlers for `register_as_admin`, `join_game`, `start_game` and `kick_player` in
   `classquiz/socket_server/__init__.py`. Findings that shaped the port:
   - Legacy fetches `check_captcha` on connect and stores `game_mode`, which nothing reads. Not ported.
   - The ClassQuizControllers code (`cqc_code`) is never set, because the start-game dialog was ported without
     that option (Phase 2 decision). Not ported.
   - In the lobby, Enter and Space do nothing in legacy; the shortcuts belong to PR 8.
   - Four quirks (see `MIGRATION.md`): the page is blank without the URL parameters; the background image is
     passed to CSS as a bare storage id and never loads; players are clickable `<span>`s that the keyboard
     cannot reach; a kicked player's name stays reserved in Redis, so that name cannot join again.
   No backend change was needed. The inventory became the body of PR #23.
3. **Implementation** (by Claude), in `web/src/features/host/`:
   - `hostStore.ts`: live game state in Zustand, as `web/CLAUDE.md` prescribes for live state. It holds
     only the lobby half of legacy's `GameState` class, so that PR 8 can extend it.
   - `useHostGame.ts`: socket listeners and the one-time `register_as_admin` emit. The backend refuses a
     second registration for the same game, and React's development mode mounts components twice, so a
     ref guards the emit. A unit test runs the hook under `StrictMode` and checks for exactly one emit.
   - `gameQuiz.ts`: the quiz arrives as a JSON string from Redis and is validated with zod. Only a plain
     `#rrggbb` background colour is accepted, because the value goes into a style attribute.
   - `HostLobby.tsx`, `QrCodeButton.tsx`, `HostPage.tsx`, and the route `routes/admin.tsx` with the auth guard.
   - Eight new i18n keys under `admin_page.lobby.*` (en + de). The legacy keys were reused, including the
     legacy rule that 0 and 1 players get the singular sentence ("0 player are waiting").
   - The QR code is still drawn by the backend (`/api/v1/utils/qr/{pin}`), as in legacy. `web/CLAUDE.md`
     maps the legacy `qrcode` package to `qrcode.react`, but the lobby never used that package, so Claude
     added no dependency and raised this as an open question.
4. **Tests.** 17 unit and component tests in three files (store and parser, the hook with a fake socket,
   the lobby component). The e2e test (`tests/e2e/admin-lobby.spec.ts`) plays a small Socket.IO server over
   a WebSocket intercepted by Playwright (`page.routeWebSocket`), so it needs no backend.
5. **A test that reached the real backend.** On the first run, three of six e2e tests failed. One failure
   showed "The game could not be loaded", another "There is already an admin registered for this game". The
   fake server would have sent neither. The route for the WebSocket had been set up inside a promise without
   being awaited, so the page sometimes connected before the route existed and reached the real dev
   backend through the Vite proxy. That backend kept state between runs, which caused the "already
   registered" message. Claude awaited the route before loading the page; all six tests then passed. The
   same run showed a nested `<main>` element (the app shell already has one), which Claude also fixed.
6. **Browser check against the real backend.** Claude signed in with the dev account in Brave, started a
   game through the API and opened the host screen. The new `/play` does not exist yet (PR 7), so the
   players joined through the legacy `/play` on port 8080, which talks to the same backend. Two players in
   separate browser contexts appeared live in the lobby (screenshot 1). The first name came out as "Maia"
   instead of "Mia" because of how the test text was typed. A second name, "Leo", was not accepted by
   legacy's join form; "Leonie" was. Clicking "Leonie" in the lobby removed the player, and the legacy
   player page showed "You got kicked."
7. **A reload loses the host role.** Changing the device emulation reloaded the page, and the backend
   answered with `already_registered_as_admin` (screenshot 3). This is legacy behaviour (the backend ties the
   host role to the socket connection) and was logged as a quirk. Each further check needed a new game.
8. **The QR code's close button.** In the full-screen QR dialog, the shadcn dialog's close button sat on
   the top-right finder square of the code (screenshot 4). Claude removed the button. As in legacy, a
   click anywhere or Esc closes the dialog (screenshot 5).
9. **Finish.** Claude ticked PR 6 in `MIGRATION.md`, added five quirk rows, committed `3c7ff7a` and opened
   PR #23 with the inventory and the verification notes as its body. The handoff memory was updated for
   the next session.

## Human vs. AI

- **Bruno decided / specified:** merging PRs #21 and #22; PR 6 as the next task (its scope comes from the
  Phase 2 breakdown in `MIGRATION.md`); asking for this devlog.
- **Claude proposed / implemented:** the merges; the inventory; all code, tests and i18n keys; these
  choices, which are listed in `MIGRATION.md` or PR #23: keeping the backend QR code instead of
  `qrcode.react`, dropping the unused `check_captcha` call and the controller code, a "No game to host"
  notice instead of a blank page, loading the background image through the storage endpoint, players as
  real buttons, quiz content on cards over the quiz background (instead of black text directly on it),
  closing the QR dialog by click, and a placeholder after "Start" until PR 8. Claude also wrote the commit,
  PR #23, the handoff memory and this devlog.
- **Corrections Bruno made to AI output:** none so far. PR #23 has not been reviewed, and the choices above
  have not been confirmed by Bruno.

## Verification

- `pnpm typecheck` and `pnpm lint` clean. `pnpm test`: 333 of 333 (39 files), including the 17 new tests.
- Playwright: `admin-lobby.spec.ts`, 6 of 6 (three tests, desktop and mobile): the happy path (register,
  two joins, kick, QR dialog, start), the "already registered" error, and the page without a game. **The full
  e2e suite was not run in this session.**
- Browser check in Brave through the `brave-devtools` MCP against the `compose.dev.yml` backend, with legacy
  `/play` as the player client: registration, live joins, kick (confirmed on the player's side), the QR
  dialog, the reload error. Checked at 1280 px in dark and light mode and at 390 px in light mode. No console
  errors; the only requests were `users/check` and the QR image, both 200.
- Screenshots:
  - [1280 px, dark: the lobby with one player, against the real backend](../screenshots/2026-11-13-host-lobby-1.png)
  - [390 px, light: the lobby on a phone-sized screen, no players yet](../screenshots/2026-11-13-host-lobby-2.png)
  - [390 px, light: the error after a reload of the host screen](../screenshots/2026-11-13-host-lobby-3.png)
  - [1280 px, light: the full-screen QR code with the close button on its corner (before the fix)](../screenshots/2026-11-13-host-lobby-4.png)
  - [1280 px, light: the full-screen QR code after the fix](../screenshots/2026-11-13-host-lobby-5.png)
- **Not verified:** a quiz with a background colour or image on the host screen (the dev quizzes had
  neither, so this rests on the unit tests); scanning the QR code with a phone; the "started" placeholder
  against the real backend (only in e2e); the lobby in dark mode at 390 px; a projector; screen-reader
  output; a side-by-side comparison with the legacy host screen.

## Observations for the thesis

- **A test can pass against the wrong system.** The e2e test was meant to be self-contained. Because of one
  missing `await` it sometimes talked to the real backend, and some runs passed. The failure only became
  visible because the real backend kept state between runs. Mocked tests rest on the assumption that the
  mock is in place, and here nothing checked that assumption.
- **The legacy app as a test partner.** The legacy player screen made an end-to-end check of the new host
  screen possible before the new player screen exists. Running both apps against one backend was cheap and
  gave evidence that unit tests could not (live joins, the kick reaching the player).
- **The projector setting.** The host screen exists to be read from the back of a classroom. The PIN uses the
  largest type in the app, and the QR code can be shown full screen. The close-button problem shows that
  standard UI parts can conflict with the screen's purpose (a scannable code). TODO(Bruno): whether the
  lobby should be checked on a real projector during the user-testing round.
- **Reloading loses the game.** If a teacher reloads the host screen by accident, the game cannot be hosted
  any more and has to be started again. This is backend behaviour and was kept for parity. TODO(Bruno):
  whether this is worth noting as a usability risk for classroom use.

## Open points

- PR #23 awaits review and merge.
- Backend QR code vs. `qrcode.react`: kept the backend version; `web/CLAUDE.md` suggests the package.
  TODO(Bruno): decide, and whether this needs an ADR (suggested at the end of the session).
- Removing a player has no confirmation, as in legacy; a misclick removes a student.
- Next: PR 7, the player join screen (`/play`). PR 8 replaces the placeholder after "Start" and extends
  `hostStore.ts`.

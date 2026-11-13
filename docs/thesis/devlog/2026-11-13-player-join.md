# 2026-11-13: The player join (`/play` before the first question)

- **Phase / area:** Phase 2: Core loop (PR 7 of 12, ADR-0016; the second of four live-game PRs)
- **Related:** PR #24 (open; commit `ee824d1` on `web/play-join`, branched from `main`, not from the open PR #23);
  `MIGRATION.md` item "`/admin` and `/play`", sub-item PR 7, and six new Legacy quirks rows. No ADR written
  (one was suggested at the end of the session, see Open points)
- **Time spent (approx.):** TODO(Bruno)

## Goal

Port the part of the player screen that a student sees before the first question: entering the game PIN,
a name and the teacher's optional extra field, joining the game over Socket.IO, taking the seat back after
a reload, being removed ("kicked"), and the title screen shown while the class waits. Bruno's instruction
was "get started on PR 7". The scope of PR 7 had been set earlier in `MIGRATION.md`. The answer screens,
results and end screen belong to PR 9.

## What happened

1. **Starting point.** The handoff memory named PR 7 as the next task. PR #23 (PR 6, host lobby) was still
   open. The main checkout had meanwhile been switched to `main` and held untracked host-lobby screenshots
   in `docs/thesis/`, which looked like documentation work in progress from another session. Claude did
   not touch that checkout. Instead, it created a separate git worktree (`../LingoLab-Code-play-join`) with
   the branch `web/play-join` from `main`. PR 7 needed no code from PR 6, so the branch was not stacked on
   PR #23; the handoff memory had recorded that stacked PRs plus squash merges had caused conflicts before.
2. **Inventory.** Claude read the legacy route (`play/+page.server.ts`, the join and title branches of
   `+page.svelte`), `lib/play/join.svelte` and `lib/play/title.svelte`, and the backend handlers
   `join_game`, `rejoin_game` and `kick_player` in `classquiz/socket_server/__init__.py`, the
   `check_captcha` endpoint and `PlayGame.to_player_data()`. Findings that shaped the port:
   - The typed event map in `web/src/realtime/events.ts` declared `rejoin_game` without `game_pin`, which
     the backend requires. Fixed.
   - Legacy used `window.alert` for a wrong PIN, a taken name and a kick. A game that had already started
     and a browser kicked in the last day got no message at all.
   - The PIN form's Submit button had no handler; it submitted the form natively and reloaded the page.
   - Two bugs that defeat the feature's own purpose: (a) after a kick, legacy reloads the page but keeps
     the `joined_game` cookie, and because `kick_player` does not delete the seat in Redis, the reload
     rejoins the kicked student straight into the game; (b) the cookie keeps the connection id of the
     first join, so after one rejoin the backend knows a new id and a second rejoin fails. The cookie was
     set to expire after 3,600 days.
   - Two smaller quirks: the unload warning was active on the empty join form, and on reconnect
     `game_mode` was fetched for the PIN in the URL, which is usually empty after a reload.
   No backend change was needed. The inventory became the body of PR #24.
3. **Decisions inside the parity rule.** `CLAUDE.md` asks to replicate the *intended* behaviour of a
   legacy bug and log it. Claude read the kick bug and the rejoin bug as unintended, fixed both, and logged
   all six quirks in `MIGRATION.md`. The cookie lifetime was set to two hours, matching the seat's expiry in
   Redis (`ex=7200`). The one-day block after a kick was kept, but now shows a message. Claude also added a
   small "Enter another PIN" button on the notice for captcha games, because that screen would otherwise
   be a dead end; an identical back button on the name form was written first and then removed again, to
   stay closer to legacy.
4. **Implementation** (by Claude), in `web/src/features/play/`:
   - `playStore.ts`: live player state in Zustand, holding only the join half of legacy's page state, so
     that PR 9 can extend it.
   - `usePlayerGame.ts`: socket listeners, the `join_game` emit, the `time_sync` echo, and a rejoin on
     every socket `connect`. This covers both a reload and socket.io's automatic reconnect after a phone
     loses its connection.
   - `playerSession.ts`: the two cookies (`joined_game`, `kicked`) written with `document.cookie`.
     `web/CLAUDE.md` lists `js-cookie` among the packages to drop, so no dependency was added.
   - `checkGame.ts`, `playerGame.ts` (narrows the socket payload), `JoinGame.tsx`, `GameTitle.tsx` (title
     and description through the shared `RichText` component), `PlayPage.tsx`, and the route
     `routes/play.tsx` without an auth guard (students have no accounts). After the first question a
     placeholder shows until PR 9.
   - Nine new i18n keys under `play_page.join.*` (en + de), written for students at A2–B1 level as the
     design skill requires.
   - Captcha games (Phase 2 decision of 2026-09-30) show a notice; no captcha script is loaded.
5. **Tests.** 14 new unit and component tests in three files (the hook with a fake socket, the join form
   with mocked HTTP, the payload parser). The first run of the component tests failed four times because
   the test file did not load the i18n setup, so the assertions saw raw keys; Claude added the import. The
   e2e test (`tests/e2e/play-join.spec.ts`) fakes the Socket.IO server with `page.routeWebSocket`, following
   the pattern and the "await before `goto`" lesson from PR 6.
6. **Browser check.** Claude started the Vite dev server from the worktree and opened `/play` in Brave.
   Starting a real game needed a signed-in teacher account. Claude's attempt to sign in the dev account
   with `curl` was blocked by Claude Code's auto-mode permission classifier, and the Brave profile was
   signed out. Claude did not try to get around the block. So the browser check covered only what works
   without a game: the PIN screen and the real backend's 404 for an unknown PIN (screenshots 1 and 2).
   This check found one problem: the error message stayed visible while the student typed a new PIN.
   Claude changed the form to clear the message on input.
7. **Finish.** Claude ticked PR 7 in `MIGRATION.md`, added six quirk rows, committed `ee824d1`, pushed and
   opened PR #24 with the inventory and the verification notes as its body. PR #23 and PR #24 both change
   neighbouring lines in `MIGRATION.md`, so whichever is merged second will need `main` merged in first.
   The handoff memory was updated.

## Human vs. AI

- **Bruno decided / specified:** PR 7 as the next task (its scope comes from the Phase 2 breakdown in
  `MIGRATION.md`); the earlier Phase 2 decision that captcha games show a notice; asking for this devlog.
- **Claude proposed / implemented:** working in a separate worktree branched from `main`; the inventory;
  all code, tests and i18n keys; fixing (instead of replicating) the kick and rejoin bugs; the two-hour
  cookie lifetime; inline messages instead of alerts; the unload warning only while in a game; the "Enter
  another PIN" button on the captcha notice; `document.cookie` instead of `js-cookie`; the commit, PR #24,
  the handoff memory and this devlog.
- **Corrections Bruno made to AI output:** none so far. PR #24 has not been reviewed, and the choices above
  have not been confirmed by Bruno.

## Verification

- `pnpm typecheck` and `pnpm lint` clean. `pnpm test`: 330 of 330 (39 files), including the 14 new tests.
- Playwright: the full suite, 116 of 116 (desktop and mobile), including the two new tests in
  `play-join.spec.ts` (join with PIN, name and extra field, title screen, cookie, time-sync echo, kick;
  and the QR link that fills in the PIN). After the last code change only `play-join.spec.ts` was run
  again (4 of 4).
- Browser check in Brave through the `brave-devtools` MCP against the `compose.dev.yml` backend: the PIN
  screen, the real 404 for an unknown PIN, at 390 px in light mode and 1280 px in dark mode. No console
  errors; the only failed request was the app shell's signed-out `users/check` (401), which is not part
  of this route.
- Screenshots:
  - [390 px, light: an unknown PIN, answered by the real backend](../screenshots/2026-11-13-player-join-1.png)
  - [1280 px, dark: the same message, PIN taken from the URL](../screenshots/2026-11-13-player-join-2.png)
- **Not verified:** joining a real game against the real backend (only with the faked socket server in
  e2e); the name form, the title screen and the captcha notice in a browser; a quiz with a background
  colour or cover image; a real reload or connection loss with rejoin; a kick from the new host screen;
  the screen after the message fix (covered by the e2e and unit tests, not re-checked in the browser);
  screen-reader output; a side-by-side comparison with the legacy player screen.

## Observations for the thesis

- **Reading "intended behaviour".** The parity rule says to replicate what legacy *meant* to do. For the
  kick and rejoin bugs, the intent seemed clear from the code itself (a kick sets a one-day block; a cookie
  exists to make rejoining possible), and the bugs undo that intent. Here the AI made the call and flagged
  it for review; whether such calls should be left to the AI, or always be confirmed first, is a process
  question. TODO(Bruno): whether these two fixes are accepted.
- **A permission boundary shaped the verification.** The auto-mode classifier refused to let the agent use
  stored dev credentials from the command line. This was a safety feature working as designed, and its
  effect was a thinner browser check than in PR 6, where the dev account had been used. The gap is recorded
  above rather than filled with a workaround.
- **Students as users.** Messages that legacy showed as English `alert` boxes, or not at all, are now short
  sentences at A2–B1 level on the join card. The "can't join today" block after a kick is now visible to
  the student. TODO(Bruno): whether that wording is right for 11- to 16-year-olds, and whether the German
  is acceptable.
- **Parallel sessions.** Documentation for PR 6 and coding for PR 7 happened at the same time in the same
  repository. A git worktree kept the two apart without stashing or switching someone else's work.

## Open points

- PR #24 awaits review and merge; `MIGRATION.md` will conflict with PR #23 for whichever is merged second.
- A live end-to-end check (new host screen + new player screen against the real backend) is still due,
  ideally once PR #23 and PR #24 are both merged.
- TODO(Bruno): whether the deviations (kick and rejoin fixes, cookie lifetime, unload warning, captcha
  back button) need an ADR (suggested at the end of the session).
- Next: PR 8, the host question loop. PR 9 replaces the placeholder after the first question and extends
  `playStore.ts`.

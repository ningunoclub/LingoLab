# 2026-11-13: The player question loop (`/play` after the first question)

- **Phase / area:** Phase 2: Core loop (PR 9 of 12, ADR-0016; the last of four live-game PRs)
- **Related:** PR #28 (open at the time of writing; branch `web/play-question-loop`, commit `0720a4d`, branched
  from `main` at `815254a`); `MIGRATION.md` item "`/admin` and `/play`" (sub-item PR 9 and the parent item
  ticked), eight new Legacy quirks rows and one new manual-check item. No ADR written (one was suggested, see
  Open points)
- **Time spent (approx.):** TODO(Bruno)

## Goal

Port what a student sees on their phone from the first question to the end of the game: the answer screen for
each question type, the points after each question, and the final ranking. PR 7 (#24) had left a "coming soon"
placeholder once the first question arrived. With this PR the create → host → play loop is complete in `web/`.

Bruno's instruction was: "i reviewed 26. merge it and the get started on PR 9", and "ive skipped testing as for
now. well finish all PR's and then do a big test of everything". At the start of the session PR #26 was already
merged (`ddcab91`, together with its devlog #27), so there was nothing left to merge. Following the plan from
the previous session, Claude branched PR 9 from a fresh `main` instead of stacking it on an open PR, to avoid the
merge conflicts that stacked PRs had caused before.

## What happened

1. **Inventory.** Claude read the legacy route (`routes/play/+page.svelte`) and the components it uses after
   the first question: `lib/play/question.svelte` (366 lines), `questions/check.svelte`, `results_kahoot.svelte`,
   `circular_progress.svelte` and the end-screen half of `admin/final_results.svelte`. It also read the backend
   handlers `set_question_number`, `submit_answer`, `get_question_results` and `show_solutions`, the
   `ReturnQuestion` model and `check_answer`, to type the payloads. No backend change was needed. Because
   `MIGRATION.md` had already planned this as one PR, no split was proposed. The inventory became the body of
   PR #28.
2. **Findings that shaped the port** (all logged in `MIGRATION.md`):
   - The phone's end screen ranked players by the points the phone had added up itself from the results screens
     it had seen, not by the server's `final_results`. A player who rejoined mid-game saw a different ranking
     from the projector.
   - After the time ran out, the phone showed an empty screen until the results arrived.
   - In a multiple-choice (CHECK) question, switching every tile off again left an empty answer that could still
     be submitted, and the tiles stayed clickable after submitting.
   - The "your score / your place" box on the end screen was hidden for a player with 0 points.
   - Two strings were hardcoded in English ("Enter your answer", "Total score:").
   - The backend sends the accepted answers of TEXT questions to every phone, so the solution is visible in the
     socket traffic. Left unchanged (backend), flagged for after parity.
   - The backend broadcasts question results to the whole game, so players see a results screen even when the
     host chose "hide results". Replicated.
   - SLIDE questions are sent to the host only, so the player screen never needs to render a slide.
3. **Implementation** (by Claude), in `web/src/features/play/`:
   - `playerQuestion.ts`: parses the question sent by the server. TEXT answers are deliberately never kept, so
     the leaked solution cannot reach the screen. Small helpers for the slider start value, the CHECK answer
     string (e.g. `"02"` for the first and third tile) and moving ORDER items.
   - `playStore.ts` (Zustand) was extended with the current question, seconds left, "answer sent", the
     question's results, running scores (added once per question) and the final scores from the server.
   - `usePlayerGame.ts`: listeners for `everyone_answered`, `solutions`, `question_results` and
     `final_results`, a local one-second countdown (as in legacy), and a `submitAnswer` function that sends at
     most one answer per question. `submit_answer` gained its optional `complex_answer` field in
     `realtime/events.ts` (used by ORDER).
   - Screens: `PlayerQuestionScreen.tsx` plus one component per answer type (`PlayerChoiceAnswers`,
     `PlayerChoiceTile`, `PlayerRangeAnswer`, `PlayerTextAnswer`, `PlayerOrderAnswer`) and `PlayerResults.tsx`.
     Answer tiles carry a shape as well as a colour. In Kahoot mode they show only the shape (legacy showed
     icons) and keep the answer text as an accessible name. RANGE uses the shadcn Slider; ORDER keeps legacy's
     up/down buttons. When a RANGE question runs out of time unanswered, the slider value is sent, as in legacy.
   - Shared pieces from PR #26 were reused: `CountdownRing`, the score helpers in `hostLoop.ts`, and
     `FinalRanking`, which received an optional `username` prop for the player's own score and place.
   - Four new i18n keys under `play_page.loop.*` (en + de). The rest reuses legacy keys.
4. **Problems during the build.**
   - The question-type import used a wrong type name (`QuestionType` instead of `QuizQuestionType`); fixed
     before the first type check.
   - One component test failed with `ReferenceError: ResizeObserver is not defined`: the Radix slider needs it
     and the jsdom test environment lacks it. Claude added a small stub in that test file.
   - The visual check showed that the outline around a selected answer tile was black in dark mode as well.
     Claude replaced the outline with a ring in the foreground colour. **This fix was not re-screenshotted**;
     the unit and e2e tests were re-run afterwards.
5. **Tests.** Unit tests for `playerQuestion.ts` (including that TEXT answers are never kept), for the store
   (timer, points counted once, `null` results, final totals) and for `PlayerQuestionScreen` (single choice,
   Kahoot mode, CHECK, ORDER, TEXT, RANGE auto-submit). A new e2e test (`tests/e2e/play-game.spec.ts`) joins a
   game and plays two questions against a fake Socket.IO server, following the `routeWebSocket` pattern from
   PR #23, up to the final ranking with the player's own place. It passed on the first run, on desktop and
   mobile.
6. **Visual check.** As for PR #26, Claude used a temporary Playwright test with the same fake server instead of
   the `brave-devtools` browser, and took 48 screenshots: every screen at 390 and 1280 px, in light and dark
   mode, in normal and Kahoot mode. The temporary test was deleted afterwards.
7. **Finish.** Claude ticked PR 9 and the parent `/admin` + `/play` item in `MIGRATION.md`, added the quirk rows
   and a manual-check item, committed `0720a4d`, opened PR #28 with the inventory as its body and updated the
   handoff memory.

## Human vs. AI

- **Bruno decided / specified:** PR 9 as the next task (its scope comes from the Phase 2 breakdown in
  `MIGRATION.md`); that he does no manual testing until all PRs are done; asking for this devlog.
- **Claude proposed / implemented:** the inventory; all code, tests and i18n keys; the commit and PR #28; this
  devlog. These choices are Claude's and are listed in `MIGRATION.md` or PR #28: ranking the end screen by the
  server's totals instead of the phone's own sum; the "Time is up" message; requiring at least one tile in
  CHECK and locking the tiles after submitting; showing the score box at 0 points; not reading the leaked TEXT
  answers; shapes only in Kahoot mode; keeping legacy's up/down buttons for ORDER instead of drag and drop;
  marking the chosen tile with a ring and a check mark.
- **Corrections Bruno made to AI output:** none so far. PR #28 had not been reviewed when this entry was
  written. TODO(Bruno): note any changes from the review.

## Verification

- `pnpm typecheck` and `pnpm lint` clean. `pnpm test`: 380 of 380 (46 files). Full `pnpm e2e`: 126 of 126.
- Screenshots (fake server, not the real backend; all taken before the dark-mode ring fix):
  - [390 px, light: single-choice question after answering](../screenshots/2026-11-13-player-question-loop-1.png)
  - [390 px, dark, Kahoot mode: shapes only; the black selection outline here is the bug fixed afterwards](../screenshots/2026-11-13-player-question-loop-2.png)
  - [390 px, dark: points after a question](../screenshots/2026-11-13-player-question-loop-3.png)
  - [1280 px, light: final ranking with the player's own score and place](../screenshots/2026-11-13-player-question-loop-4.png)
- **Not verified:** the player loop against the real backend (and so together with the real host screen); a
  real phone and touch input on the slider; a reload mid-question (rejoin); the dark-mode ring after the fix;
  a side-by-side comparison with the legacy player screen; the accessibility tree through `brave-devtools`
  (part of the definition of done in `web/CLAUDE.md`). These checks were added to the end-of-rewrite manual
  test list in `MIGRATION.md`.

## Observations for the thesis

- **The loop is complete, but only on mocks.** Create → host → play now exists in `web/`, but host and player
  screens have each been tested only against a fake server written from the same reading of the backend code.
  If that reading is wrong, both fakes are wrong in the same way. Bruno chose to defer all manual testing to one
  pass after parity; the risk of this is now concentrated in a single, larger test session.
  TODO(Bruno): whether the live end-to-end check should be pulled forward now that the loop is complete.
- **A privacy finding in the backend.** The TEXT-answer leak matters for a classroom quiz: a student who opens
  the browser tools can read the solution. The frontend can avoid showing it but cannot stop it from being sent.
  This is a case where the rule "do not modify the backend" during the rewrite leaves a known issue open.
- **"Intended behaviour" again decided by the AI.** As in PR #26, Claude decided in each quirk what legacy
  intended (for example, that the end screen should match the projector). The decisions are logged, but none
  had been reviewed by Bruno when this entry was written.
- **Screenshots found what tests did not.** The black selection outline in dark mode passed every automated test;
  only the screenshots showed it.

## Open points

- ADR suggested at the end of the session (end screen ranked by the server's totals instead of the phone's own
  sum). TODO(Bruno): decide whether to write it.
- Backend: TEXT answers sent to players, and results broadcast for "hide results" questions. Flagged for after
  parity.
- Live end-to-end check of host and player screens against the real backend is still owed (since PR 6).
- Next: PR 10, `/results` and `/results/[result_id]`.

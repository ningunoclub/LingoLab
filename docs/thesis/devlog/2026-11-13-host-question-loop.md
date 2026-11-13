# 2026-11-13: The host question loop (`/admin` after the game starts)

- **Phase / area:** Phase 2: Core loop (PR 8 of 12, ADR-0016; the third of four live-game PRs)
- **Related:** PR #26 (squash-merged as `ddcab91`; branch commit `ec1b5d2`, branched from `main` at `1ac4d5a`);
  `MIGRATION.md` item "`/admin` and `/play`", sub-item PR 8, and seven new Legacy quirks rows. No ADR written
  (one was suggested at the end of the session, see Open points)
- **Time spent (approx.):** TODO(Bruno)

## Goal

Port the part of the host screen that runs a game: showing each question with a countdown, stopping the time,
showing the solutions and the results per question, moving on, and ending with the final ranking, the result
export and "save results". PR 6 (#23) had left a "coming soon" placeholder after "Start game". Bruno's
instruction was one line: "can we get started on PR 8?" The scope of PR 8 had been set earlier in `MIGRATION.md`.

## What happened

1. **Inventory.** Claude read the legacy route (`admin/+page.svelte`), `lib/admin.svelte` and the eight files in
   `lib/play/admin/` (controls, question, results, voting results, final results, slide, socket controls,
   game state), about 800 lines in total. `MIGRATION.md` already planned this as one PR, so no split was
   proposed. Claude also read the backend handlers for `set_question_number`, `get_question_results`,
   `show_solutions`, `get_final_results`, `get_export_token`, `save_quiz` and `submit_answer` in
   `classquiz/socket_server/__init__.py`, to type the payloads. No backend change was needed. The inventory
   became the body of PR #26.
2. **Findings that shaped the port** (all logged in `MIGRATION.md`):
   - The "what happens next" logic existed twice in legacy: once in the control button (`controls.svelte`) and
     once in the Enter/Space handler (`next_action`). The two copies disagreed on questions with
     `hide_results`.
   - On the last question with `hide_results`, the button asked the backend for a question that does not exist.
   - The final ranking added up only the points from results screens the host had actually shown, so points
     from `hide_results` questions were missing.
   - The "No answers!" message could never appear, because the backend always sends a list (empty if nobody
     answered).
   - The legacy client counted its own question number up by one instead of reading the index the server sent.
   - The backend broadcasts `player_answer` and `everyone_answered` to every connected client, not only to the
     game's room. With two games at the same time, answer counts would mix. Left unchanged (backend), flagged
     for after parity.
3. **Implementation** (by Claude), mostly in `web/src/features/host/`:
   - `hostLoop.ts`: one pure function, `nextHostAction`, decides the next step from the quiz and the loop state.
     The control button and Enter/Space both use it, which replaces legacy's two copies. The same file holds
     the score helpers (parsing answers, adding points, totals from `final_results`, ranking, vote counts).
   - `hostStore.ts` (Zustand) was extended with the loop state: question index, seconds left, answer count,
     results, running scores, final scores, export token, "saved". Points are added once per question, so a
     second results request does not count them twice.
   - `useHostGame.ts`: eight more socket listeners, the local one-second countdown (as in legacy, the server
     only says when a question starts and when everyone has answered), and the emits for each action.
   - `gameQuiz.ts`: the question fields are now validated (type, time, image, `hide_results`), with harmless
     defaults so that one odd question cannot block the whole game.
   - Screens: `HostGame.tsx` (layout and keyboard), `HostControlBar.tsx`, `HostQuestion.tsx`, `HostAnswer.tsx`,
     `HostResults.tsx` (scoreboard of the top four with points added after one second, and an answer chart).
     Slides use the shared `SlideRenderer` from PR #21; the title screen reuses the player's `GameTitle` from
     PR #24.
   - Two shared components in `web/src/components/`: `CountdownRing.tsx` and `FinalRanking.tsx` (top five,
     revealed from fifth to first with legacy's timing, then confetti). PR 9 is meant to reuse both.
   - New dependency: `canvas-confetti` 1.9.4 (ISC). `web/CLAUDE.md` lists it as a legacy library to keep.
     It is not called at all when the viewer prefers reduced motion.
   - Eleven new i18n keys under `admin_page.loop.*` (en + de), mostly screen-reader labels for things legacy
     showed only visually (timer, correct/wrong marks, the chart).
4. **Problems during the build.**
   - A scripted edit to the header of `hostStore.ts` did not match the existing text, so the new imports were
     never added. `pnpm typecheck` reported no error at that point; the unit tests then failed with
     `ReferenceError: questionSeconds is not defined`. Why the type check passed was not investigated.
   - Three existing store tests failed because the new question schema rejected a test question without
     `answers`. Claude made the field optional. After both fixes all unit tests passed.
   - Biome rejected an object property named `then` (it makes the object look like a promise). Claude renamed
     it to `after`.
5. **Tests.** 11 unit tests for `hostLoop.ts` (the next-action table and the score maths) and four loop tests in
   `useHostGame.test.tsx` (countdown with fake timers, answer count, results sent twice, the 200 ms pause after
   hidden results, export and save). A new e2e test (`tests/e2e/admin-game.spec.ts`) plays a whole two-question
   game against a fake Socket.IO server that answers each emit as the backend would, following the
   `routeWebSocket` pattern from PR #23. It passed on the first run, on desktop and mobile.
6. **Visual check.** A live game needs a signed-in session, which earlier sessions could not create
   automatically. Claude therefore took screenshots through a temporary Playwright test with the same fake
   server, at 1280 and 390 px in light and dark mode, and deleted the test afterwards. There were no console
   errors. The results screenshot showed the vote counts far above short bars in the chart. Claude moved
   each count onto its bar; **this fix was not re-screenshotted.**
7. **Finish.** Claude ticked PR 8 in `MIGRATION.md`, added seven quirk rows, committed `ec1b5d2`, opened PR #26
   with the inventory as its body and updated the handoff memory.
8. **Review and merge.** Bruno asked Claude to review and merge PR #26 itself, "using your best judgement",
   mainly by checking the Legacy quirks rows. Claude checked the seven rows, judged that each one either leaves
   the backend unchanged or follows what legacy evidently intended, recorded this as a comment on the PR, and
   squash-merged it (`ddcab91`). No code was changed during the review.

## Human vs. AI

- **Bruno decided / specified:** PR 8 as the next task (its scope comes from the Phase 2 breakdown in
  `MIGRATION.md`); asking for this devlog; delegating the review and merge of PR #26 and of this docs PR to
  Claude.
- **Claude proposed / implemented:** the inventory; all code, tests and i18n keys; the commit and PR #26; this
  devlog. These choices are Claude's and are listed in `MIGRATION.md` or PR #26: one shared next-step function
  instead of two copies; "Get final results" on a last question with hidden results; final totals from the
  server's `final_results`; showing "No answers!" when nobody answered; using the server's question index;
  adding `canvas-confetti`; marking correct and wrong answers with icons as well as colour; repeating the
  question text above the results; not reproducing the scoreboard's row-reorder animation; dropping unused
  legacy leftovers (a hidden download link, an unused confetti canvas, a 200 ms switch-off of the leave warning).
- **Corrections Bruno made to AI output:** none. Bruno did not review PR #26 himself: he delegated the review to
  Claude, so the choices above were checked only by the same AI that made them.

## Verification

- `pnpm typecheck` and `pnpm lint` clean. `pnpm test`: 362 of 362 (43 files). Full `pnpm e2e`: 124 of 124.
- Screenshots (fake server, not the real backend):
  - [1280 px, light: a running question with the countdown](../screenshots/2026-11-13-host-question-loop-1.png)
  - [390 px, light: after "Stop time"; taken during the one-second transition, so the ring and the dimming of the wrong answer are not finished yet](../screenshots/2026-11-13-host-question-loop-2.png)
  - [1280 px, dark: scoreboard and answer chart, before the chart-label fix](../screenshots/2026-11-13-host-question-loop-3.png)
  - [1280 px, light: final ranking with export and save buttons, and confetti](../screenshots/2026-11-13-host-question-loop-4.png)
- **Not verified:** the loop against the real backend (needs a signed-in session); question types other than
  ABCD on the host screen (VOTING, TEXT, CHECK, RANGE, ORDER and SLIDE are covered only by the code paths and
  unit tests); the chart after the label fix; the downloaded export file; "save results" reaching the database;
  a projector; screen-reader output; a side-by-side comparison with the legacy host screen; the accessibility
  tree through `brave-devtools` (part of the definition of done in `web/CLAUDE.md`).

## Observations for the thesis

- **Two copies of one rule had drifted apart.** Legacy decided "what comes next" in two places, and the copies
  behaved differently in an edge case. Moving the decision into one pure function made it testable as a table
  of states and actions. It also turned some legacy behaviour into a decision: where the two copies disagreed,
  the port had to pick one.
- **Parity versus intended behaviour.** Several findings (the missing points in the final ranking, the dead
  "No answers!" branch, the request for a non-existent question) were bugs rather than features. The project
  rule is to replicate the *intended* behaviour and log the difference. Claude decided what "intended" meant in
  each case, and at Bruno's request also reviewed and merged its own PR. TODO(Bruno): whether self-review by
  the AI is acceptable for parity PRs, and how this is reflected in the thesis method chapter.
- **Mocked tests and missing evidence.** The whole loop was tested against a fake server. This made the tests
  fast and stable, but nothing in this session shows that the real backend sends what the fake server sends.
  The same gap was open after PRs 6 and 7. TODO(Bruno): whether a live end-to-end session (host and player)
  should happen before PR 9 or after it.
- **A green type check was not proof.** A failed edit left a file without its imports, and the type check
  still passed. The unit tests caught the problem. Having several kinds of checks mattered here.

## Open points

- ADR suggested at the end of the session (one shared next-step function, final ranking from the server's
  totals, adding `canvas-confetti`). TODO(Bruno): decide whether to write it.
- The backend broadcast of `player_answer` / `everyone_answered` across games is a real classroom risk if two
  teachers play at the same time. Flagged for after parity.
- Live check of host and player screens against the real backend is still owed (since PR 6).
- Next: PR 9, the player question loop (`/play` after the first question).

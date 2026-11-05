# 2026-09-30: The remaining question types in the quiz editor (CHECK, TEXT, ORDER, RANGE, VOTING)

- **Phase / area:** Phase 2: Core loop (PR 2 of 12, ADR-0016)
- **Related:** PR #14 (open; commit `ebd7aa9` on `web/editor-question-types`); PR #13; ADR-0015; ADR-0016; `MIGRATION.md` item "`/create` and `/edit`", sub-item PR 2; devlog [PR 1](2026-09-30-editor-shell-abcd.md)
- **Time spent (approx.):** Not tracked per session. About 15 hours of coding in total from the workspace setup to PR #14 (Bruno's estimate, 2026-11-05).

## Goal

Make every question type except SLIDE addable and editable in the editor. Bruno's instruction
was: "Start PR 2: the remaining question types (CHECK, TEXT, ORDER, RANGE, VOTING). The validation
schemas for all five are already in place, so this is mostly one answer component per type. CHECK
reuses the ABCD component almost as is."

## What happened

1. **Inventory.** After PR #13 was merged, Claude branched `web/editor-question-types` from `main`
   and read the legacy sources: `card.svelte` (the type switch), `ABCDEditorPart.svelte`,
   `VotingEditorPart.svelte`, `OrderEditorPart.svelte`, `TextEditorPart.svelte`,
   `RangeSelectorEditorPart.svelte`, the per-type summaries in `sidebar.svelte`, and the backend
   answer models in `classquiz/db/models.py`.
2. **Quirks found in the legacy parts**, each logged in `MIGRATION.md` (five new rows):
   - `TextEditorPart` rebuilt every answer with `case_sensitive: false` on mount. Opening a TEXT
     question therefore silently switched off a stored "case sensitive" setting.
   - `RangeSelectorEditorPart` limited the bounds only through the inputs' `min`/`max` attributes,
     which a typed value ignores. A quiz with `max ≤ min` could be saved.
   - `OrderEditorPart` added a client-side `id` to each answer (an array for stored answers, a
     number for new ones) and sent it; the backend model drops it.
   - The RANGE sentence in the sidebar and the TEXT tooltip were hardcoded English.
3. **Implementation** (by Claude):
   - CHECK uses `AbcdAnswers` unchanged, as legacy uses one component for both.
   - The colour tile and the "add an answer" slot were extracted from PR 1's `AbcdAnswers` into
     `ColorAnswerTile` and `AddAnswerButton`, which `VotingAnswers` and `OrderAnswers` reuse.
   - `TextAnswers` has a labelled pressed/unpressed button for case sensitivity.
   - `RangeAnswerEditor` has two number fields and a two-thumb slider. The shadcn `slider` was
     added with the shadcn CLI; `radix-ui` was already a dependency, so no package was added.
     The generated file imported `cn` from the npm package `cn`; Claude changed it to
     `@/lib/utils`, enlarged the thumbs and added a `thumbLabels` prop for accessible names.
   - Answers are normalised when the quiz is loaded (missing colours, a RANGE question without
     numbers), as PR 1 already did for ABCD.
   - Nine new i18n keys (en + de). The German strings use "ß" to match the upstream file.
4. **Deviations from legacy.**
   - *TEXT keeps the stored case sensitivity.* A fix under ADR-0015: the legacy code cannot do what
     it evidently intends, since it offers the toggle and then discards its value.
   - *ORDER does not send `id`.* No observable effect; the backend drops the field.
   - *RANGE validation is stricter.* A save is blocked when the highest number is not above the
     lowest (`editor.errors.range_min_max`). Claude added this rule to the schema although
     Bruno's instruction described the schemas as already in place, and flagged it in the final
     report and the PR description as open to reversal. Claude treated it as a fix under
     ADR-0015 (the attributes show the intent; a reversed range breaks the slider). It is the
     arguable case: ADR-0015 also says to replicate "when changing it would alter which … inputs
     the system accepts", and a stored quiz that violates the rule can no longer be saved until it
     is corrected. No separate ADR was written. Bruno confirmed on 2026-11-05 that the stricter
     rule stays.
5. **A design correction during implementation.** The first version pulled the correct span
   inside the bounds on every keystroke. Claude noticed before running it that typing "50" over
   "10" passes through "5", which would have narrowed a 3–7 span to 3–5 permanently. The clamp was
   moved to the moment a bound field is left.
6. **Two test failures, both in the tests.** The new e2e test looked for "Check-Choice" where the
   English label is "Check Choice". An existing test still expected the "can't be edited here yet"
   note on a RANGE question; it now asserts that the stored range is shown and saved unchanged.
7. **Finish.** `MIGRATION.md` was updated (PR 2 ticked, five quirk rows, one manual check), the
   work was committed as `ebd7aa9` and PR #14 was opened with the route inventory as its body.

## Human vs. AI

- **Bruno decided / specified:** the scope (the five types, one answer component per type, CHECK
  reusing the ABCD component); the Phase 2 plan (ADR-0016).
- **Claude proposed / implemented:** all code, tests and i18n keys; the extraction of the shared
  tile; keeping legacy's up/down buttons for ORDER instead of drag and drop; the stricter RANGE
  rule; the three deviations above; the PR.
- **Corrections Bruno made to AI output:** none so far. PR #14 has not been reviewed yet.

## Verification

- `pnpm typecheck` and `pnpm lint` clean. `pnpm test`: 248 of 248 (ten more than before,
  covering normalisation per type, `fitRange` and the new RANGE rule).
- Playwright: 104 of 104 across the suite (desktop and mobile). One new test builds a question of
  each of the five types, reorders ORDER answers, triggers the RANGE error, checks that the
  correct span follows new bounds, and asserts the saved request body.
- Backend round-trip against the real `compose.dev.yml` backend: a quiz with one question of each
  type, shaped as the editor sends it, was accepted by `POST /editor/finish` (200) and returned
  unchanged by `GET /quiz/list`, except that the backend adds `image: null` to VOTING and ORDER
  answers. The payload was sent by a script from the signed-in page, **not by clicking Save in
  the editor**.
- Browser check in Brave through the `brave-devtools` MCP: that quiz opened on `/edit`; every type
  showed its controls with accessible names; no console errors; no horizontal overflow at 1280 px
  and 390 px.
- Screenshots (both in dark mode):
  - [1280 px, RANGE question](../screenshots/2026-09-30-editor-question-types-1.png)
  - [390 px, ORDER question](../screenshots/2026-09-30-editor-question-types-2.png)
- **Not verified:** light mode; dragging the slider thumbs with a mouse or a finger; playing any
  of the types after saving them here; no side-by-side comparison with the legacy app. The check
  left a private quiz "PR 2 type check" in the dev account.

## Observations for the thesis

- **Silent data loss in the legacy editor.** The TEXT quirk means a teacher who marked an answer
  as case sensitive lost that setting by merely reopening the question. For language teaching,
  where capitalisation can be the point of a question, this is relevant to the EFL use case.
  TODO(Bruno): whether this is worth reporting upstream.
- **The fix/replicate criterion has a grey zone for validation.** The RANGE rule meets the "fix"
  wording and the "replicate" wording of ADR-0015 at once (step 4). Stricter validation is the
  first kind of change in this project where that happened.
- **An instruction's premise was partly overridden.** "The schemas are already in place" was true
  for parity with legacy; Claude still changed one. It disclosed the change instead of making it
  silently, which is what the project rules ask for, but the decision is Bruno's.

## Open points

- PR #14 awaits review and merge; the RANGE rule is the item to decide.
- Next: PR 3, media upload (custom dropzone, ADR-0016).
- Manual checks logged in `MIGRATION.md`: slider by mouse and finger; playing each type.
- `cn` import inconsistency in five older ui components (unchanged since PR #12).

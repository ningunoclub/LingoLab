# 2026-09-30: The quiz editor shell with ABCD questions (/create, /edit): review and merge

- **Phase / area:** Phase 2: Core loop (PR 1 of 12, ADR-0016)
- **Related:** PR #13 (squash-merged as `9c4c9b0`); ADR-0016; ADR-0017; `MIGRATION.md` item "`/create` and `/edit`", sub-item PR 1
- **Time spent (approx.):** Not tracked per session. About 15 hours of coding in total from the workspace setup to PR #14 (Bruno's estimate, 2026-11-05).

## Goal

Port the editor shared by `/create` and `/edit` far enough that a teacher can create a
multiple-choice quiz, save it and reopen it from the dashboard. This entry covers the review and
merge of that work.

**Scope of this record.** PR #13 was built in an earlier Claude Code session that is not part of
the session this entry was written from. The account of the build below rests on the PR
description, commit `9c4c9b0` and `MIGRATION.md`; the account of the review and merge is
first-hand.

## What happened

1. **What the PR contained** (from its description and the merged code):
   - Both routes with their guards, the edit session (`POST /editor/start`, `POST /editor/finish`),
     the validation schema ported from yup to zod, a localStorage draft for `/create`, a leave
     warning, the settings card, the sidebar, the add-question dialog and ABCD questions.
   - By plan, only ABCD questions could be added or edited. Questions of other types in an existing
     quiz were listed and kept untouched through a save. Image fields were inert and the title and
     question text were plain inputs (PRs 3 and 4).
   - New dependency: `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` (all MIT).
   - 18 rows were added to the "Legacy quirks" table. Two of them are fixes of behaviour that could
     not work in legacy: the draft was written under `edit_game` but read from `create_game`, so it
     was never restored; and a save after the one-hour edit session answered `alert('Error')`.
2. **Three choices were put to review.** The PR description listed them under "Choices made while
   porting", and Bruno's instruction for this session named them:
   - editor state as plain React state plus zod instead of `react-hook-form`;
   - reordering by a drag handle (`@dnd-kit`) instead of legacy's "reorder mode";
   - the design system's answer colours 1–4 as default answer colours instead of legacy's set.
3. **Review** (by Claude, in this session). Claude read the 27 changed files and checked:
   - the three choices (step 4);
   - the backend model `QuizQuestion`, to confirm that rebuilding a question from six fields loses
     nothing;
   - the default colours against `web/src/index.css` and the `lingolab-design` skill (identical to
     `--answer-1` … `--answer-4`);
   - the licence field of the three `@dnd-kit` packages in `node_modules` (MIT).
4. **Outcome of the review.** Claude agreed with all three choices and reported no blocking
   finding. The reasoning for the first is recorded in ADR-0017. The second was already planned in
   `MIGRATION.md` and `web/CLAUDE.md` (`sortablejs` → `@dnd-kit`). Two minor observations were
   noted and not acted on: the time field accepts values such as `1e5` or `1.5` (as legacy does),
   and a draft can go stale when a teacher undoes every change.
5. **Attribution.** Bruno's instruction asked for `@dnd-kit` to be added to `attribution.md`. Claude
   added the row on the PR branch (`docs(thesis): list @dnd-kit in the attribution table`) before
   merging, so that it travelled with the PR that introduced the dependency.
6. **Merge.** The PR had no CI checks and was mergeable. Claude squash-merged it, as the earlier
   PRs had been. The pull of `main` then failed: local `main` carried the ADR-0016 commit
   (`37b14fb`), which had never been pushed to `origin/main` but was part of the PR branch and
   therefore of the squash. Claude confirmed that `docs/thesis/decisions` was identical in
   `37b14fb` and `origin/main`, then rebased; git dropped the commit as already upstream.
7. **Documentation could not be started by Claude.** Bruno's instruction also asked Claude to run
   `/document devlog` and `/document adr`. The skill is user-only
   (`disable-model-invocation: true`), so Claude did not run it and said so; Bruno started it
   himself later in the session.

## Human vs. AI

- **Bruno decided / specified:** that PR #13 be reviewed and merged; that the three choices be
  challenged before merging if Claude disagreed; that `@dnd-kit` be added to `attribution.md`; the
  Phase 2 plan the PR follows (ADR-0016).
- **Claude proposed / implemented:** according to the PR description, all code, tests and the
  three choices (in the earlier session); in this session the review, the attribution row, the
  squash merge and the repair of local `main`.
- **Corrections Bruno made to AI output:** none in this session. TODO(Bruno): corrections made
  during the build session, if any.

## Verification

- Run by Claude on the PR branch before merging: `pnpm typecheck` and `pnpm lint` clean;
  `pnpm test` 238 of 238; `pnpm e2e` 102 of 102 (desktop and mobile projects).
- From the PR description, not repeated in this session: a browser check against the real backend
  (a quiz "Weather words" created on `/create`, saved and reopened on `/edit`; 1280 px and 390 px,
  light and dark; accessibility tree).
- **Not verified:** dragging with a mouse or a finger, and a save after the one-hour session
  expiry against the real backend (both logged under "Manual checks before cut-over"). No
  side-by-side comparison with the legacy app. No screenshots from the build session are on
  record.

## Observations for the thesis

- **An AI reviewing AI-written code.** The review in this session was done by a Claude session
  with no memory of the build. It worked from the same artefacts a human reviewer would have: the
  diff, the PR description and the quirks table. Bruno delegated both the review and the merge;
  the "How AI output is checked" list in `ai-usage.md` states that Bruno reviews and merges every
  PR. Bruno confirmed on 2026-11-05 that the delegated merge was an exception; the list stands.
- **A guardrail held.** The user-only flag on `/document` prevented Claude from writing thesis
  documentation on the strength of an instruction it could not be certain was meant that way.
- **A documented stack rule was deviated from.** `web/CLAUDE.md` says "don't swap libraries
  without asking" and lists `react-hook-form` for forms. The deviation was disclosed in the PR
  description and is recorded in ADR-0017.

## Open points

- ADR-0017 is proposed; Bruno's confirmation is pending.
- The stack table in `web/CLAUDE.md` still lists `react-hook-form` for all forms.
- `origin/web/editor-shell` still exists after the merge. Nothing is deleted without Bruno's
  approval.
- The i18n keys `editor.enable_reorder` / `disable_reorder` are now unused.

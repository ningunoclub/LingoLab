# ADR-0017: Hold the quiz editor's state in plain React state with zod, not react-hook-form

- **Status:** Accepted (implemented and merged with PR #13; accepted by Bruno on 2026-11-05)
- **Date:** 2026-09-30
- **Decided by:** Bruno (confirmed on 2026-11-05). The choice was implemented while building PR #13
  and disclosed in the PR description; a second Claude session reviewed it before the merge and agreed.

## Context

ADR-0006 and the stack table in `web/CLAUDE.md` name `react-hook-form` + zod for forms, as the
replacement for legacy's felte + yup, and `web/CLAUDE.md` adds "don't swap libraries without
asking". The account forms of Phase 1 follow this.

The quiz editor (`/create`, `/edit`) is not a form in the same sense:

- Legacy `lib/editor.svelte` holds the whole quiz as one object and validates it as a whole on
  every change (`dataSchema`). The top bar shows the first problem; Save is disabled while any
  exists. There is no submit-time validation and no per-field "touched" state.
- A question's `answers` has a different shape per type: a list of `{answer, right, color}`, a
  list of `{answer, case_sensitive}`, a single `{min, max, min_correct, max_correct}` object, or a
  string (SLIDE). The backend model declares it as a union.
- Questions are added, deleted and reordered, and the same data is written to a localStorage
  draft and compared with its initial state for the leave warning.

## Options considered

1. **`react-hook-form` with `useFieldArray` and the zod resolver.** Pro: follows the documented
   stack; one form idiom across the app. Con: the union-typed `answers` defeats RHF's typed field
   paths (stated in the PR description), so the answer parts would need casts or untyped paths;
   RHF's model is field registration and submit-time or per-field validation, while the editor
   needs the whole document validated on every change and read from outside the form (draft,
   dirty check, sidebar marks).
2. **Plain React state plus zod** (chosen in PR #13). One `useState` holds the quiz; `validateQuiz`
   runs the zod schema over it in a `useMemo`; components receive a value and an `onChange`.
   Pro: mirrors the legacy data flow one to one, which helps the parity comparison; the question
   type selects the answer schema, so types stay exact; no new concept. Con: deviates from the
   documented stack; every change re-validates and re-renders the editor.
3. **A store (Zustand).** Rejected without trial: `web/CLAUDE.md` reserves Zustand for live
   game and lobby state.

## Decision

Option 2, for the quiz editor only. `react-hook-form` remains the choice for ordinary forms
(login, register, settings), and remains a dependency.

## Consequences

- Positive: the editor's validation is a pure function of the quiz (`validateQuiz`), tested
  without rendering anything (`editorSchema.test.ts`). PR #14 added five answer types by adding
  one component each, with no form wiring.
- Positive: the draft, the dirty check and the save body are all derived from the same state.
- Negative: two form idioms now exist in `web/`. A contributor has to know which applies where.
- Negative: whole-document validation on every keystroke. The limit is 50 questions with at most
  four answers each; no performance problem was observed, and none was measured.
- Follow-up: the stack table in `web/CLAUDE.md` and the felte/yup row of its translation table
  should note the exception. Not done yet.
- For the thesis: the departure from the written stack rule was Bruno's own decision (confirmed
  on 2026-11-05), not the agent overriding the rule on its own. The build session is not on
  record, so the exchange in which the decision was made is not documented here.

## References

- PR #13 (`9c4c9b0`), section "Choices made while porting"; `web/src/features/editor/QuizEditor.tsx`,
  `editorSchema.ts`
- PR #14 (`ebd7aa9`), which builds on the choice
- ADR-0006 (frontend stack), ADR-0003 (parity first)
- Legacy: `frontend/src/lib/editor.svelte`, `frontend/src/lib/yupSchemas.ts`
- Devlog: [2026-09-30 editor shell](../devlog/2026-09-30-editor-shell-abcd.md)

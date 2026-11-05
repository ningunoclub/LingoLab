# ADR-0019: Rich text with Tiptap: a single-line field, a fixed toolbar, `<del>` for strikethrough and sanitised rendering

- **Status:** Proposed
- **Date:** 2026-11-05
- **Decided by:** TODO(Bruno): accept or reject. Replacing CKEditor 5 with Tiptap was Bruno's decision (ADR-0004, ADR-0006). The four choices below were proposed and implemented by Claude in PR #19, which Bruno has not reviewed yet.

## Context

Legacy edits the quiz title and each question's text with `lib/inline-editor.svelte`, a CKEditor 5
balloon editor with the plugins Bold, Italic, Strikethrough, Subscript, Superscript, Autoformat,
TextTransformation and Undo. CKEditor 5 is GPL or commercial, so the stack decision (ADR-0006)
already set Tiptap as its replacement. Phase 2 PR 4 (ADR-0016) ports the field.

Four questions came up that the stack decision does not answer. Each involves a legacy behaviour
that ADR-0015's criterion has to classify:

1. **Line breaks.** CKEditor creates a paragraph on Enter and a `<br>` on Shift+Enter. The component
   removes only the first `<p>`/`</p>`, and the backend (`bleach.clean` with `ALLOWED_TAGS_FOR_QUIZ` =
   `b strong i em small mark del sub sup`) strips every other block tag on save. A line break
   therefore never survives a save, and the words on either side of it run together. The
   `enterMode`/`shiftEnterMode` options in the component are CKEditor 4 syntax and have no effect.
2. **Strikethrough.** CKEditor writes strikethrough as `<s>`. `s` is not in the backend allowlist,
   so strikethrough is removed on every save while the button stays available.
3. **Toolbar placement.** The balloon toolbar appears only after the text has been selected with a
   mouse or a finger. It cannot be found or reached with the keyboard, and the field has no
   accessible label. `web/CLAUDE.md` requires every action to work with the keyboard and every
   input to have a label.
4. **Rendering stored HTML.** Legacy shows titles and questions with Svelte's `{@html}`, unfiltered,
   and relies on the backend's bleach. In `web/` the existing views showed the raw string, which
   would display the tags as text once formatting is saved.

## Options considered

**Line breaks**
1. *Replicate:* allow paragraphs or hard breaks in the editor. Pros: same keys as legacy. Cons: the
   teacher sees a line break that the save removes and the words run together.
2. *Single-line field:* the document schema allows only inline text (`content: 'text*'`); Enter does
   nothing; pasted lines and paragraphs are joined with a space. Pros: what the teacher sees is what
   gets stored. Cons: Enter behaves differently from legacy.

**Strikethrough**
1. *Replicate `<s>`:* the format is lost on save, as in legacy.
2. *Write `<del>`:* in the allowlist, so it is kept. `<s>` from older quizzes is still read.
3. *Remove the button.* Cons: drops a legacy feature.

**Toolbar**
1. *Balloon (Tiptap `BubbleMenu`):* closest to legacy's look. Cons: the same keyboard and touch
   problems as legacy.
2. *Fixed toolbar above the text:* ARIA `toolbar` pattern (one Tab stop, arrow keys), the same seven
   buttons, 44 px targets on touch screens. Cons: a visible change and a little more vertical space.

**Rendering**
1. *Trust the backend*, as legacy does (`dangerouslySetInnerHTML` with the stored string).
2. *Sanitise in the browser too*, with DOMPurify and the backend's allowlist. Plain text (tags
   removed, entities decoded) where markup cannot appear: tooltips and translated sentences.

## Decision

Option 2 in each group: a single-line field, `<del>` for strikethrough, a fixed toolbar, and
sanitised rendering through `components/RichText.tsx`. Against ADR-0015:

- Line breaks and strikethrough are **fixes**: the code cannot do what it evidently intends (a
  button whose result is always discarded; a line break that is always discarded). Neither changes
  which users, devices or inputs the system accepts. Each is pinned by a unit test.
- The fixed toolbar is a **restyle with an accessibility fix**: same buttons, same marks, same stored
  HTML, but reachable by keyboard and labelled.
- Sanitising is a **defence-in-depth fix**: public quizzes carry HTML written by other users, and
  ADR-0015 counts security defects as fixes.

Two smaller choices made along the way: the Typography extension (replacing TextTransformation) runs
with its `2x3` → `2×3` rule switched off, because in a language quiz an "x" after a number is rarely
a multiplication sign. Validation still counts the HTML length including tags, as legacy's yup
schema did.

## Consequences

- The stored format is unchanged (inline HTML without `<p>`), so quizzes stay compatible with the
  backend, with legacy and with quizzes written by legacy.
- Every view that shows a title, description or question must use `RichText` or `richTextToPlain`.
  This applies to the play, results and view screens still to be ported (PRs 8–11). Raw strings in
  those views would show tags or bypass sanitisation.
- Two new runtime dependencies (Tiptap core packages, MIT; DOMPurify, MPL-2.0 OR Apache-2.0), both
  within the licence policy (ADR-0004). No Tiptap Pro extensions are used.
- The keyboard shortcuts are Tiptap's (⌘/Ctrl+B, I, Shift+S, `.`, `,`, Z), not CKEditor's.
  Mostly they're the same, but no comparison with the legacy app was made.
- Risk: the length limits count HTML. A heavily formatted title reaches the 300-character limit
  sooner than plain text, as in legacy.

## References

- PR #19 (commit `134e53b`, branch `web/editor-rich-text`, stacked on PR #17)
- `MIGRATION.md`, "Legacy quirks": five rows for `lib/inline-editor.svelte` and the `{@html}` views
- `classquiz/config.py` (`ALLOWED_TAGS_FOR_QUIZ`), `classquiz/routers/editor.py` (bleach on save)
- ADR-0004 (licence), ADR-0006 (stack), ADR-0015 (when to fix a legacy bug), ADR-0016 (Phase 2 breakdown)
- WAI-ARIA Authoring Practices, Toolbar pattern

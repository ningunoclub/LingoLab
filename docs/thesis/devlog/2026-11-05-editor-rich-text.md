# 2026-11-05: Rich text in the quiz editor with Tiptap

- **Phase / area:** Phase 2: Core loop (PR 4 of 12, ADR-0016)
- **Related:** PR #19 (open; commit `134e53b` on `web/editor-rich-text`, stacked on PR #17); ADR-0004; ADR-0006; ADR-0015; ADR-0019; `MIGRATION.md` item "`/create` and `/edit`", sub-item PR 4
- **Time spent (approx.):** TODO(Bruno)

## Goal

Replace legacy's CKEditor 5 field for the quiz title and the question text with Tiptap, because
CKEditor is GPL or commercial (ADR-0004, ADR-0006). Before this PR both fields were plain inputs
in `web/`. The description stays a plain textarea, as in legacy. Bruno started the session with
"continue on PR 4 (rich text with Tiptap), read the handoff first".

## What happened

1. **Start.** The handoff memory said to check whether PR #17 (media upload) was merged. It was
   still open, so Claude branched `web/editor-rich-text` from `web/editor-media-upload`.
2. **Inventory.** Claude read `lib/inline-editor.svelte` (the CKEditor component), its two call
   sites (`settings-card.svelte`, `card.svelte`) and every legacy `{@html}` that shows a title or
   question. It also read the backend's save path. `classquiz/routers/editor.py` runs `bleach.clean`
   with `ALLOWED_TAGS_FOR_QUIZ` (`b strong i em small mark del sub sup`, from `config.py`). From
   this Claude found that legacy's strikethrough (`<s>`) and every line break are removed on save.
   These two quirks, plus the inaccessible balloon toolbar and the unfiltered `{@html}`, became
   ADR-0019 and five `MIGRATION.md` rows.
3. **Dependencies.** Claude checked the licences with `npm view` (all Tiptap packages MIT, DOMPurify
   MPL-2.0 OR Apache-2.0) and the Tiptap v3 React API through Context7. It then installed Tiptap
   3.32.3 (core extensions only), DOMPurify 3.4.17 and the shadcn `toggle` component. The handoff's
   reminder about the shadcn CLI importing from `'cn'` applied again and was fixed straight away.
4. **Implementation** (by Claude):
   - `features/editor/RichTextInput.tsx`: a single-line Tiptap document, the legacy plugin set
     (Typography standing in for TextTransformation, its multiplication rule off), strikethrough
     written as `<del>`, and a fixed, labelled toolbar.
   - `lib/richText.ts` and `components/RichText.tsx`: DOMPurify with the backend's allowlist, and a
     plain-text helper.
   - Wiring: the settings and question cards, the editor sidebar and status bar, the dashboard card,
     the start-game and analytics dialogs, and the delete confirmation (plain text).
   - Eight new i18n keys `editor.formatting.*` (en + de).
5. **Problems and dead ends.**
   - *Toolbar role.* Biome rejected `role="group"`. Claude switched to `role="toolbar"` and added
     the roving tab stop and arrow-key handling that this role requires.
   - *A hollow test.* Claude first wrote a unit test for typing that could not fail, because jsdom
     cannot type into a contenteditable. It removed the test before running the suite and left
     typing to Playwright.
   - *Toolbar at 390 px.* The browser check showed the toolbar wrapping onto two rows on a touch
     phone (44 px targets; screenshot 2). Claude removed the gaps and the separator on coarse
     pointers, and the toolbar fit on one row (screenshot 3).
   - *Pasting.* A check in the browser showed that pasted lines ran together ("first linesecond
     line"). Claude's first fix put a space before each block end. It passed the unit test but not a
     real paste event in the browser, because the clipboard parser trims that space. The second fix
     unwraps block tags into spaces and worked in both.
   - *Focus race in e2e.* Playwright typed text right after clicking Bold, and the text landed on the
     button instead of the editor. Tiptap returns focus one animation frame later. Claude stopped
     toolbar presses from taking focus (`preventDefault` on mouse-down); keyboard users still reach
     the toolbar with Tab. The editor e2e file then passed 60 of 60 runs over three repeats.
   - *A hung dev server.* A Vite dev server started earlier that day (10:44) ran at about 100 % CPU and
     stopped responding. One full e2e run took 6.6 minutes; Claude cut its output with `tail` and
     could not read the result. The next run stalled with no test started for 10 minutes. Claude
     found the hung process and started a command to kill and restart it. Bruno interrupted that
     command and asked "did you get stuck?". Claude explained the state (including that the
     interrupted command might have run partly), and Bruno answered "restart and finish please".
     After the restart and a warm-up load of `/create`, the full suite passed in 26 s.
   - *Flaky test.* The styleguide's language-switch e2e test failed once under load. It passed 18 of
     18 runs on its own and was not changed.
   - *Shortcut on macOS.* In the browser check, Ctrl+B did not apply bold. On macOS Tiptap's `Mod`
     key is ⌘, so this is expected behaviour, not a bug.
   - *Unrelated changes in the working tree.* Partway through the session, thesis-doc files from
     another session appeared as uncommitted changes. Claude left them alone and staged only its own
     paths.
6. **Finish.** `MIGRATION.md` was updated (PR 4 ticked, five quirk rows), committed as `134e53b`,
   and PR #19 was opened against `web/editor-media-upload` with the inventory as its body. The
   handoff memory was updated for the next session (PR 5, SLIDE).

## Human vs. AI

- **Bruno decided / specified:** Tiptap instead of CKEditor (ADR-0006, earlier); starting PR 4 in
  this session; restarting the dev server and finishing after the interruption; writing a devlog
  and an ADR and pushing code and docs in separate PRs.
- **Claude proposed / implemented:** the inventory and the quirks found; the four choices in
  ADR-0019 (single-line field, `<del>`, fixed toolbar, sanitised rendering) and the Typography
  setting; all code, tests and i18n keys; the diagnosis and restart of the hung dev server; the
  commit, PR #19, this devlog and ADR-0019.
- **Corrections Bruno made to AI output:** none to the code. Bruno interrupted the dev-server
  restart and asked whether Claude was stuck, because about 20 minutes had passed with no visible
  progress. PR #19 has not been reviewed yet.

## Verification

- `pnpm typecheck` clean (0 errors), `pnpm lint` clean. `pnpm test`: 281 of 281, 15 of them new
  (`RichTextInput.test.tsx`: stored format, legacy `<b>/<i>/<s>` markup, `<del>`, flattened
  paragraphs, paste joining, label and `aria-invalid` wiring, toolbar keyboard navigation, updates
  from outside; `richText.test.ts`: sanitiser and plain text).
- Playwright: 106 of 106 (desktop and mobile) on the restarted dev server. The editor happy path now
  types the title, turns bold on from the toolbar, and asserts both the saved payload
  (`Weather <strong>words</strong>`) and the `<strong>` shown in the status bar. The backend is
  mocked in e2e.
- Browser check in Brave through the `brave-devtools` MCP, on `/create` with the dev account
  against the `compose.dev.yml` backend: subscript from the toolbar, `...` turned into `…`, Enter
  added no line, the sidebar showed the formatting, the local draft stored inline HTML, and pasted
  text and HTML were joined with spaces (synthetic paste events). No console errors.
- Screenshots:
  - [1280 px, light: the title field with subscript and typography](../screenshots/2026-11-05-editor-rich-text-1.png)
  - [390 px, dark, touch: the toolbar wrapping onto two rows (before the fix)](../screenshots/2026-11-05-editor-rich-text-2.png)
  - [390 px, dark, touch: the toolbar on one row (after the fix)](../screenshots/2026-11-05-editor-rich-text-3.png)
- **Not verified:** a save to the real backend (so bleach's handling of `<del>` was read from the
  code, not observed); opening an existing quiz with legacy markup in the browser (unit tests only);
  the question card and the dashboard in the browser; screen-reader output; a real clipboard paste
  from another application; no side-by-side comparison with the legacy app. The screenshots were
  taken before the paste and focus fixes; the full 106-test run came after all code changes.

## Observations for the thesis

- **Reading the backend explained the legacy bugs.** Both functional quirks (strikethrough lost,
  line breaks lost) only showed up by comparing the editor's output with the backend's allowlist.
  Neither is visible from the frontend code alone. For a parity port this suggests checking the
  save path, not only the component being ported.
- **Unit tests in jsdom gave false confidence about editor behaviour.** The paste fix passed in
  jsdom and failed in the browser. The focus race only appeared in Playwright. For a
  contenteditable component, the browser check found the defects the unit tests missed.
- **Tooling stalls are hard to see.** The hung dev server cost about 20 minutes of the session.
  From the user's side it looked as though the agent was stuck, and Bruno had to interrupt to find
  out what was happening. A status message sooner would have avoided the interruption.

## Open points

- PR #17 and then PR #19 await review and merge; ADR-0019 awaits acceptance.
- Play, results and view screens (PRs 8–11) must render question text and titles with `RichText`.
- Manual check: a real paste from a word processor, and a save to the real backend with
  strikethrough.
- Next: PR 5, the SLIDE question type (`pikaso`/`konva`/`deepmerge`, confirmed by Bruno).

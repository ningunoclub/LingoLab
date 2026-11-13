# 2026-11-13: The SLIDE question type and a shared slide renderer

- **Phase / area:** Phase 2: Core loop (PR 5 of 12, ADR-0016)
- **Related:** PR #21 (open; commit `b00caa9` on `web/editor-slide`, branched from `main`); ADR-0016; `MIGRATION.md` item "`/create` and `/edit`", sub-item PR 5, the Phase 2 decision "Slide images" and seven new Legacy quirks rows. No ADR has been written for this task yet (suggested at the end of the session)
- **Time spent (approx.):** TODO(Bruno)

## Goal

Make SLIDE questions editable in the new quiz editor. SLIDE was the last of the seven question
types that still showed "not editable yet". The task also included a read-only slide renderer as a
shared component, because the live game (PR 8), `/view` (PR 11) and practice mode all show slides.
Bruno started the session with a pasted brief listing four steps: write the inventory of
`slide.svelte`, `slides/*` and `play/admin/slide.svelte`; build the canvas editor with pikaso and
konva, "reusing the existing media uploader for images"; build the renderer as a shared component;
add tests, run the checks and open a PR. Bruno had approved pikaso, konva and deepmerge on
2026-11-05.

## What happened

1. **Inventory.** Claude read the five legacy files (`editor/slide.svelte` 250 lines,
   `slides/edit_menu.svelte` 214, `element_selection.svelte` 96, `settings_menu.svelte` 41,
   `play/admin/slide.svelte` 45) and the places that use them (`card.svelte`, `sidebar.svelte`,
   `admin.svelte`, `practice/question.svelte`, `view/[quiz_id]`). The four files in
   `slides/types/` (94 lines) are imported nowhere and were not ported. In legacy, slides are added
   with a separate "Slide" button in the sidebar, not through the add-question popup.
2. **Scope question.** The inventory showed that legacy slides cannot hold images: the Image
   element is commented out, and the slide card has no image uploader. The brief asked for images,
   while `CLAUDE.md` rules out new features until parity. Claude asked Bruno, with "parity only" as
   its recommendation. **Bruno chose "Add image elements".** The choice was recorded as a Phase 2
   decision in `MIGRATION.md`.
3. **Library version.** Legacy uses pikaso 2.9.0; the current release is 3.0.3. Claude downloaded
   2.9.0 into the session's scratch folder and compared it with 3.0.3: the JSON type definitions
   and the import and export code are the same. The dev database held no stored slide to test with.
4. **Reading the library before writing the editor.** pikaso's documentation does not cover
   everything the editor relies on, so Claude read the bundled source. Three findings shaped the
   design:
   - The import restores the stage size saved in the JSON and fits it into its container with a
     CSS scale. This made a fixed stage size for new slides possible (1280×720), while slides saved
     by legacy keep theirs.
   - Selection and history listen for keys on `window`: Backspace/Delete, the arrow keys and
     Ctrl+Z work anywhere on the page. Typing Backspace in the question title would delete the
     selected slide element. Claude turned this off and handled the keys on the focused canvas.
   - Text editing opens on a double-click only, which does not fire on touch screens. Claude added
     an "Edit text" button that triggers the same editor.
5. **Implementation** (by Claude): `lib/slide.ts` (reading and storing the JSON, alt text from the
   slide's words, a filter that drops images from other servers), `components/SlideRenderer.tsx`,
   and the editor in `features/editor/slide/` (canvas, toolbar, add menu with legacy's shortcut
   keys plus `i` for images, image insertion through `MediaUploader`). `MediaUploader` gained an
   optional controlled mode without its own button. Further changes: the sidebar's "Slide" button,
   the slide branch of the question card, SLIDE defaults from legacy (two minutes, title "Slide"),
   16 new i18n keys under `editor.slide.*` and `slide.*` (en + de), and the shadcn `popover` and
   `kbd` components (the `'cn'` import fixed again, as the handoff memory warned).
6. **Problems found in the browser.** Claude drove the editor in Brave with the dev account
   against the real backend. Each problem below was found there, not by the unit tests:
   - *Invisible selection, double selection.* After adding a headline and then a circle, no
     selection frame was visible, but the toolbar offered text tools (screenshot 1). Inspecting the
     canvas showed both elements selected and the frame drawn in white on the white slide. pikaso's
     `select()` adds to the selection, and its default frame colour is white. Claude cleared the
     selection before selecting a new element and drew the frame in Lingo Teal (screenshot 2).
   - *Focus.* After an element was added from the menu, focus went back to the menu button, so the
     keyboard commands did not apply to the new element. The menu's focus handling and a deferred
     focus on the canvas fixed it.
   - *Lost and late moves.* Fifteen quick Shift+Arrow presses moved an element about 75 px instead
     of 300 px. pikaso animates the move and reports it before the animation ends, so the stored
     position also trailed behind. Claude replaced the animated move with a direct one.
   - *Edits not stored.* While checking the move, Claude read pikaso's `update()`: it records an
     undo step but sends no event. Colour, font size and layer order use it, so these edits never
     reached the quiz data. Legacy has the same gap: a colour chosen last before saving is lost.
     Claude made every toolbar and keyboard edit export the canvas itself. A second browser check
     confirmed that the move (all ten steps) and the colour were stored.
7. **Comparison with the legacy app.** Claude started the legacy app (`--profile legacy`), added a
   slide with a headline, circle, rectangle and text in the legacy editor, saved the quiz and read
   the stored JSON from the database. The legacy canvas had taken the size of the editor area
   (920×786), and in dark mode the black default text sat on a dark grey canvas (screenshot 3).
   The JSON opened in the new editor, letterboxed into the 16:9 frame (screenshot 4), and became a
   test fixture. One difference showed: the text added last now lay under the shapes. pikaso 2.9
   had exported it with `zIndex: 0`, and both versions apply that value in the same way, so
   legacy's own renderer shows it underneath too. Claude logged it as a quirk and left the stored
   data alone.
8. **Tests.** Unit tests for the helpers, the element insertion (with a stand-in for pikaso,
   because jsdom has no canvas), the toolbar and add menu, the renderer (pikaso mocked) and the
   uploader's new mode. A new e2e file covers building a slide with every element and saving it,
   editing the legacy fixture, and the renderer. Two e2e failures came from the tests, not the
   product: the font-size slider's name did not reach the slider thumb (fixed in the component by
   using the Slider's own `thumbLabels`), and the legacy test counted the label backgrounds as
   texts. The Radix slider needed a `ResizeObserver` stub in jsdom.
9. **Renderer page.** No route shows slides yet, so Claude added a "Slide" section to the dev-only
   `/styleguide` page to view the renderer and test it in e2e (screenshot 6).
10. **Finish.** Claude pinned pikaso and konva to exact versions (the install had added `^` ranges),
    updated `MIGRATION.md` (PR 5 ticked, the image decision, seven quirk rows, a manual-check item),
    committed `b00caa9` and opened PR #21 with the inventory as its body.

## Human vs. AI

- **Bruno decided / specified:** the brief for the task, including image support and a shared
  renderer; pikaso, konva and deepmerge (2026-11-05); **image elements beyond parity**, chosen
  when Claude asked; asking for this devlog.
- **Claude proposed / implemented:** the inventory; raising the conflict between the brief and the
  parity rule; the version comparison; all code, tests and i18n keys; and these design choices,
  which are listed as behaviour changes in `MIGRATION.md`: a fixed 1280×720 stage, a white slide in
  both themes, the teal selection frame, answer colour 1 as the default fill, keys scoped to the
  canvas, the Delete and Edit text buttons, alt text from the slide's words, a 2× export, the
  filter for images from other servers, the styleguide section, and pinned versions. Claude also
  wrote the commit, PR #21 and this devlog.
- **Corrections Bruno made to AI output:** none so far. PR #21 has not been reviewed, and the design
  choices above have not been confirmed by Bruno.

## Verification

- `pnpm typecheck` and `pnpm lint` clean. `pnpm test`: 316 of 316 (36 files), including the new
  files `lib/slide.test.ts`, `slideElements.test.ts`, `SlideToolbar.test.tsx` and
  `SlideRenderer.test.tsx`, plus new cases in `MediaUploader.test.tsx` and `editorData.test.ts`.
- Playwright: 112 of 112 (desktop and mobile), of them 6 new (`editor-slide.spec.ts`, three tests
  in two projects). The tests check the saved payload: stage size, headline text and font size,
  rectangle position and colour, the image stored as a path, and the edited legacy slide. The
  backend is mocked in e2e.
- Browser check in Brave through the `brave-devtools` MCP against the `compose.dev.yml` backend:
  adding every element type, the shortcut keys, Delete, Ctrl+Z, Backspace in the title field
  (canvas unchanged), Edit text, font size, colour, an image from the library (fitted to 640×360,
  stored as a relative path), reload of the local draft, the legacy slide in `/edit`, and the
  renderer on `/styleguide`. At 390 px in light mode the page had no horizontal scroll and the
  toolbar wrapped. No console errors, no failed requests.
- Screenshots:
  - [1280 px, dark: the first test, with the selection frame invisible (before the fix)](../screenshots/2026-11-13-editor-slide-1.png)
  - [1280 px, dark: an image element selected with the teal frame](../screenshots/2026-11-13-editor-slide-2.png)
  - [Legacy app, dark: the slide editor with its window-sized, dark canvas](../screenshots/2026-11-13-editor-slide-3.png)
  - [1280 px, dark: the slide saved by the legacy editor, opened in the new editor](../screenshots/2026-11-13-editor-slide-4.png)
  - [390 px, light, touch: the slide card on a phone](../screenshots/2026-11-13-editor-slide-5.png)
  - [1280 px, dark: the renderer in the style guide](../screenshots/2026-11-13-editor-slide-6.png)
- **Not verified:** dragging, resizing and rotating with a real mouse or finger (selection was
  tested with simulated pointer events, moves with the keyboard); uploading a new large photo as a
  slide image (the browser check picked an earlier upload, e2e uses a 1×1 PNG); hosting a slide
  saved here in the legacy app; screen-reader output; the renderer in light mode and at 390 px.

## Observations for the thesis

- **The brief and the project rules disagreed.** Bruno's brief asked for images on slides, which
  legacy did not have, while `CLAUDE.md` rules out new features until parity. Claude stopped and
  asked instead of choosing either. The answer turned a parity port into a small feature, recorded
  as a decision. This is a case where the agent's instructions came from two sources that the human
  had written at different times.
- **The third-party library's source was more reliable than its documentation.** Three behaviours
  that decide whether data is saved correctly (global key listeners, `update()` without events,
  `select()` adding to the selection) were only visible in pikaso's code or in the browser. Two of
  them are also in legacy, where they lose edits without any message.
- **Real legacy data was cheap to get and worth it.** Creating one slide in the legacy app and
  reading it from the database gave a realistic fixture and showed the stage-size and layer-order
  differences, which a hand-written fixture would have missed.
- **Teacher-facing effect.** Legacy slides depend on the size of the teacher's window and lose the
  last style change. Both matter for teachers who prepare slides on one computer and show them on a
  projector. TODO(Bruno): whether this is worth a question in the user-testing round.

## Open points

- PR #21 awaits review and merge.
- An ADR for the choices in this task (image elements beyond parity, pikaso 3 instead of 2.9, the
  fixed stage size) has not been written. TODO(Bruno): decide whether to write one.
- Manual checks (listed in `MIGRATION.md`): drag, resize and rotate with a mouse and a finger,
  in-place text editing, a large photo as a slide image, hosting a slide saved here in the legacy
  app.
- PR 8, PR 11 and practice mode must show slides with `components/SlideRenderer.tsx`.
- The legacy app was left running, and the dev database contains a test quiz "Legacy slide
  fixture".
- Next: PRs 6–9, the live game.

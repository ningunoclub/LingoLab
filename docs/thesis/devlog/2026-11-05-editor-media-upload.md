# 2026-11-05: Media upload in the quiz editor

- **Phase / area:** Phase 2: Core loop (PR 3 of 12, ADR-0016)
- **Related:** PR #17 (open; commits `17e2fbb`, `6dc8a5f` on `web/editor-media-upload`); merges of PRs #14 (`fba9f4c`), #15 (`ba2e4e8`), #16 (`ed99b24`); ADR-0015; ADR-0016; ADR-0018; `MIGRATION.md` item "`/create` and `/edit`", sub-item PR 3
- **Time spent (approx.):** TODO(Bruno)

## Goal

Let a teacher add an image to the quiz cover, the quiz background and each question. PR 1 had left
these fields inert: existing images were shown and could be removed, but nothing could be added.
The scope came from the handoff notes of the previous session and the Phase 2 decisions (ADR-0016):
a custom dropzone posting to `/api/v1/storage/`, a library picker of the user's earlier uploads, no
Uppy, no crop or compression, no Pixabay, no video tab, no backend changes.

## What happened

1. **Merging the open PRs.** The session started from a pasted handoff message. All three open PRs
   (#14, #15, #16) were mergeable without conflicts. Claude asked whether to merge them; Bruno chose
   "merge all three", and Claude squash-merged them in that order and branched
   `web/editor-media-upload` from the updated `main`. Docker was not running; Claude started Docker
   Desktop and the `compose.dev.yml` services.
2. **Inventory.** Claude read `uploader.svelte` (246 lines), `uploader/Library.svelte` (69), the three
   call sites in `settings-card.svelte` and `card.svelte`, and the backend's `routers/storage.py` and
   `config.py`. At about 320 lines, the PR was not split. All needed endpoints were already in the
   generated API schema.
3. **Quirks found**, logged in `MIGRATION.md` (two new rows) and treated in ADR-0018:
   - Uppy's drop target covered the whole page, so dropped files were queued silently.
   - The client accepted `image/*`, while the backend stores only four image types.
   - The library drew MP4 files as `<img>`, so they appeared as broken images.
   - "No name available" was hard-coded English. The backend's `POST /storage/` never stores a file
     name, so every editor upload shows this fallback. This is backend behaviour and was left as is.
4. **Implementation** (by Claude), in `web/src/features/editor/media/`:
   - `MediaUploader`: the "Add Media" button and a shadcn dialog that first offers Image or
     Library, as legacy's type chooser did. Legacy's `selected_question` (undefined = cover,
     −1 = background, n = question) became an `onSelect` callback per field.
   - `UploadPanel`: click or drop one file, check type and size, preview it, upload on request.
   - `LibraryPanel`: the 50 latest uploads, with loading, error (with retry) and empty states.
   - `storageApi.ts`: the checks, the multipart upload and the status-to-message mapping.
   - Ten new i18n keys (en + de). No dependency was added.
5. **Problems and dead ends.**
   - *Multipart in jsdom.* The unit test that read the uploaded file back with `formData()` failed:
     jsdom's `FormData` reaches the mock server through undici, which renames the file to "blob".
     Claude made the code pass the file name explicitly (as Uppy did) and changed the test to check
     the raw multipart part instead.
   - *Playwright timeout.* The first e2e run timed out waiting for the dev server, because Vite
     re-optimised dependencies after the lockfile changed (52 s against a 60 s limit). The next run
     failed 19 tests, including existing ones, while bundling was still in progress. A third run on
     the warm server passed all existing tests.
   - *The new e2e test* first looked for the question's "Add Media" button without selecting the
     question in the sidebar; one step fixed it.
   - *Lint on `main` was red.* PR #15 had left the imports of five shadcn files out of Biome's order.
     Claude fixed this with Biome's auto-fix in a separate commit (`17e2fbb`) inside PR #17.
   - *Back button alignment.* The browser check showed the dialog's Back button centred, because
     the dialog is a CSS grid and `self-start` has no effect there; it was changed to
     `justify-self-start` (screenshot 1 shows the state before the fix).
6. **Finish.** `MIGRATION.md` was updated (PR 3 ticked, two quirk rows), the work was committed as
   `6dc8a5f` and PR #17 was opened with the inventory as its body.

## Human vs. AI

- **Bruno decided / specified:** the uploader scope (custom dropzone, no crop or compression, no
  Pixabay, no video tab; ADR-0016, 2026-09-30); merging #14, #15 and #16 (answer to Claude's
  question in this session).
- **Claude proposed / implemented:** the merges once approved; all code, tests and i18n keys; the
  narrowed file-type check, the per-error messages and the dialog-only drop area (ADR-0018, not yet
  accepted); the lint fix for #15's files; the PR and the handoff notes.
- **Corrections Bruno made to AI output:** none so far. PR #17 has not been reviewed yet.

## Verification

- `pnpm typecheck` and `pnpm lint` clean. `pnpm test`: 266 of 266 (18 new, in `storageApi.test.ts`
  and `MediaUploader.test.tsx`).
- Playwright: 106 of 106 across the suite (desktop and mobile). The new test uploads a cover, picks a
  question image from the library, saves, and asserts both ids in the request body. The backend is
  mocked in e2e. The suite ran before the Back-button class change and was not rerun after it; the
  unit tests, lint and typecheck were.
- Browser check in Brave through the `brave-devtools` MCP, against the real `compose.dev.yml`
  backend with the dev account: an SVG was refused before upload; a 320 × 180 PNG was uploaded
  (`POST /storage/` 200) and rendered as the cover, including its thumbhash placeholder; the
  background was picked from the library at 390 px in dark mode. The only console error was the
  expected 401 from the sign-in check before login. Resizing the viewport reloaded the page, which
  triggered the editor's leave warning; after reload, the local draft still held the uploaded cover.
- Screenshots:
  - [1280 px, light: the upload preview (Back button still centred)](../screenshots/2026-11-05-editor-media-upload-1.png)
  - [1280 px, light: the uploaded cover in the settings card](../screenshots/2026-11-05-editor-media-upload-2.png)
  - [390 px, dark: the library](../screenshots/2026-11-05-editor-media-upload-3.png)
- **Not verified:** drag and drop (every test and the browser check used the file input); a
  question image or a save in the real UI against the real backend; the 413 message (ADR-0018);
  dark mode at desktop width and light mode on a phone; no side-by-side comparison with the legacy
  app. The check left one uploaded file (`sky.png`) in the dev account's storage.

## Observations for the thesis

- **Parity versus usefulness of error messages.** The legacy uploader's failures were generic; the
  port names each one. This is a small user-facing deviation that ADR-0015 classifies as a fix,
  because the set of accepted files stays the same. It is recorded as a separate ADR (0018) because
  it is the first deviation that changes what a teacher reads rather than what the system does.
- **Test-environment artefacts cost time.** Two of the problems (jsdom's multipart handling, Vite's
  dependency re-optimisation) were caused by the tooling, not the feature. Both were diagnosed from
  error output rather than guessed, but each took several runs.
- **Cross-PR side effects.** A merged PR (#15) left `main` failing lint, and nobody noticed until the
  next feature PR ran the checks. The only lint workflow (`frontend_lint.yml`, inherited from
  upstream) covers the legacy `frontend/`; no CI job checks `web/`. TODO(Bruno): whether to add one.

## Open points

- PR #17 awaits review and merge; ADR-0018 awaits acceptance.
- Manual check: drag and drop on a real device.
- Next: PR 4, rich text with Tiptap (the core is MIT; avoid the Pro extensions).

# ADR-0018: Check upload file types on the client and name each upload error

- **Status:** Proposed
- **Date:** 2026-11-05
- **Decided by:** TODO(Bruno): accept or reject. Claude proposed and implemented the deviations in PR #17; Bruno has not reviewed them yet.

## Context

ADR-0016 replaced legacy's Uppy uploader with a custom dropzone that posts to
`/api/v1/storage/`. Bruno decided that, and he decided to drop crop, compression, Pixabay and the
video tab. How the new dropzone should check files and report failures was not specified. Porting
it (PR #17) surfaced three legacy behaviours that a plain dropzone does not reproduce by itself:

1. **Accepted file types.** Legacy's Uppy restriction was `allowedFileTypes: ['image/*']`. The
   backend (`ALLOWED_MIME_TYPES` in `classquiz/config.py`) stores only `image/png`, `image/jpeg`,
   `image/gif`, `image/webp` and `video/mp4`, and answers anything else with `422 Unsupported`. An SVG
   or HEIC file therefore passed the client check and then failed on upload.
2. **Error reporting.** The backend returns `409 Storage limit reached` and `422 Unsupported`. Legacy
   showed these through Uppy's generic upload-failure display, with no text that tells a teacher what
   to do.
3. **Drop area.** Uppy's `DropTarget` was attached to `document.body` whenever an uploader was mounted,
   so a file dropped anywhere on the editor page was queued, even with the dialog closed and nothing
   on screen showing it.

ADR-0015 says to fix a legacy behaviour when the code "cannot do what it evidently intends" and to
replicate it when it is coherent but debatable, "especially when changing it would alter which
users, devices or inputs the system accepts". These deviations fall under that rule.

## Options considered

1. **Replicate:** accept `image/*`, show one generic failure message, and register a page-wide drop
   target. Pro: literal parity. Con: a page-wide drop target means writing new code to reproduce
   behaviour nobody can see; teachers get no actionable message for a full storage or a wrong type.
2. **Narrow the client check to the stored types and name each error; drop only inside the
   dialog.** Pro: the set of files the *system* accepts is unchanged, because the backend already
   rejects the rest. Only the moment and wording of the rejection change. Con: a deviation from the
   legacy client; the type list now lives in two places (backend config and `storageApi.ts`).
3. **Option 2, but read the allowed types from the backend.** Pro: one source of truth. Con: no
   endpoint exposes `ALLOWED_MIME_TYPES`, so this needs a backend change, which the rewrite phase
   forbids.

## Decision

Option 2 (proposed by Claude, implemented in commit `6dc8a5f`):

- The file picker and the drop check accept only PNG, JPEG, GIF and WebP (`ACCEPTED_IMAGE_TYPES`).
  MP4 is left out because the video tab is out of scope (ADR-0016). Any other type is refused before
  upload with `uploader.unsupported_type`.
- The legacy size limit (10,490,000 bytes) is kept and checked before upload (`uploader.too_large`).
- Status codes map to their own messages: 409 → `uploader.storage_limit`, 422 →
  `uploader.unsupported_type`, 413 → `uploader.too_large`, anything else → `uploader.upload_failed`
  (all en + de).
- Files can be dropped only on the dropzone inside the dialog.

Under ADR-0015, Claude classified these as fixes, not as changes to accepted inputs: the backend
already rejected every file the narrowed check refuses, so the set of storable files stays the same.
The page-wide drop target is classified as behaviour no one could have intended, because it queued
files silently. All three are logged in the `MIGRATION.md` "Legacy quirks" table.

## Consequences

- Teachers learn before uploading that an SVG or HEIC file will not work, and they learn why an
  upload failed.
- **Duplicated knowledge:** if the backend's `ALLOWED_MIME_TYPES` changes, `storageApi.ts` must be
  updated by hand. A comment in the file points to the backend constant.
- **The 413 mapping has not been observed.** The backend itself never returns 413; the mapping is for
  a proxy in front of it (Caddy or the Cloudflare Tunnel in production). Whether one of them returns
  413 for a body this size is untested.
- **Drag and drop is untested.** Unit tests, e2e tests and the browser check all used the file input;
  no test drops a file on the dropzone.
- The checks are pinned by tests (`storageApi.test.ts`: types, size, status mapping;
  `MediaUploader.test.tsx`: a refused SVG, a full storage).

## References

- PR #17, commit `6dc8a5f`; ADR-0015 (fix/replicate criterion); ADR-0016 (Phase 2 breakdown and media
  scope)
- Legacy: `frontend/src/lib/editor/uploader.svelte`
- Backend: `classquiz/config.py` (`ALLOWED_MIME_TYPES`), `classquiz/routers/storage.py` (`upload_file`)
- Devlog: [2026-11-05: Media upload in the quiz editor](../devlog/2026-11-05-editor-media-upload.md)

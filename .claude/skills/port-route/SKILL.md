---
name: port-route
description: Port one page/route from the legacy SvelteKit app in frontend/ to the React app in web/. Use whenever asked to migrate, port, rewrite, rebuild or "do" a route, page or screen from the old frontend, or when working through the MIGRATION.md checklist.
---

# Port a legacy route to web/

Work on exactly **one route** (plus the shared components it needs) per run.

## 1. Pick and branch

- Take the route named by the user, or the first unticked item in the current phase of `MIGRATION.md`.
- `git switch main && git pull && git switch -c web/<area>-<name>`

## 2. Inventory (before writing any code)

Read the route's files in `frontend/src/routes/<path>/` (`+page.svelte`, `+page.ts`, `+page.server.ts`)
and **follow every `$lib/...` import recursively**. Write this inventory to `.claude/tmp/<route>.md`
(it becomes the PR description):

- **Purpose:** one sentence.
- **Guards/redirects:** for example "redirects to /account/login when logged out".
- **URL params / search params**, with types.
- **API calls:** method + path + when they fire + what happens on error.
- **Socket.IO events:** emitted and listened to, with payload shapes.
- **UI states:** loading, empty, error, success, and every conditional branch in the markup.
- **User interactions:** buttons, keyboard shortcuts (`tinykeys`), drag and drop, uploads.
- **i18n keys used.**
- **Shared components needed** and whether they already exist in `web/src`.
- **Legacy quirks:** anything that looks like a bug (don't fix it silently, note it in `MIGRATION.md`).

If the inventory shows the route is larger than about 400 lines including its components, propose splitting
the work into several PRs and ask before continuing.

## 3. Check the API layer

- Confirm every endpoint exists in `web/src/api/schema.d.ts`. If not, run `pnpm -C web gen:api`
  (the backend must be running).
- If the backend truly lacks something, **stop and report**. Do not edit `classquiz/`.
- New socket events go into `web/src/realtime/events.ts` first.

## 4. Build

- Use the `lingolab-design` skill for all styling decisions.

- Route file in `web/src/routes/` at the same path (TanStack file-route naming: `$param` for `[param]`).
- Components and hooks in `web/src/features/<area>/`.
- UI primitives: shadcn. Search and add them through the shadcn MCP instead of writing them by hand.
- Translate legacy patterns with the table in `web/CLAUDE.md`.
- Copy framework-agnostic logic (validation, helpers, formatting) as-is into `web/src/lib/` and keep the upstream SPDX header.
- Reuse the legacy i18n keys.

## 5. Test

- Unit/component tests for non-trivial logic (Vitest, mock HTTP with MSW).
- One Playwright e2e test for the main happy path in `web/e2e/<route>.spec.ts`.
- `pnpm -C web typecheck && pnpm -C web lint && pnpm -C web test`

## 6. Verify visually

With `pnpm -C web dev` running, use the `brave-devtools` MCP:

1. Open `http://localhost:5173/<path>` and walk through every item in the inventory.
2. Check the console and network panel for errors.
3. Take screenshots at 390px and 1280px width, in light and dark mode.
4. If the legacy app is running (`--profile legacy`, `http://localhost:8080`), walk through the same flow there and
   list any behavioural differences. Fix them or justify them.

## 7. Finish

- Tick the route in `MIGRATION.md` and add any legacy quirks.
- Commit (`feat(web): port <route>`), push, and run `gh pr create` with the inventory as the body.
- Report back: what was built, test status, open questions.
- End with the documentation prompt from `CLAUDE.md` (usually `/document all`; add `adr` if you made a choice between alternatives). Do not write docs yourself.

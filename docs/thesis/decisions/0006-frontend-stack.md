# ADR-0006: Frontend stack and library choices

- **Status:** Accepted
- **Date:** 2026-09-15
- **Decided by:** Bruno Zingg (proposal by Claude)

## Decision
- **Base:** Vite single-page app, React, TypeScript in strict mode. No SSR (not needed; simpler deployment).
- **Routing and data:** TanStack Router (file-based, mirrors SvelteKit paths) and TanStack Query.
- **API client:** typed client (`openapi-fetch`) generated from FastAPI's `/openapi.json`; Socket.IO events typed by hand.
- **State and forms:** Zustand only for live game state; react-hook-form + zod for forms.
- **UI:** shadcn/ui + Tailwind CSS v4 + lucide-react.
- **i18n:** react-i18next, reusing the legacy translation keys.
- **Tooling:** Vitest + MSW for unit tests, Playwright for e2e tests, Biome for linting and formatting.
- **Replaced legacy libraries:** CKEditor 5 → Tiptap (licensing); felte/yup → react-hook-form/zod;
  sortablejs → dnd-kit; Sentry and Plausible dropped (privacy).

## Context and alternatives
Next.js was rejected (SSR/SEO not needed; it would keep a Node container). Plain JavaScript was rejected in favour of
TypeScript (the proposal specified it, and generated API types catch contract errors).

## Consequences
- Dev server proxies `/api` and `/socket.io` so the backend's httpOnly cookies work.
- Library versions move quickly (for example TypeScript 7.0 is the npm default as of 2026-09-15); Claude checks current docs via Context7.

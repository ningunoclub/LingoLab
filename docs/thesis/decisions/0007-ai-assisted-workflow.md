# ADR-0007: AI-assisted development workflow and harness

- **Status:** Accepted
- **Date:** 2026-09-15
- **Decided by:** Bruno Zingg

## Context
The platform is implemented mainly by an AI coding agent ("vibe coding"). To keep quality and consistency, the agent
needs explicit rules, procedures and verification tools, kept small enough not to overload its context.

## Decision
- **Agent:** Claude Code.
- **Rules:** a root `CLAUDE.md` (project rules) and `web/CLAUDE.md` (stack and conventions).
- **Skills:** `port-route` (migration procedure), `lingolab-design` (design system), `document` (user-only),
  and the official `shadcn` skill. UI UX Pro Max is used once for inspiration and then removed; Anthropic's
  frontend-design skill was not adopted because it overlaps with `lingolab-design`.
- **MCP servers:** chrome-devtools-mcp driving **Brave** (isolated profile, telemetry off), shadcn, Context7.
  Playwright MCP was replaced (one browser tool only); Playwright remains the e2e test runner. Community Brave forks
  were avoided in favour of Google's official server.
- **GitHub:** via the `gh` CLI.
- **Workflow:** one route per session → PR → review → merge → `/clear`.

## Consequences
- The harness files are part of the research record (they describe the intended process).
- Human review of PRs remains essential; see `ai-usage.md`.

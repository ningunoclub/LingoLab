# AI usage log

A record of how AI tools were used in this project, kept for the thesis's AI-use declaration and methodology chapter.
Check PHZH's current rules on declaring AI use: TODO(Bruno).

## Tools

| Tool | Version / model | Used for | Since |
|---|---|---|---|
| Claude (claude.ai chat) | Claude Opus 5 | Proposal review, repository and licence analysis, stack decisions, workspace kit | 2026-09-15 |
| Claude Code | TODO(Bruno): record via `/model` and `claude --version` | Implementation (frontend rewrite, features), tests, PRs | TODO |
| chrome-devtools-mcp (with Brave) | latest at install | Agent-driven browser checks: screenshots, console, network, accessibility | TODO |
| shadcn MCP + official shadcn skill | latest at install | Component search and installation | TODO |
| Context7 MCP | hosted | Current library documentation | TODO |
| UI UX Pro Max (one-time) | TODO | Design inspiration, compared against `lingolab-design` | TODO |

## How AI output is checked
- Every change goes through a PR that Bruno reviews and merges.
- Type check, lint, unit and e2e tests must pass.
- UI is checked in the browser (agent screenshots, then Bruno's own check).
- Behaviour is compared with the legacy ClassQuiz app.
- Licences of new dependencies are checked (`attribution.md`).

## Log

| Date | Task | Tool | What the AI did | What Bruno did / decided | Verification |
|---|---|---|---|---|---|
| 2026-09-15 | Proposal review and pivot analysis | Claude (chat) | Read the proposal; analysed ClassQuiz (code size, stack, containers); summarised MPL-2.0; flagged schedule risk | Chose self-hosting, forking ClassQuiz, React rewrite, MPL-2.0 | Bruno reviewed; repo facts checked from a cloned copy |
| 2026-09-15 | Workspace kit v1–v3 | Claude (chat) | Wrote `CLAUDE.md` files, skills, `MIGRATION.md`, dev compose, MCP config, design-system draft, documentation system and seed ADRs | Set requirements (Brave, design consistency, ask-before-documenting); reviewed and committed | Package versions checked against npm; hook tested; compose file not run (TODO) |
| 2026-09-15 | Push blocked by secret scanning | Claude (chat) | Diagnosed upstream secrets in history; proposed allow-and-remove | Resolved on GitHub (TODO: confirm) | Push succeeded (TODO: confirm) |

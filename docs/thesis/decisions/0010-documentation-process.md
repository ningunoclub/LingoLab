# ADR-0010: Documentation process for the thesis

- **Status:** Accepted
- **Date:** 2026-09-15
- **Decided by:** Bruno Zingg

## Context
The development process is research data (design-based research, proposal §5.1, §5.4.3), and development is mostly
AI-driven. Documentation must be reliable, attributable and low-effort, and must not be generated silently.

## Decision
Three layers:
1. **Automatic raw records:** git history and PRs, plus a `SessionEnd` hook that archives Claude Code transcripts to
   `docs/thesis/_sessions/` (git-ignored). Claude Code's default 30-day transcript cleanup is extended to 3650 days in the project settings (`.claude/settings.json`).
2. **Curated records on request:** at the end of every task Claude *asks* whether to document. Writing happens only
   through the user-only `/document` skill (`disable-model-invocation: true`), which enforces this.
3. **Thesis writing:** Bruno writes, using layers 1 and 2 as sources.

## Consequences
- Transcripts may contain secrets and personal data, so they stay local and must be backed up separately.
- Entries mark unknowns as `TODO(Bruno)` instead of guessing.

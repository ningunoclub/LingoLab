# ADR-0005: Standalone repository with full upstream history

- **Status:** Accepted
- **Date:** 2026-09-15
- **Decided by:** Bruno Zingg

## Context
The project needs its own name and its own issues and PRs, while keeping attribution and the ability to pull upstream fixes.

## Options considered
1. **GitHub "Fork" button:** shows the relationship, but `gh pr create` targets upstream by default.
2. **Standalone repo with full history and an `upstream` remote (push disabled).**
3. **Fresh repo without history:** clean, but loses attribution and the ability to merge upstream changes.

## Decision
Option 2 (`ningooner/LingoLab`). The backend stays at its upstream paths; the new frontend goes in `web/`.

## Consequences
- GitHub push protection flagged third-party secrets in upstream history (Mapbox token, hCaptcha secret). They were
  allowed rather than rewriting history, because they are upstream's keys and already public; the secret comment was
  removed from the current file. TODO(Bruno): confirm.
- `git log upstream/<branch>..main` separates this project's work from upstream's.

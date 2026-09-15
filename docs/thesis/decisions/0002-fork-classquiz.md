# ADR-0002: Build on a fork of ClassQuiz

- **Status:** Accepted
- **Date:** 2026-09-15
- **Decided by:** Bruno Zingg (analysis by Claude)

## Context
The platform needs Kahoot-style real-time play, question authoring with images, teacher accounts and export/sharing.
ClassQuiz (MPL-2.0, about 714 GitHub stars, active in 2026) already provides these, with a FastAPI + Socket.IO backend and
Docker deployment.

## Options considered
1. **Build from scratch:** full control, but most of the development time would go into real-time game mechanics.
2. **Fork ClassQuiz and keep its backend:** proven real-time loop, auth and storage. But the design decisions are
   inherited, the ORM (ormar) is niche, and the backend runs as a single worker.

## Decision
Fork ClassQuiz. Keep the backend largely unchanged and treat its API and Socket.IO events as the contract.

## Consequences
- About two-thirds of the planned features already exist. Remaining work: class/group management, new EFL game
  archetypes, and the frontend rewrite (ADR-0003).
- Limitation to report: parts of the design were inherited, not derived from the research.
- MPL-2.0 obligations apply (ADR-0004).
- Scaling limit (single worker) is acceptable for classroom use.
- Features not needed for the thesis (quiztivity, hardware controllers, video editing, moderation) may be left without UI.

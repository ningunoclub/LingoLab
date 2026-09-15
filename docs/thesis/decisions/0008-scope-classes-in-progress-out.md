# ADR-0008: Scope: class management in, student progress tracking out

- **Status:** Accepted
- **Date:** 2026-09-15
- **Decided by:** Bruno Zingg

## Context
Proposal §5.3.2 listed both class management and student progress tracking. ClassQuiz has neither: students join games
with a nickname and have no persistent accounts. Persistent student identities would raise data-protection effort
considerably (minors; proposal §9.1).

## Decision
Class/group management is a required feature, built after frontend parity. Student progress tracking is out of scope.

## Consequences
- The proposal feature list and §7.1 scope need updating.
- Nickname-based, account-free play is kept, which supports the privacy goals.

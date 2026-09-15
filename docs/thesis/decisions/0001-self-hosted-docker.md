# ADR-0001: Self-hosted Docker stack instead of Vercel/Supabase

- **Status:** Accepted
- **Date:** 2026-09-15
- **Decided by:** Bruno Zingg

## Context
The proposal (§5.3.1, §6.3) planned React + Supabase + Vercel, justified by free tiers. The platform is meant for
schools, where data protection (Swiss revFADP, GDPR) and independence from commercial free tiers matter. A home server
is available (Ubuntu, NVMe, Intel i7 from 2018) and can be exposed through Cloudflare.

## Options considered
1. **Vercel + Supabase (original plan):** fast to start, managed. But it depends on free-tier terms and US-based
   services, and schools can't easily host it themselves.
2. **Self-hosted Docker Compose:** anyone (a school or cantonal IT) can run it; data stays under the operator's control.
   But Bruno has to handle operations: backups, uptime, updates.

## Decision
Build a self-hostable Docker Compose stack, deployed on Bruno's server behind a Cloudflare Tunnel.

## Consequences
- The sustainability argument changes from "free tiers" to "any institution can host it" (proposal §6.3 needs rewording).
- Operational duties: backups (`pg_dump`), monitoring, updates.
- Cloudflare terminates TLS and therefore sees the traffic; this must be declared in the privacy section (§9.1).
- Usage analytics must be self-hosted or taken from backend data (§5.4.2).

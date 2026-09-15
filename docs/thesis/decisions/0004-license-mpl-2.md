# ADR-0004: Licence the project under MPL-2.0

- **Status:** Accepted
- **Date:** 2026-09-15
- **Decided by:** Bruno Zingg (licence summary by Claude, not legal advice)

## Context
Upstream is MPL-2.0 (file-level copyleft). Files taken from upstream, and files containing upstream code, must stay
MPL-2.0 with their notices kept. New files may use any licence. The upstream code carries no "Incompatible With Secondary
Licenses" notice.

## Options considered
1. **MPL-2.0 for everything:** one licence, matches upstream, improvements can flow back.
2. **MIT for new frontend files, MPL-2.0 for the rest:** allowed, but requires per-file tracking.
3. **AGPL-3.0:** network copyleft, but upstream files stay available under MPL-2.0 too, which complicates the picture.

## Decision
MPL-2.0 for the whole repository, with SPDX headers on every file.

## Consequences
- Upstream copyright lines are kept; Bruno's line is added to modified files.
- Every new dependency is licence-checked. GPL/commercial components such as CKEditor 5 are avoided.
- The name and logo "ClassQuiz" are not used (MPL grants no trademark rights). The project is named LingoLab.
- Check university rules on ownership of thesis software (TODO(Bruno)).

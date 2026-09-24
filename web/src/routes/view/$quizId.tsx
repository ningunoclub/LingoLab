// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/ComingSoon';

// Placeholder. Ported in Phase 2 (legacy /view/[quiz_id]); see MIGRATION.md.
export const Route = createFileRoute('/view/$quizId')({
  component: () => <ComingSoon route="/view/:quizId" />,
});

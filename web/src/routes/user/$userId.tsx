// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/ComingSoon';

// Placeholder. Ported in Phase 3 (legacy /user/[user_id]); see MIGRATION.md.
export const Route = createFileRoute('/user/$userId')({
  component: () => <ComingSoon route="/user/:userId" />,
});

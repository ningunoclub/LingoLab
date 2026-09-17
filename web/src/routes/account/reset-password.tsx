// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/ComingSoon';

// Placeholder. Ported later in Phase 1; see MIGRATION.md.
export const Route = createFileRoute('/account/reset-password')({
  component: () => <ComingSoon route="/account/reset-password" />,
});

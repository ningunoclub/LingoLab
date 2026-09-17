// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { ComingSoon } from '@/components/ComingSoon';

// Placeholder. Ported in a later migration phase; see MIGRATION.md.
export const Route = createFileRoute('/account/settings')({
  component: () => <ComingSoon route="/account/settings" />,
});

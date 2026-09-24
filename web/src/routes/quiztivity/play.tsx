// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ComingSoon } from '@/components/ComingSoon';

// Placeholder. Ported in Phase 4 (legacy /quiztivity/play); see MIGRATION.md. The search param is declared
// now so links from the dashboard are type-checked against it.
export const Route = createFileRoute('/quiztivity/play')({
  validateSearch: z.object({ id: z.string().optional() }),
  component: () => <ComingSoon route="/quiztivity/play" />,
});

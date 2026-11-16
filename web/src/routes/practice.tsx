// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ComingSoon } from '@/components/ComingSoon';

// Placeholder. Ported in Phase 3 (legacy /practice); see MIGRATION.md. Registered now because
// `/view` links here with `?quiz_id=…`.
export const Route = createFileRoute('/practice')({
  validateSearch: z.object({ quiz_id: z.string().optional() }),
  component: () => <ComingSoon route="/practice" />,
});

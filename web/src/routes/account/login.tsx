// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ComingSoon } from '@/components/ComingSoon';

// Placeholder for the real login page (Phase 1). The search schema is already
// declared here because requireAuth redirects to this route with a returnTo.
const searchSchema = z.object({
  returnTo: z.string().optional(),
});

export const Route = createFileRoute('/account/login')({
  validateSearch: searchSchema,
  component: () => <ComingSoon route="/account/login" />,
});

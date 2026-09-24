// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { ComingSoon } from '@/components/ComingSoon';

// Placeholder. Ported in Phase 2 (legacy /admin, the host screen); see MIGRATION.md.
// The search params are the ones the dashboard's start-game dialog sends, declared now so
// that navigation is type-checked. The PIN (six digits, 100000-999999) and the `connect`
// presence flag are numbers: the router re-serialises the *validated* search into the URL
// and JSON-quotes digit-only strings, so string types would turn legacy's
// `?pin=482913&connect=1` into `?pin=%22482913%22&connect=%221%22`.
export const Route = createFileRoute('/admin')({
  validateSearch: z.object({
    token: z.string().optional(),
    pin: z.coerce.number().int().optional(),
    connect: z.coerce.number().optional(),
  }),
  component: () => <ComingSoon route="/admin" />,
});

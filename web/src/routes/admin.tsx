// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { requireAuth } from '@/auth/auth';
import { HostPage } from '@/features/host/HostPage';

// The search params are the ones the dashboard's start-game dialog sends. The PIN and the
// `connect` presence flag are numbers: the router re-serialises the *validated* search into
// the URL and JSON-quotes digit-only strings, so string types would turn legacy's
// `?pin=482913&connect=1` into `?pin=%22482913%22&connect=%221%22`.
const searchSchema = z.object({
  token: z.string().optional(),
  pin: z.coerce.number().int().optional(),
  connect: z.coerce.number().optional(),
});

function AdminRoute() {
  const { token, pin, connect } = Route.useSearch();
  // Legacy `+page.server.ts`: auto-connect only when `connect` is present and both the
  // token and the PIN are known.
  const autoConnect = connect !== undefined && token !== undefined && pin !== undefined;
  return (
    <HostPage
      gamePin={pin === undefined ? '' : String(pin)}
      gameId={token ?? ''}
      autoConnect={autoConnect}
    />
  );
}

export const Route = createFileRoute('/admin')({
  validateSearch: searchSchema,
  // Legacy `+page.server.ts` redirects signed-out visitors to the login page.
  beforeLoad: ({ context, location }) => requireAuth(context.queryClient, location.href),
  component: AdminRoute,
});

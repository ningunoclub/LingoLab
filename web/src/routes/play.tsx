// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { PlayPage } from '@/features/play/PlayPage';

// Legacy `+page.server.ts` reads `?pin=` (the QR code on the host screen links here with it).
// A number, not a string: the router JSON-quotes digit-only strings when it re-serialises the
// search (see routes/admin). PINs are 100000–999999, so no leading zero is lost.
const searchSchema = z.object({
  pin: z.coerce.number().int().optional().catch(undefined),
});

function PlayRoute() {
  const { pin } = Route.useSearch();
  return <PlayPage initialPin={pin === undefined ? '' : String(pin)} />;
}

// No auth guard: students play without an account.
export const Route = createFileRoute('/play')({
  validateSearch: searchSchema,
  component: PlayRoute,
});

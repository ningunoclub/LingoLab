// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/auth/auth';
import { AvatarWizard } from '@/features/settings/AvatarWizard';

export const Route = createFileRoute('/account/settings_/avatar')({
  // Legacy has no guard here, so a signed-out visitor could complete all twelve steps and
  // only hit the wall at `POST /avatar/save`. Guarded like the rest of /account/settings.
  beforeLoad: ({ context }) => requireAuth(context.queryClient, '/account/settings/avatar'),
  component: AvatarWizard,
});

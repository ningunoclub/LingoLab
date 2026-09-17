// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute } from '@tanstack/react-router';
import { requireAuth } from '@/auth/auth';
import { SecuritySettings } from '@/features/settings/SecuritySettings';

export const Route = createFileRoute('/account/settings_/security')({
  // Legacy relies on the parent layout to keep signed-out visitors out. Guarded
  // explicitly here, like the rest of /account/settings.
  beforeLoad: ({ context }) => requireAuth(context.queryClient, '/account/settings/security'),
  component: SecuritySettings,
});

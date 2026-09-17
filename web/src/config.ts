// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0

/** App name. Never "ClassQuiz" - the upstream name and logo stay out of the UI. */
export const APP_NAME = 'LingoLab';

/** `VITE_*` flags are strings; treat only an explicit "true" as enabled. */
function flag(value: unknown): boolean {
  return value === 'true' || value === true;
}

export const config = {
  appName: APP_NAME,
  /** Upstream allows disabling registration; mirrored from legacy lib/config.ts. */
  registrationDisabled: false,
  /** The styleguide route is mounted in dev only. */
  isDev: import.meta.env.DEV,
  /**
   * OAuth providers, mirrored from legacy `lib/config.ts`. The backend owns the flow
   * entirely (plain link to /api/v1/users/oauth/<provider>/login), so these flags only
   * decide whether the button is offered.
   */
  oauth: {
    google: flag(import.meta.env.VITE_GOOGLE_AUTH_ENABLED),
    github: flag(import.meta.env.VITE_GITHUB_AUTH_ENABLED),
    /** Custom OIDC provider; the legacy app gates on its display name being set. */
    customName: (import.meta.env.VITE_CUSTOM_OAUTH_NAME as string | undefined) || null,
  },
} as const;

// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0

/** App name. Never "ClassQuiz" - the upstream name and logo stay out of the UI. */
export const APP_NAME = 'LingoLab';

export const config = {
  appName: APP_NAME,
  /** Upstream allows disabling registration; mirrored from legacy lib/config.ts. */
  registrationDisabled: false,
  /** The styleguide route is mounted in dev only. */
  isDev: import.meta.env.DEV,
} as const;

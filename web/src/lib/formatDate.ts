// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0

/**
 * Legacy formatted session timestamps with luxon's `DATETIME_MED` ("17 Sep 2026, 15:30").
 * `Intl.DateTimeFormat` produces the same shape from the platform, already localised for
 * the active language, so no date library is needed.
 *
 * The backend stores `datetime.now()` (classquiz/db/models.py), which is naive *server*
 * local time and serialises without a trailing "Z". `Date` would then read it as the
 * viewer's local time and show every session shifted by their offset, so it is
 * normalised to UTC first. That is correct because the API container runs in UTC; a
 * deployment that sets TZ on the api service would need this revisited, which is one
 * more reason the backend should be storing aware UTC timestamps.
 */
export function formatDateTime(value: string | null | undefined, locale: string): string | null {
  if (!value) return null;

  const normalised = /(?:Z|[+-]\d{2}:?\d{2})$/.test(value) ? value : `${value}Z`;
  const date = new Date(normalised);
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { fetchClient } from '@/api/client';

/**
 * The twelve avatar features the wizard walks through, in the order legacy presents them.
 *
 * The backend also accepts `nose_type`, but `NoseType` has exactly one member, so legacy
 * leaves it out of the wizard and so do we; it defaults to 0 server-side.
 */
export const AVATAR_FEATURES = [
  'skin_color',
  'top_type',
  'hair_color',
  'facial_hair_type',
  'facial_hair_color',
  'mouth_type',
  'eyebrow_type',
  'accessories_type',
  'hat_color',
  'clothe_type',
  'clothe_color',
  'clothe_graphic_type',
] as const;

export type AvatarFeature = (typeof AVATAR_FEATURES)[number];

/** A full avatar: one chosen index per feature. */
export type AvatarChoices = Record<AvatarFeature, number>;

/**
 * How many options each feature offers.
 *
 * Copied from legacy and checked against the running backend's enums
 * (`classquiz/routers/avatar.py`, `AvatarItemsAsList`) — all twelve match.
 *
 * `hair_color` is the exception worth knowing about: the backend indexes it into the
 * 15-member `Color` enum rather than the 10-member `HairColor` (avatar.py:54). The ten
 * entries below are therefore the first ten `Color` members, and indices 10-14 are
 * unreachable from the UI. That is an upstream bug we replicate rather than fix, since
 * the backend is out of scope during the rewrite. See MIGRATION.md.
 */
export const AVATAR_OPTION_COUNTS: Record<AvatarFeature, number> = {
  skin_color: 7,
  top_type: 35,
  hair_color: 10,
  facial_hair_type: 6,
  facial_hair_color: 10,
  mouth_type: 12,
  eyebrow_type: 13,
  accessories_type: 7,
  hat_color: 15,
  clothe_type: 9,
  clothe_color: 15,
  clothe_graphic_type: 11,
};

/** Every feature at index 0, which is what the wizard opens with. */
export function defaultAvatarChoices(): AvatarChoices {
  return Object.fromEntries(AVATAR_FEATURES.map((feature) => [feature, 0])) as AvatarChoices;
}

function toQuery(choices: AvatarChoices): string {
  return new URLSearchParams(
    AVATAR_FEATURES.map((feature) => [feature, String(choices[feature])]),
  ).toString();
}

/**
 * URL of the rendered avatar, used directly as an `<img src>`.
 *
 * `/avatar/custom` answers with `image/svg+xml`, so it is fetched by the browser rather
 * than through the typed client. The URL is deterministic for a given set of choices,
 * which lets the HTTP cache absorb the repeats as the user steps back and forth.
 */
export function avatarImageUrl(choices: AvatarChoices): string {
  return `/api/v1/avatar/custom?${toQuery(choices)}`;
}

/** The same URL with one feature overridden, for an option tile's preview. */
export function avatarOptionUrl(
  choices: AvatarChoices,
  feature: AvatarFeature,
  value: number,
): string {
  return avatarImageUrl({ ...choices, [feature]: value });
}

/**
 * Persist the avatar on the account.
 *
 * Legacy checks `res.ok` and does nothing on failure, leaving the spinner up forever.
 * Here a failure throws so the UI can show it and offer a retry.
 */
export async function saveAvatar(choices: AvatarChoices): Promise<void> {
  const { response } = await fetchClient.POST('/api/v1/avatar/save', {
    params: { query: { ...choices } },
  });
  if (!response.ok) {
    throw new Error(`Saving the avatar failed with status ${response.status}`);
  }
}

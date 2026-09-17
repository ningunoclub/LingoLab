// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw';
import {
  AVATAR_FEATURES,
  AVATAR_OPTION_COUNTS,
  avatarImageUrl,
  avatarOptionUrl,
  defaultAvatarChoices,
  saveAvatar,
} from './avatarApi';

describe('avatar choices', () => {
  it('covers the twelve features the wizard walks through, in legacy order', () => {
    expect(AVATAR_FEATURES).toEqual([
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
    ]);
  });

  it('omits nose_type, which has a single enum member', () => {
    expect(AVATAR_FEATURES).not.toContain('nose_type');
  });

  it('starts every feature at index 0', () => {
    expect(Object.values(defaultAvatarChoices()).every((value) => value === 0)).toBe(true);
  });

  /**
   * Pins the counts against the backend enums (`AvatarItemsAsList`). A count that is too
   * high renders a 400 tile; too low silently hides options.
   */
  it('keeps the option counts the backend enums actually offer', () => {
    expect(AVATAR_OPTION_COUNTS).toEqual({
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
    });
  });
});

describe('avatarImageUrl', () => {
  it('sends all twelve features so the preview is fully determined', () => {
    const params = new URL(avatarImageUrl(defaultAvatarChoices()), 'http://localhost').searchParams;
    for (const feature of AVATAR_FEATURES) {
      expect(params.get(feature)).toBe('0');
    }
  });

  it('is stable for equal choices, so the HTTP cache absorbs repeat steps', () => {
    expect(avatarImageUrl(defaultAvatarChoices())).toBe(avatarImageUrl(defaultAvatarChoices()));
  });
});

describe('avatarOptionUrl', () => {
  it('overrides only the feature being previewed', () => {
    const choices = { ...defaultAvatarChoices(), skin_color: 3 };
    const params = new URL(avatarOptionUrl(choices, 'mouth_type', 5), 'http://localhost')
      .searchParams;
    expect(params.get('mouth_type')).toBe('5');
    expect(params.get('skin_color')).toBe('3');
    expect(params.get('top_type')).toBe('0');
  });

  it('does not mutate the caller’s choices', () => {
    const choices = defaultAvatarChoices();
    avatarOptionUrl(choices, 'mouth_type', 5);
    expect(choices.mouth_type).toBe(0);
  });
});

describe('saveAvatar', () => {
  it('posts every feature as a query parameter', async () => {
    let seen: URLSearchParams | undefined;
    server.use(
      http.post('http://localhost/api/v1/avatar/save', ({ request }) => {
        seen = new URL(request.url).searchParams;
        return new HttpResponse(null, { status: 200 });
      }),
    );

    await saveAvatar({ ...defaultAvatarChoices(), clothe_color: 7 });

    expect(seen?.get('clothe_color')).toBe('7');
    for (const feature of AVATAR_FEATURES) {
      expect(seen?.get(feature)).not.toBeNull();
    }
  });

  /** Legacy ignores a failed save entirely, leaving the spinner up. */
  it('throws when the backend rejects the save', async () => {
    server.use(
      http.post(
        'http://localhost/api/v1/avatar/save',
        () => new HttpResponse(null, { status: 401 }),
      ),
    );

    await expect(saveAvatar(defaultAvatarChoices())).rejects.toThrow(/401/);
  });
});

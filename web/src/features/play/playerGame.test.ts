// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from 'vitest';
import { parsePlayerGame } from './playerGame';

describe('parsePlayerGame', () => {
  it('keeps what the player screens use', () => {
    expect(
      parsePlayerGame({
        title: '<b>Verbs</b>',
        description: 'Past simple',
        cover_image: 'abc--def',
        background_color: '#fde68a',
        background_image: null,
        started: true,
        question_count: 4,
        game_pin: '482913',
      }),
    ).toEqual({
      title: '<b>Verbs</b>',
      description: 'Past simple',
      coverImage: 'abc--def',
      backgroundColor: '#fde68a',
      started: true,
      questionCount: 4,
    });
  });

  it('treats empty strings as absent and rejects non-games', () => {
    expect(parsePlayerGame({ title: 'Q', cover_image: '', background_color: '' })).toMatchObject({
      coverImage: null,
      backgroundColor: null,
      started: false,
    });
    expect(parsePlayerGame(null)).toBeNull();
    expect(parsePlayerGame({ description: 'no title' })).toBeNull();
  });
});

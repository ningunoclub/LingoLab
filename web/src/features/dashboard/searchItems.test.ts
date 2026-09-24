// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from 'vitest';
import type { DashboardItem } from './dashboardApi';
import { createItemIndex, searchItems } from './searchItems';

function item(id: string, fields: Partial<DashboardItem>): DashboardItem {
  return {
    type: 'quiz',
    id,
    title: '',
    description: null,
    coverImage: null,
    public: false,
    questionTexts: [],
    stats: null,
    ...fields,
  };
}

const ITEMS = [
  item('a', { title: 'Irregular verbs' }),
  item('b', { title: 'Weather', description: 'Vocabulary for spring and autumn' }),
  item('c', { title: 'Unit 4', questionTexts: ['What is the capital of Scotland?'] }),
];

const ids = (items: DashboardItem[]) => items.map((entry) => entry.id);

describe('searchItems', () => {
  const index = createItemIndex(ITEMS);

  it('shows everything, in order, for an empty term', () => {
    expect(ids(searchItems(index, ITEMS, ''))).toEqual(['a', 'b', 'c']);
    expect(ids(searchItems(index, ITEMS, '   '))).toEqual(['a', 'b', 'c']);
  });

  // Fuse's default threshold (kept from legacy) is loose, so weaker matches can trail
  // behind; what matters is that the best match comes first.
  it('ranks the best title match first, tolerating typos', () => {
    expect(ids(searchItems(index, ITEMS, 'irregular'))[0]).toBe('a');
    expect(ids(searchItems(index, ITEMS, 'wether'))[0]).toBe('b');
  });

  it('matches descriptions and question titles', () => {
    expect(ids(searchItems(index, ITEMS, 'autumn'))[0]).toBe('b');
    expect(ids(searchItems(index, ITEMS, 'Scotland'))[0]).toBe('c');
  });

  it('returns nothing when nothing matches', () => {
    expect(searchItems(index, ITEMS, 'xylophone')).toEqual([]);
  });
});

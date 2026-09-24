// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import Fuse from 'fuse.js';
import type { DashboardItem } from './dashboardApi';

/** Legacy's fields (`title`, `description`, question text) and options. */
export function createItemIndex(items: DashboardItem[]): Fuse<DashboardItem> {
  return new Fuse(items, {
    keys: ['title', 'description', 'questionTexts'],
    findAllMatches: true,
  });
}

/** An empty term shows everything, in the original order; otherwise Fuse's ranking. */
export function searchItems(
  index: Fuse<DashboardItem>,
  items: DashboardItem[],
  term: string,
): DashboardItem[] {
  if (term.trim() === '') return items;
  return index.search(term).map((result) => result.item);
}

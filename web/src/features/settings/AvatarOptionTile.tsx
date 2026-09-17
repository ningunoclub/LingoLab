// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { cn } from '@/lib/utils';
import { AvatarImage } from './AvatarImage';

type Props = {
  src: string;
  label: string;
  selected: boolean;
  onSelect: () => void;
};

/**
 * One choice in the wizard's grid.
 *
 * Legacy renders a bare `<img>` inside a button with no alt text and no selected state.
 * Here the tile is labelled and the current choice is marked with a ring plus a filled
 * background, never colour alone.
 */
export function AvatarOptionTile({ src, label, selected, onSelect }: Props) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={label}
      className={cn(
        'flex aspect-square min-h-[72px] items-center justify-center rounded-[--radius] border-2 p-1',
        'transition-colors duration-150 hover:bg-accent',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        selected ? 'border-primary bg-primary/10' : 'border-border bg-card',
      )}
    >
      <AvatarImage src={src} alt="" className="h-full w-full object-contain" />
    </button>
  );
}

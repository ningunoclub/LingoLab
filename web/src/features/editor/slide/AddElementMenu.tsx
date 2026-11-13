// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { Circle, Heading, ImageIcon, Plus, Square, Type } from 'lucide-react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Kbd } from '@/components/ui/kbd';
import { SLIDE_ELEMENTS, SLIDE_SHORTCUTS, type SlideElement } from '@/lib/slide';
import { ELEMENT_KEYS } from './slideElements';

const ICONS: Record<SlideElement, typeof Plus> = {
  HEADLINE: Heading,
  TEXT: Type,
  RECTANGLE: Square,
  CIRCLE: Circle,
  IMAGE: ImageIcon,
};

const SHORTCUT_OF = Object.fromEntries(
  Object.entries(SLIDE_SHORTCUTS).map(([key, type]) => [type, key]),
) as Record<SlideElement, string>;

type Props = {
  onAdd: (type: SlideElement) => void;
  disabled?: boolean;
};

/**
 * Port of legacy `slides/element_selection.svelte`: the list of elements to add, each with
 * its one-key shortcut. Legacy listened for the keys on `document.body` for as long as the
 * page lived (the listener was never removed); here they only work while the menu is open.
 */
export function AddElementMenu({ onAdd, disabled }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  // Set when an element was picked: the editor moves focus to the canvas (or the image
  // dialog), and the menu must not pull it back to its button when it closes.
  const added = useRef(false);
  const pick = (type: SlideElement) => {
    added.current = true;
    onAdd(type);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild disabled={disabled}>
        <Button type="button" className="h-11">
          <Plus aria-hidden="true" />
          {t('editor.slide.add_element')}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-72"
        onCloseAutoFocus={(event) => {
          if (added.current) event.preventDefault();
          added.current = false;
        }}
        onKeyDown={(event) => {
          if (event.ctrlKey || event.metaKey || event.altKey) return;
          const type = SLIDE_SHORTCUTS[event.key.toLowerCase()];
          if (type === undefined) return;
          // Stop the menu's type-ahead; the shortcut picks the element directly.
          event.preventDefault();
          event.stopPropagation();
          setOpen(false);
          pick(type);
        }}
      >
        {SLIDE_ELEMENTS.map((type) => {
          const Icon = ICONS[type];
          return (
            <DropdownMenuItem
              key={type}
              onSelect={() => pick(type)}
              aria-keyshortcuts={SHORTCUT_OF[type]}
              className="min-h-11 gap-3"
            >
              <Icon className="size-5 text-primary" aria-hidden="true" />
              <span className="flex flex-col">
                <span className="font-medium">{t(ELEMENT_KEYS[type].name)}</span>
                <span className="text-xs text-muted-foreground">
                  {t(ELEMENT_KEYS[type].description)}
                </span>
              </span>
              <Kbd className="ml-auto" aria-hidden="true">
                {SHORTCUT_OF[type]}
              </Kbd>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

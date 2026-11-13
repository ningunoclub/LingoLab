// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Palette,
  PencilLine,
  Trash2,
  TypeOutline,
} from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SLIDE_FONT_SIZE, type SlideElement } from '@/lib/slide';
import { AddElementMenu } from './AddElementMenu';

/** What the toolbar knows about the selected element. Null when nothing is selected. */
export type SelectedElement = {
  /** Colour shown in the picker, as `#rrggbb`; null when the element has no colour to change. */
  color: string | null;
  /** Font size; null for elements without text. */
  fontSize: number | null;
  /** Labels (headline, text) can be edited in place. */
  editableText: boolean;
};

type Props = {
  selected: SelectedElement | null;
  disabled?: boolean;
  onAdd: (type: SlideElement) => void;
  onColor: (color: string) => void;
  onFontSize: (size: number) => void;
  onEditText: () => void;
  onForward: () => void;
  onBackward: () => void;
  onDelete: () => void;
};

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* A disabled button gets no pointer events, so the wrapper carries the tooltip. */}
        <span className="inline-flex">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="size-11"
            aria-label={label}
            disabled={disabled}
            onClick={onClick}
          >
            {children}
          </Button>
        </span>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Port of legacy `slides/edit_menu.svelte` (colour, font size, forward/backward) with the
 * add menu of `slides/element_selection.svelte`. Delete and "edit text" are new buttons for
 * what legacy only offered by keyboard (Delete/Backspace) and double-click, so touch screens
 * can do them too.
 */
export function SlideToolbar({
  selected,
  disabled = false,
  onAdd,
  onColor,
  onFontSize,
  onEditText,
  onForward,
  onBackward,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const id = useId();
  // The slider shows its value while it is dragged; the element changes when it is let go,
  // as legacy's range input changed it `onchange`.
  const [draftSize, setDraftSize] = useState<number | null>(null);
  const fontSize = draftSize ?? selected?.fontSize ?? SLIDE_FONT_SIZE.min;
  const none = disabled || selected === null;

  return (
    <div
      role="toolbar"
      aria-label={t('editor.slide.toolbar')}
      className="flex flex-wrap items-center gap-2"
    >
      <AddElementMenu onAdd={onAdd} disabled={disabled} />

      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11"
                  aria-label={t('editor.slide.color')}
                  disabled={none || selected?.color === null}
                >
                  <Palette aria-hidden="true" />
                </Button>
              </PopoverTrigger>
            </span>
          </TooltipTrigger>
          <TooltipContent>{t('editor.slide.color')}</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-auto">
          <div className="flex items-center gap-3">
            <Label htmlFor={`${id}-color`}>{t('editor.slide.color')}</Label>
            <input
              id={`${id}-color`}
              type="color"
              value={selected?.color ?? '#000000'}
              onChange={(event) => onColor(event.target.value)}
              className="h-11 w-16 cursor-pointer rounded-md border bg-transparent p-1"
            />
          </div>
        </PopoverContent>
      </Popover>

      <Popover onOpenChange={() => setDraftSize(null)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex">
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="size-11"
                  aria-label={t('editor.slide.font_size')}
                  disabled={none || selected?.fontSize === null}
                >
                  <TypeOutline aria-hidden="true" />
                </Button>
              </PopoverTrigger>
            </span>
          </TooltipTrigger>
          <TooltipContent>{t('editor.slide.font_size')}</TooltipContent>
        </Tooltip>
        <PopoverContent className="w-72">
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium" aria-hidden="true">
                {t('editor.slide.font_size')}
              </span>
              <span className="text-sm tabular-nums text-muted-foreground">{fontSize}</span>
            </div>
            <Slider
              thumbLabels={[t('editor.slide.font_size')]}
              min={SLIDE_FONT_SIZE.min}
              max={SLIDE_FONT_SIZE.max}
              step={1}
              value={[fontSize]}
              onValueChange={([value]) => setDraftSize(value ?? null)}
              onValueCommit={([value]) => {
                if (value !== undefined) onFontSize(value);
                setDraftSize(null);
              }}
            />
          </div>
        </PopoverContent>
      </Popover>

      <IconButton
        label={t('editor.slide.edit_text')}
        disabled={none || !selected?.editableText}
        onClick={onEditText}
      >
        <PencilLine aria-hidden="true" />
      </IconButton>
      <IconButton label={t('editor.slide.bring_forward')} disabled={none} onClick={onForward}>
        <ArrowUpToLine aria-hidden="true" />
      </IconButton>
      <IconButton label={t('editor.slide.send_backward')} disabled={none} onClick={onBackward}>
        <ArrowDownToLine aria-hidden="true" />
      </IconButton>
      <IconButton label={t('editor.slide.delete_element')} disabled={none} onClick={onDelete}>
        <Trash2 aria-hidden="true" />
      </IconButton>
    </div>
  );
}

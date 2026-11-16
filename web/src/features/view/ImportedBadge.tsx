// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { BadgeCheck, CircleHelp, CircleX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * Port of legacy `lib/view_quiz/imported_or_not.svelte`: one of three icons, explained by a
 * tooltip. The text is also there for screen readers, since the icon alone says nothing.
 */
export function ImportedBadge({ imported }: { imported: boolean | null | undefined }) {
  const { t } = useTranslation();
  const [Icon, key] =
    imported === true
      ? [CircleX, 'view_quiz_page.imported']
      : imported === false
        ? [BadgeCheck, 'view_quiz_page.own_work']
        : [CircleHelp, 'view_quiz_page.maybe_imported'];
  const label = t(key);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="inline-flex size-11 items-center justify-center rounded-full text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring"
          aria-label={label}
        >
          <Icon className="size-7" aria-hidden="true" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  );
}

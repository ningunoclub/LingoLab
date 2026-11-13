// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { ImageOff } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import { parseSlide, slideText, withoutForeignImages } from '@/lib/slide';
import { cn } from '@/lib/utils';

type Props = {
  /** The question's `answers`: pikaso JSON as a string, `''` for an empty slide. */
  slide: string;
  className?: string;
};

type Rendered =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error' }
  | { status: 'done'; src: string; alt: string };

/**
 * Shows a SLIDE question read-only, as a picture. Used by the host screen, `/view` and
 * practice mode.
 *
 * Port of legacy `lib/play/admin/slide.svelte`: draw the stored canvas off-screen with
 * pikaso, export it as an image and show the image. pikaso is loaded on demand, as legacy
 * imported the component lazily.
 */
export function SlideRenderer({ slide, className }: Props) {
  const { t } = useTranslation();
  const [rendered, setRendered] = useState<Rendered>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    let destroy: (() => void) | undefined;
    setRendered({ status: 'loading' });

    (async () => {
      const json = parseSlide(slide);
      if (json === null) {
        if (!cancelled) setRendered({ status: 'empty' });
        return;
      }
      const { default: Pikaso } = await import('pikaso');
      if (cancelled) return;
      // A detached container: nothing is added to the page, the canvas only exists to be exported.
      const container = document.createElement('div');
      const canvas = new Pikaso({ container, selection: { interactive: false } });
      destroy = () => canvas.board.stage.destroy();
      // pikaso's types say `UnknownObject` where `SlideJson` says `unknown`; the shape is the same.
      await canvas.import.json(
        withoutForeignImages(json) as Parameters<typeof canvas.import.json>[0],
      );
      // Twice the stage's resolution, so the picture stays sharp on a projector.
      const src = canvas.export.toImage({ pixelRatio: 2 });
      if (!cancelled) setRendered({ status: 'done', src, alt: slideText(json) });
    })().catch(() => {
      if (!cancelled) setRendered({ status: 'error' });
    });

    return () => {
      cancelled = true;
      destroy?.();
    };
  }, [slide]);

  // The slide is a sheet of paper, white in both themes, as the editor shows it.
  const frame = cn('overflow-hidden rounded-xl border bg-white', className);

  switch (rendered.status) {
    case 'loading':
      return <Skeleton className={cn('aspect-video w-full rounded-xl', className)} />;
    case 'empty':
      return (
        <div
          className={cn(frame, 'flex aspect-video w-full items-center justify-center')}
          role="img"
          aria-label={t('slide.empty')}
        />
      );
    case 'error':
      return (
        <div
          className={cn(
            'flex aspect-video w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed text-muted-foreground',
            className,
          )}
          role="img"
          aria-label={t('slide.unavailable')}
        >
          <ImageOff className="size-6" aria-hidden="true" />
          <span className="text-sm">{t('slide.unavailable')}</span>
        </div>
      );
    case 'done':
      return (
        <img
          src={rendered.src}
          alt={rendered.alt || t('words.slide')}
          className={cn(frame, 'block h-auto w-full')}
        />
      );
  }
}

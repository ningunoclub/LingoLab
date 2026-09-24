// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useQuery } from '@tanstack/react-query';
import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchMediaInfo, mediaUrl } from '@/lib/media';
import { cn } from '@/lib/utils';

type Props = {
  /** Storage file name, as stored in e.g. `quiz.cover_image`. */
  src: string;
  className?: string;
  muted?: boolean;
  allowFullscreen?: boolean;
};

/**
 * Renders a stored image or video. Images show their thumbhash placeholder until the
 * real file has loaded and open full-screen on click; videos autoplay in a loop.
 *
 * Port of legacy `lib/editor/MediaComponent.svelte`. Legacy fetched images as blobs to
 * build an object URL; a plain `src` loads the same same-origin URL with the same cookie.
 */
export function MediaComponent({ src, className, muted = true, allowFullscreen = true }: Props) {
  const { t } = useTranslation();
  const [loaded, setLoaded] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const info = useQuery({
    queryKey: ['media', src],
    queryFn: () => fetchMediaInfo(src),
    staleTime: Number.POSITIVE_INFINITY,
  });

  if (info.isPending) return <Skeleton className={cn('size-full', className)} />;

  if (info.isError) {
    return (
      <div
        className={cn('flex items-center justify-center text-muted-foreground', className)}
        role="img"
        aria-label={t('media.unavailable')}
      >
        <ImageOff className="size-6" aria-hidden="true" />
      </div>
    );
  }

  if (info.data.type === 'video') {
    return (
      <video
        className={className}
        disablePictureInPicture
        controls
        autoPlay
        loop
        muted={muted}
        preload="metadata"
      >
        <source src={mediaUrl(src)} />
      </video>
    );
  }

  const { placeholder, altText } = info.data;
  // The thumbhash sits behind the image, so it shows until the real file fades in.
  const frameClass = cn('relative block overflow-hidden', className);
  const frameStyle = placeholder
    ? { backgroundImage: `url(${placeholder})`, backgroundSize: 'cover' }
    : undefined;
  const image = (
    <img
      src={mediaUrl(src)}
      alt={altText ?? ''}
      loading="lazy"
      onLoad={() => setLoaded(true)}
      className={cn(
        'size-full object-cover transition-opacity duration-300 motion-reduce:transition-none',
        loaded ? 'opacity-100' : 'opacity-0',
      )}
    />
  );

  if (!allowFullscreen) {
    return (
      <span className={frameClass} style={frameStyle}>
        {image}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        className={cn(frameClass, 'cursor-zoom-in')}
        style={frameStyle}
        onClick={() => setFullscreen(true)}
        aria-label={t('media.open_fullscreen')}
      >
        {image}
      </button>
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-w-[95vw] p-2 sm:max-w-[95vw]">
          <DialogTitle className="sr-only">{altText || t('media.open_fullscreen')}</DialogTitle>
          <img
            src={mediaUrl(src)}
            alt={altText ?? ''}
            className="m-auto max-h-[85vh] max-w-full rounded-md object-contain"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

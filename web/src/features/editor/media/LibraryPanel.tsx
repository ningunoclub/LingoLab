// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useQuery } from '@tanstack/react-query';
import { ImageOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { mediaUrl } from '@/lib/media';
import { fetchRecentUploads, type StorageItem } from './storageApi';

type Props = {
  onSelect: (id: string) => void;
};

/** Port of legacy `lib/editor/uploader/Library.svelte`: the user's 50 latest uploads. */
export function LibraryPanel({ onSelect }: Props) {
  const { t } = useTranslation();
  const uploads = useQuery({ queryKey: ['storage', 'recent'], queryFn: fetchRecentUploads });

  if (uploads.isPending) {
    return (
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-busy="true">
        {Array.from({ length: 6 }, (_, index) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: static placeholders
          <li key={index}>
            <Skeleton className="aspect-video w-full rounded-md" />
          </li>
        ))}
      </ul>
    );
  }

  if (uploads.isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <p role="alert">{t('uploader.library_error')}</p>
        <Button type="button" variant="outline" onClick={() => void uploads.refetch()}>
          {t('words.retry')}
        </Button>
      </div>
    );
  }

  if (uploads.data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
        <ImageOff className="size-8" aria-hidden="true" />
        <p>{t('uploader.library_empty')}</p>
      </div>
    );
  }

  return (
    <ul className="grid max-h-[60vh] grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3">
      {uploads.data.map((item) => (
        <li key={item.id} className="flex flex-col gap-2 rounded-xl border p-2">
          <Thumbnail item={item} />
          <p className="truncate text-center text-sm" title={item.filename ?? undefined}>
            {item.filename ?? t('uploader.no_name')}
          </p>
          <Button type="button" size="sm" className="min-h-11" onClick={() => onSelect(item.id)}>
            {t('words.select')}
          </Button>
        </li>
      ))}
    </ul>
  );
}

function Thumbnail({ item }: { item: StorageItem }) {
  const className = 'aspect-video w-full rounded-md bg-muted object-contain';
  // Legacy drew videos as <img>, which shows a broken image.
  if (item.mime_type.startsWith('video/')) {
    return <video src={mediaUrl(item.id)} muted preload="metadata" className={className} />;
  }
  return (
    <img src={mediaUrl(item.id)} alt={item.alt_text ?? ''} loading="lazy" className={className} />
  );
}

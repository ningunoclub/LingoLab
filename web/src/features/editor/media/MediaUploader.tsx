// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { ArrowLeft, ImagePlus, Images, Upload } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LibraryPanel } from './LibraryPanel';
import { UploadPanel } from './UploadPanel';

type Source = 'image' | 'library';

type Props = {
  /** Receives the storage id of the uploaded or picked file. */
  onSelect: (id: string) => void;
  /** Names the field, so several "Add Media" buttons on one page stay distinguishable. */
  fieldLabel: string;
};

/**
 * Port of legacy `lib/editor/uploader.svelte`: an "Add Media" button that opens a
 * dialog to choose between uploading a new image and picking an earlier upload.
 *
 * Legacy wrote straight into the editor data, with `selected_question` saying where
 * (undefined = cover, -1 = background, n = question). Here each field passes its own
 * `onSelect`. The Video and Pixabay choices are left out (MIGRATION.md, Phase 2 decisions).
 */
export function MediaUploader({ onSelect, fieldLabel }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<Source | null>(null);

  const setOpenAndReset = (next: boolean) => {
    setOpen(next);
    // Legacy: closing always returns to the type choice.
    if (!next) setSource(null);
  };

  const choose = (id: string) => {
    onSelect(id);
    setOpenAndReset(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className="min-h-11 w-full border-2 border-dashed sm:w-96"
        aria-label={`${t('uploader.add_image')}: ${fieldLabel}`}
        onClick={() => setOpen(true)}
      >
        <ImagePlus aria-hidden="true" />
        {t('uploader.add_image')}
      </Button>

      <Dialog open={open} onOpenChange={setOpenAndReset}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">
              {source === 'image'
                ? t('words.image')
                : source === 'library'
                  ? t('words.library')
                  : t('uploader.select_upload_type')}
            </DialogTitle>
            <DialogDescription>{fieldLabel}</DialogDescription>
          </DialogHeader>

          {source === null ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              <li>
                <SourceButton
                  icon={<Upload className="size-6 text-primary" aria-hidden="true" />}
                  label={t('words.image')}
                  onClick={() => setSource('image')}
                />
              </li>
              <li>
                <SourceButton
                  icon={<Images className="size-6 text-primary" aria-hidden="true" />}
                  label={t('words.library')}
                  onClick={() => setSource('library')}
                />
              </li>
            </ul>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="justify-self-start"
                onClick={() => setSource(null)}
              >
                <ArrowLeft aria-hidden="true" />
                {t('words.back')}
              </Button>
              {source === 'image' ? (
                <UploadPanel onUploaded={choose} />
              ) : (
                <LibraryPanel onSelect={choose} />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function SourceButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-24 w-full flex-col items-center justify-center gap-2 rounded-xl border p-4 outline-none hover:border-primary hover:bg-primary/5 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
    >
      {icon}
      <span className="font-display text-base font-semibold">{label}</span>
    </button>
  );
}

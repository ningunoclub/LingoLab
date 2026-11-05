// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ImageUp, Loader2 } from 'lucide-react';
import { type DragEvent, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ACCEPTED_IMAGE_TYPES,
  checkFile,
  formatFileSize,
  UploadError,
  type UploadProblem,
  uploadFile,
} from './storageApi';

type Props = {
  onUploaded: (id: string) => void;
};

/**
 * The "Image" tab of legacy `uploader.svelte`, which was an Uppy dashboard. Here it is a
 * plain dropzone: pick or drop one image, check it, preview it, then upload it on
 * request. Legacy's in-browser crop and compression are not carried over (ADR-0016).
 */
export function UploadPanel({ onUploaded }: Props) {
  const { t, i18n } = useTranslation();
  const id = useId();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [problem, setProblem] = useState<UploadProblem | null>(null);
  const [dragging, setDragging] = useState(false);
  const preview = usePreviewUrl(file);

  const upload = useMutation({
    mutationFn: uploadFile,
    onSuccess: (storageId) => {
      // The new file belongs at the top of the library next time it opens.
      void queryClient.invalidateQueries({ queryKey: ['storage', 'recent'] });
      onUploaded(storageId);
    },
    onError: (error) => {
      setProblem(error instanceof UploadError ? error.problem : 'upload_failed');
    },
  });

  const pick = (picked: File | undefined) => {
    if (!picked) return;
    const found = checkFile(picked);
    setProblem(found);
    setFile(found ? null : picked);
  };

  const onDrop = (event: DragEvent<HTMLElement>) => {
    event.preventDefault();
    setDragging(false);
    // Legacy: maxNumberOfFiles 1. Only the first dropped file counts.
    pick(event.dataTransfer.files[0]);
  };

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={inputRef}
        id={`${id}-file`}
        type="file"
        accept={ACCEPTED_IMAGE_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(event) => {
          pick(event.target.files?.[0]);
          // Let the same file be picked again after an error.
          event.target.value = '';
        }}
      />

      {file && preview ? (
        <figure className="flex flex-col items-center gap-2 rounded-xl border p-3">
          <img src={preview} alt="" className="max-h-64 w-auto rounded-md object-contain" />
          <figcaption className="w-full truncate text-center text-sm text-muted-foreground">
            {file.name} · {formatFileSize(file.size, i18n.language)}
          </figcaption>
        </figure>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          aria-describedby={problem ? `${id}-problem` : undefined}
          className={cn(
            'flex min-h-48 w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 text-center outline-none transition-colors duration-150 motion-reduce:transition-none',
            'hover:border-primary hover:bg-primary/5 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
            dragging && 'border-primary bg-primary/5',
          )}
        >
          <ImageUp className="size-8 text-primary" aria-hidden="true" />
          <span className="font-medium">{t('uploader.drop_here')}</span>
          <span className="text-sm text-muted-foreground">{t('uploader.choose_file')}</span>
        </button>
      )}

      {problem ? (
        <p id={`${id}-problem`} role="alert" className="text-sm text-destructive">
          {t(`uploader.${problem}`)}
        </p>
      ) : null}

      {file ? (
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={upload.isPending}
            onClick={() => inputRef.current?.click()}
          >
            {t('uploader.change_file')}
          </Button>
          <Button type="button" disabled={upload.isPending} onClick={() => upload.mutate(file)}>
            {upload.isPending ? (
              <Loader2 className="animate-spin motion-reduce:animate-none" aria-hidden="true" />
            ) : null}
            {t('words.upload')}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

/** An object URL for the picked file, revoked when the file changes or the panel closes. */
function usePreviewUrl(file: File | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  return url;
}

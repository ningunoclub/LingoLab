// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Upload rules and calls from frontend/src/lib/editor/uploader.svelte and
// uploader/Library.svelte.
import { fetchClient } from '@/api/client';
import type { components } from '@/api/schema';

export type StorageItem = components['schemas']['PrivateStorageItem'];

/** Legacy Uppy restriction `maxFileSize`. */
export const MAX_FILE_SIZE = 10_490_000;

/**
 * The image types the backend stores (`ALLOWED_MIME_TYPES` in `classquiz/config.py`,
 * minus `video/mp4`, which belonged to the video tab). Legacy accepted `image/*` on
 * the client and let the backend reject the rest with a 422.
 */
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

/** How many recent uploads the library shows (the backend caps it at 50 as well). */
export const LIBRARY_COUNT = 50;

/** Each reason maps to an i18n key under `uploader.*`. */
export type UploadProblem = 'too_large' | 'unsupported_type' | 'storage_limit' | 'upload_failed';

export class UploadError extends Error {
  constructor(readonly problem: UploadProblem) {
    super(`upload failed: ${problem}`);
    this.name = 'UploadError';
  }
}

/** Client-side check before uploading; null means the file is fine. */
export function checkFile(file: File): UploadProblem | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return 'unsupported_type';
  if (file.size > MAX_FILE_SIZE) return 'too_large';
  return null;
}

/** Uploads one file and returns its storage id, which goes into the image field. */
export async function uploadFile(file: File): Promise<string> {
  const { data, response } = await fetchClient.POST('/api/v1/storage/', {
    // The generated type models the binary part as a string.
    body: { file: file as unknown as string },
    bodySerializer: (body) => {
      const form = new FormData();
      // Name the part explicitly, as Uppy did, so the original file name survives.
      form.append('file', body.file as unknown as Blob, file.name);
      return form;
    },
  });
  if (response.status === 422) throw new UploadError('unsupported_type');
  if (response.status === 409) throw new UploadError('storage_limit');
  if (response.status === 413) throw new UploadError('too_large');
  if (!response.ok || !data?.id) throw new UploadError('upload_failed');
  return data.id;
}

export async function fetchRecentUploads(): Promise<StorageItem[]> {
  const { data, response } = await fetchClient.GET('/api/v1/storage/list/last', {
    params: { query: { count: LIBRARY_COUNT } },
  });
  if (!response.ok || !data)
    throw new Error(`Loading uploads failed with status ${response.status}`);
  return data;
}

/** "2.4 MB"-style size for the file preview. */
export function formatFileSize(bytes: number, locale?: string): string {
  const units = ['byte', 'kilobyte', 'megabyte'] as const;
  let value = bytes;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return new Intl.NumberFormat(locale, {
    style: 'unit',
    unit: units[unit],
    unitDisplay: 'short',
    maximumFractionDigits: unit === 0 ? 0 : 1,
  }).format(value);
}

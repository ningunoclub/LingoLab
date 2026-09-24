// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Ported from the data half of frontend/src/lib/editor/MediaComponent.svelte.
import { thumbHashToDataURL } from 'thumbhash';

export type MediaInfo =
  | { type: 'video' }
  | { type: 'img'; placeholder: string | null; altText: string | null };

function base64ToBytes(base64: string): Uint8Array {
  const binString = atob(base64);
  return Uint8Array.from(binString, (char) => char.codePointAt(0) ?? 0);
}

/** Decodes a base64 header, or returns null when it is absent or malformed. */
function decodeHeader<T>(value: string | null, decode: (bytes: Uint8Array) => T): T | null {
  if (!value) return null;
  try {
    return decode(base64ToBytes(value));
  } catch {
    return null;
  }
}

export function mediaUrl(src: string): string {
  return `/api/v1/storage/download/${src}`;
}

/**
 * Asks the backend what a stored file is. The headers carry the MIME type, a thumbhash
 * for the blurred placeholder and the base64-encoded alt text.
 *
 * Legacy decodes both headers unconditionally, so a file without a thumbhash or alt text
 * (anything not in the storage table, e.g. older uploads) throws and the image never
 * renders. Here a missing header just means no placeholder / no alt text.
 */
export async function fetchMediaInfo(src: string): Promise<MediaInfo> {
  const res = await fetch(`/api/v1/storage/info/${src}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`Media info failed with status ${res.status}`);
  const contentType = res.headers.get('Content-Type') ?? '';
  if (contentType.includes('video')) return { type: 'video' };
  return {
    type: 'img',
    placeholder: decodeHeader(res.headers.get('X-Thumbhash'), thumbHashToDataURL),
    altText: decodeHeader(res.headers.get('X-Alt-Text'), (bytes) =>
      new TextDecoder().decode(bytes),
    ),
  };
}

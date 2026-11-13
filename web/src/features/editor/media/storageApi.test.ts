// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw';
import {
  checkFile,
  fetchRecentUploads,
  formatFileSize,
  MAX_FILE_SIZE,
  UploadError,
  uploadFile,
} from './storageApi';

const UPLOAD = 'http://localhost/api/v1/storage/';
const RECENT = 'http://localhost/api/v1/storage/list/last';

const png = (size = 4) => new File([new Uint8Array(size)], 'cat.png', { type: 'image/png' });

describe('checkFile', () => {
  it('accepts the image types the backend stores', () => {
    for (const type of ['image/png', 'image/jpeg', 'image/gif', 'image/webp']) {
      expect(checkFile(new File(['x'], 'a', { type }))).toBeNull();
    }
  });

  it('rejects other types, including images the backend would refuse', () => {
    expect(checkFile(new File(['x'], 'a.svg', { type: 'image/svg+xml' }))).toBe('unsupported_type');
    expect(checkFile(new File(['x'], 'a.pdf', { type: 'application/pdf' }))).toBe(
      'unsupported_type',
    );
  });

  it('rejects files over the legacy size limit', () => {
    expect(checkFile(png(MAX_FILE_SIZE))).toBeNull();
    expect(checkFile(png(MAX_FILE_SIZE + 1))).toBe('too_large');
  });
});

describe('uploadFile', () => {
  it('posts the file as multipart field "file" and returns the storage id', async () => {
    let contentType = '';
    let body = '';
    server.use(
      http.post(UPLOAD, async ({ request }) => {
        // jsdom's FormData reaches MSW through undici, which drops the file name (it
        // becomes "blob") and cannot parse the body back with formData(). So check the raw
        // part's field name and type; browsers keep the name.
        contentType = request.headers.get('content-type') ?? '';
        body = await request.text();
        return HttpResponse.json({ id: 'b1946ac9-2d7c-4b3e-9f0c-3a5e8d1a0f11' });
      }),
    );
    await expect(uploadFile(png())).resolves.toBe('b1946ac9-2d7c-4b3e-9f0c-3a5e8d1a0f11');
    expect(contentType).toMatch(/^multipart\/form-data; boundary=/);
    expect(body).toContain('Content-Disposition: form-data; name="file"; filename=');
    expect(body).toContain('Content-Type: image/png');
  });

  it.each([
    [422, 'unsupported_type'],
    [409, 'storage_limit'],
    [413, 'too_large'],
    [500, 'upload_failed'],
  ] as const)('maps status %i to %s', async (status, problem) => {
    server.use(http.post(UPLOAD, () => HttpResponse.json({ detail: 'x' }, { status })));
    const error = await uploadFile(png()).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(UploadError);
    expect((error as UploadError).problem).toBe(problem);
  });
});

describe('fetchRecentUploads', () => {
  it('asks for the 50 latest uploads', async () => {
    let count: string | null = null;
    server.use(
      http.get(RECENT, ({ request }) => {
        count = new URL(request.url).searchParams.get('count');
        return HttpResponse.json([]);
      }),
    );
    await expect(fetchRecentUploads()).resolves.toEqual([]);
    expect(count).toBe('50');
  });

  it('throws when the request fails', async () => {
    server.use(http.get(RECENT, () => new HttpResponse(null, { status: 500 })));
    await expect(fetchRecentUploads()).rejects.toThrow();
  });
});

describe('formatFileSize', () => {
  it('picks a readable unit', () => {
    expect(formatFileSize(512, 'en')).toBe('512 byte');
    expect(formatFileSize(2_400_000, 'en')).toBe('2.4 MB');
  });
});

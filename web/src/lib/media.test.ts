// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/msw';
import { fetchMediaInfo } from './media';

const INFO = 'http://localhost/api/v1/storage/info/:file';

/** A real 32x32 thumbhash, so the placeholder decoder runs for real. */
const THUMBHASH = 'HBkSHYSIeHiPiHh8eJd4eTN0EEQG';

describe('fetchMediaInfo', () => {
  it('recognises a video by its content type', async () => {
    server.use(
      http.get(INFO, () => new HttpResponse(null, { headers: { 'Content-Type': 'video/mp4' } })),
    );
    await expect(fetchMediaInfo('clip')).resolves.toEqual({ type: 'video' });
  });

  it('decodes the thumbhash and the base64 alt text', async () => {
    server.use(
      http.get(
        INFO,
        () =>
          new HttpResponse(null, {
            headers: {
              'Content-Type': 'image/png',
              'X-Thumbhash': THUMBHASH,
              'X-Alt-Text': btoa('A red bus'),
            },
          }),
      ),
    );
    const info = await fetchMediaInfo('pic');
    expect(info).toMatchObject({ type: 'img', altText: 'A red bus' });
    expect(info.type === 'img' && info.placeholder).toMatch(/^data:image\/png;base64,/);
  });

  it('still shows an image that has no thumbhash or alt text (legacy threw)', async () => {
    server.use(
      http.get(INFO, () => new HttpResponse(null, { headers: { 'Content-Type': 'image/*' } })),
    );
    await expect(fetchMediaInfo('old')).resolves.toEqual({
      type: 'img',
      placeholder: null,
      altText: null,
    });
  });

  it('fails on a missing file, so the component can show its fallback', async () => {
    server.use(http.get(INFO, () => new HttpResponse(null, { status: 404 })));
    await expect(fetchMediaInfo('gone')).rejects.toThrow();
  });
});

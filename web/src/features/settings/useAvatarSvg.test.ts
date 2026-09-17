// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { renderHook, waitFor } from '@testing-library/react';
import { HttpResponse, http } from 'msw';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { server } from '@/test/msw';
import { useAvatarSvg } from './useAvatarSvg';

const URL_UNDER_TEST = '/api/v1/avatar/custom?skin_color=0';
const SVG = '<svg xmlns="http://www.w3.org/2000/svg"><circle r="1" /></svg>';

beforeEach(() => {
  // jsdom has no blob URL support. Patch just these two methods, so the rest of the URL
  // API (which msw and the fetch layer rely on) keeps working.
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => `blob:${(blob as Blob).type}`);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
});

describe('useAvatarSvg', () => {
  /**
   * The backend answers with both `text/plain` and `image/svg+xml`, and browsers honour
   * the first, so an <img> pointed straight at the endpoint stays blank. The hook exists
   * to relabel those bytes.
   */
  it('relabels the markup as image/svg+xml whatever the server said', async () => {
    server.use(
      http.get('http://localhost/api/v1/avatar/custom', () =>
        HttpResponse.text(SVG, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } }),
      ),
    );

    const { result } = renderHook(() => useAvatarSvg(URL_UNDER_TEST));

    await waitFor(() => expect(result.current.href).toBe('blob:image/svg+xml'));
    expect(result.current.failed).toBe(false);
  });

  it('reports a failure so the caller can show a fallback', async () => {
    server.use(
      http.get('http://localhost/api/v1/avatar/custom', () =>
        HttpResponse.text('nope', { status: 400 }),
      ),
    );

    const { result } = renderHook(() => useAvatarSvg(URL_UNDER_TEST));

    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.href).toBeNull();
  });

  it('releases the blob URL when the choices change', async () => {
    server.use(http.get('http://localhost/api/v1/avatar/custom', () => HttpResponse.text(SVG)));

    const { result, unmount } = renderHook(() => useAvatarSvg(URL_UNDER_TEST));
    await waitFor(() => expect(result.current.href).not.toBeNull());

    unmount();

    expect(URL.revokeObjectURL).toHaveBeenCalled();
  });
});

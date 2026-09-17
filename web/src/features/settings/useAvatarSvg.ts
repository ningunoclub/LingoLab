// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useEffect, useState } from 'react';

/**
 * Fetch an avatar SVG and hand back a URL an `<img>` will actually render.
 *
 * `GET /api/v1/avatar/custom` is declared with `response_class=PlainTextResponse` and then
 * *appends* a second Content-Type (`classquiz/routers/avatar.py`), so the response carries
 * both `text/plain; charset=utf-8` and `image/svg+xml`. Browsers honour the first and
 * refuse to paint it in an `<img>`, which is why the tiles are blank in the legacy app too.
 *
 * The backend is out of scope during the rewrite, so the bytes are re-labelled here: fetch
 * the markup and wrap it in a blob URL typed `image/svg+xml`. Same request, same payload,
 * and it works behind the production proxy as well as the dev server — a Vite proxy header
 * rewrite would only have papered over it in dev.
 *
 * Remove this once the upstream Content-Type is fixed; `avatarImageUrl` alone would do.
 */
export function useAvatarSvg(url: string): { href: string | null; failed: boolean } {
  const [href, setHref] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | undefined;
    const controller = new AbortController();

    setFailed(false);

    fetch(url, { signal: controller.signal, credentials: 'include' })
      .then(async (response) => {
        if (!response.ok) throw new Error(String(response.status));
        const markup = await response.text();
        objectUrl = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }));
        setHref(objectUrl);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setFailed(true);
      });

    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return { href, failed };
}

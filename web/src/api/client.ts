// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import createFetchClient from 'openapi-fetch';
import createClient from 'openapi-react-query';
import type { paths } from './schema';

/**
 * Same-origin base URL + `credentials: 'include'`: the backend authenticates with an
 * httpOnly `access_token` cookie that JS cannot read. In dev, Vite proxies /api to :8000,
 * so requests stay same-origin and the cookie is sent normally.
 *
 * The origin is taken from `location` rather than hardcoded, so the app works unchanged
 * behind the Cloudflare Tunnel in production (and is parseable under jsdom in tests).
 */
export const fetchClient = createFetchClient<paths>({
  baseUrl: globalThis.location?.origin ?? 'http://localhost',
  credentials: 'include',
  // Resolve fetch per call instead of capturing globalThis.fetch at module load.
  // openapi-fetch would otherwise bind the original reference, which breaks any
  // later patching of the global - MSW in tests, most importantly.
  fetch: (request) => globalThis.fetch(request),
});

export const $api = createClient(fetchClient);

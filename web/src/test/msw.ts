// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { setupServer } from 'msw/node';

/** Shared MSW server. Handlers are registered per test with server.use(). */
export const server = setupServer();

// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// SessionEnd hook: copies the raw Claude Code transcript into docs/thesis/_sessions/
// (git-ignored). This is mechanical archiving of raw data, not documentation writing.
// It never fails the session: all errors are swallowed.
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const src = input.transcript_path;
  const id = input.session_id;
  if (!src || !id || !existsSync(src)) process.exit(0);

  const root = process.env.CLAUDE_PROJECT_DIR || input.cwd;
  const dir = join(root, 'docs', 'thesis', '_sessions');
  mkdirSync(dir, { recursive: true });

  // Resumed sessions overwrite their earlier copy (the transcript only grows).
  const existing = readdirSync(dir).find((f) => f.endsWith(`_${id}.jsonl`));
  const day = new Date().toISOString().slice(0, 10);
  copyFileSync(src, join(dir, existing ?? `${day}_${id}.jsonl`));
} catch {
  // never block Claude Code
}
process.exit(0);

// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { z } from 'zod';

/**
 * The quiz as the backend hands it to the host in `registered_as_admin`: the raw `PlayGame`
 * JSON string from Redis (`classquiz/db/models.py`). Only the fields the host screen reads are
 * validated; the rest passes through for the question loop (PR 8).
 */
const gameQuizSchema = z
  .object({
    title: z.string(),
    // Used in a style attribute, so only a plain `#rrggbb` colour is accepted.
    background_color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .nullish()
      .catch(null),
    background_image: z.string().nullish().catch(null),
    questions: z.array(z.unknown()),
  })
  .passthrough();

export type GameQuiz = z.infer<typeof gameQuizSchema>;

/** Parses the `game` field of `registered_as_admin`. Returns null when it is missing or unreadable. */
export function parseGameQuiz(raw: string | null): GameQuiz | null {
  if (!raw) return null;
  try {
    const result = gameQuizSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of legacy `lib/play/title.svelte`: what a player sees after joining, until the host
// shows the first question. The host screen shows the same before its first question.
import { RichText } from '@/components/RichText';
import { mediaUrl } from '@/lib/media';
import { cn } from '@/lib/utils';
import type { PlayerGame } from './playerGame';

type Props = {
  game: Pick<PlayerGame, 'title' | 'description' | 'coverImage'>;
  /** The host screen has a control bar above, so it does not fill the whole viewport. */
  className?: string;
};

export function GameTitle({ game, className }: Props) {
  return (
    <div className={cn('flex min-h-dvh items-center justify-center px-4 py-10', className)}>
      <div className="flex w-full max-w-3xl flex-col items-center gap-6 rounded-xl border bg-card p-6 text-center text-card-foreground sm:p-10">
        <h1 className="text-balance break-words font-display font-semibold text-4xl sm:text-6xl">
          <RichText html={game.title} />
        </h1>
        {game.description ? (
          <p className="prose-measure text-balance text-xl sm:text-2xl">
            <RichText html={game.description} />
          </p>
        ) : null}
        {game.coverImage ? (
          <img
            src={mediaUrl(game.coverImage)}
            // Decorative: the title above says what the quiz is.
            alt=""
            className="max-h-[30vh] w-auto max-w-full rounded-lg object-contain"
          />
        ) : null}
      </div>
    </div>
  );
}

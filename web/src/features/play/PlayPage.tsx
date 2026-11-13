// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of the join and title branches of legacy `routes/play/+page.svelte`. The question
// screens, results and end screen follow in PR 9.
import { type CSSProperties, type ReactNode, useEffect } from 'react';
import { ComingSoon } from '@/components/ComingSoon';
import { useHideNavbar } from '@/stores/uiStore';
import { GameTitle } from './GameTitle';
import { JoinGame } from './JoinGame';
import { usePlayStore } from './playStore';
import { usePlayerGame } from './usePlayerGame';

export function PlayPage({ initialPin }: { initialPin: string }) {
  useHideNavbar();
  const { join } = usePlayerGame();
  const game = usePlayStore((s) => s.game);
  const questionIndex = usePlayStore((s) => s.questionIndex);
  const finished = usePlayStore((s) => s.finished);

  // A reload during the game would cost the seat until the rejoin, so ask first. Legacy asked
  // on the join form too, where there is nothing to lose.
  const inGame = game !== null && !finished;
  useEffect(() => {
    if (!inGame) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [inGame]);

  let content: ReactNode;
  if (game === null) {
    content = <JoinGame initialPin={initialPin} onJoin={join} />;
  } else if (questionIndex === null && !finished) {
    content = <GameTitle game={game} />;
  } else {
    // Question loop and end screen: PR 9.
    content = (
      <div className="px-4 py-10">
        <div className="mx-auto max-w-lg rounded-xl border bg-card text-card-foreground">
          <ComingSoon route="/play" />
        </div>
      </div>
    );
  }

  // Legacy paints the quiz's background colour behind every screen once joined.
  const background: CSSProperties = {};
  if (game?.backgroundColor) background.backgroundColor = game.backgroundColor;

  return (
    <div className="min-h-dvh" style={background}>
      {content}
    </div>
  );
}

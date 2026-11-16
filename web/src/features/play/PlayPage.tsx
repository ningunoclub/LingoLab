// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of legacy `routes/play/+page.svelte`: join, title, question loop and end screen.
import { type CSSProperties, type ReactNode, useEffect } from 'react';
import { FinalRanking } from '@/components/FinalRanking';
import { useHideNavbar } from '@/stores/uiStore';
import { GameTitle } from './GameTitle';
import { JoinGame } from './JoinGame';
import { PlayerQuestionScreen } from './PlayerQuestionScreen';
import { PlayerResults } from './PlayerResults';
import { usePlayStore } from './playStore';
import { usePlayerGame } from './usePlayerGame';

export function PlayPage({ initialPin }: { initialPin: string }) {
  useHideNavbar();
  const { join, submitAnswer } = usePlayerGame();
  const game = usePlayStore((s) => s.game);
  const username = usePlayStore((s) => s.username);
  const gameMode = usePlayStore((s) => s.gameMode);
  const questionIndex = usePlayStore((s) => s.questionIndex);
  const question = usePlayStore((s) => s.question);
  const timeLeft = usePlayStore((s) => s.timeLeft);
  const answered = usePlayStore((s) => s.answered);
  const results = usePlayStore((s) => s.results);
  const total = usePlayStore((s) => s.scores[s.username] ?? 0);
  const finished = usePlayStore((s) => s.finished);
  const finalScores = usePlayStore((s) => s.finalScores);

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
  } else if (finished) {
    content = (
      <div className="px-4 py-10">
        <div className="mx-auto flex max-w-3xl flex-col gap-8 rounded-xl border bg-card p-6 text-card-foreground sm:p-10">
          <FinalRanking scores={finalScores ?? {}} username={username} />
        </div>
      </div>
    );
  } else if (questionIndex === null || question === null) {
    // Before the first question, and while the host shows a slide (sent to the host only).
    content = <GameTitle game={game} />;
  } else if (results !== null) {
    content = <PlayerResults results={results} username={username} total={total} />;
  } else {
    content = (
      <PlayerQuestionScreen
        key={question.index}
        question={question}
        timeLeft={timeLeft}
        answered={answered}
        kahoot={gameMode === 'kahoot'}
        onSubmit={submitAnswer}
      />
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

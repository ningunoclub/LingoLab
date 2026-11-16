// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { beforeEach, describe, expect, it } from 'vitest';
import { usePlayStore } from './playStore';

const ABCD = { type: 'ABCD', time: '10', question: 'Q', answers: [{ answer: 'a' }] };
const answer = (username: string, score: number) => ({
  username,
  answer: 'a',
  right: score > 0,
  time_taken: 1000,
  score,
});

describe('playStore question loop', () => {
  beforeEach(() => {
    usePlayStore.getState().reset();
    usePlayStore.setState({ username: 'Leah' });
  });

  it('starts a question with its full time and no answer', () => {
    const s = usePlayStore.getState();
    s.answerSent();
    s.questionShown(0, ABCD);
    expect(usePlayStore.getState()).toMatchObject({
      questionIndex: 0,
      timeLeft: 10,
      answered: false,
      results: null,
    });
    usePlayStore.getState().tick();
    expect(usePlayStore.getState().timeLeft).toBe(9);
    usePlayStore.getState().timeUp();
    usePlayStore.getState().tick();
    expect(usePlayStore.getState().timeLeft).toBe(0);
  });

  it('adds each question’s points once, even if the results arrive twice', () => {
    const s = usePlayStore.getState();
    s.questionShown(0, ABCD);
    s.resultsReceived([answer('Leah', 800), answer('Tom', 0)]);
    s.resultsReceived([answer('Leah', 800), answer('Tom', 0)]);
    s.questionShown(1, ABCD);
    s.resultsReceived([answer('Leah', 500)]);
    expect(usePlayStore.getState().scores).toEqual({ Leah: 1300, Tom: 0 });
  });

  it('shows "no answers" when the server sends null', () => {
    usePlayStore.getState().questionShown(0, ABCD);
    usePlayStore.getState().resultsReceived(null);
    expect(usePlayStore.getState().results).toBe('none');
  });

  it('ranks the end screen by the server totals', () => {
    usePlayStore.getState().gameFinished({ '0': [answer('Leah', 700)], '1': [answer('Tom', 900)] });
    expect(usePlayStore.getState()).toMatchObject({
      finished: true,
      finalScores: { Leah: 700, Tom: 900 },
    });
  });
});

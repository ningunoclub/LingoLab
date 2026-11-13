// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from 'vitest';
import fixture from '../../../tests/fixtures/game-result.json';
import {
  answerBars,
  averageFinalScore,
  averageScore,
  correctAnswersPerPlayer,
  correctCount,
  displayAnswer,
  playersByScore,
} from './resultStats';
import { parseGameResult } from './resultsApi';

const result = parseGameResult(fixture);
const [abcd, check, voting, slide, order] = result.questions as [
  (typeof result.questions)[number],
  (typeof result.questions)[number],
  (typeof result.questions)[number],
  (typeof result.questions)[number],
  (typeof result.questions)[number],
];
const answersOf = (i: number) => result.answers[i] ?? [];

describe('averages', () => {
  it('averages the final scores', () => {
    expect(averageFinalScore(result.playerScores)).toBeCloseTo(2200 / 3);
  });

  it('is null instead of NaN when nobody played or answered', () => {
    expect(averageFinalScore({})).toBeNull();
    expect(averageScore([])).toBeNull();
  });

  it('averages the points of one question', () => {
    expect(averageScore(answersOf(0))).toBe(450);
    expect(correctCount(answersOf(0))).toBe(1);
  });
});

describe('players', () => {
  it('sorts by final score, best first', () => {
    expect(playersByScore(result.playerScores)).toEqual(['Anna', 'Ben', 'Cleo']);
  });

  it('counts right answers over all questions, 0 for players who never answered', () => {
    expect(correctAnswersPerPlayer(result.playerScores, result.answers)).toEqual({
      Anna: 2,
      Ben: 1,
      Cleo: 0,
    });
  });
});

describe('answerBars', () => {
  it('counts each answer by its text', () => {
    expect(answerBars(abcd, answersOf(0))).toEqual([
      { answer: 'went', right: true, count: 1 },
      { answer: 'goed', right: false, count: 1 },
    ]);
  });

  it('counts CHECK answers by the ticked indices', () => {
    expect(answerBars(check, answersOf(1)).map((bar) => bar.count)).toEqual([2, 0, 1]);
  });

  it('counts votes', () => {
    expect(answerBars(voting, answersOf(2)).map((bar) => bar.count)).toEqual([2, 0]);
  });

  it('has no chart for ORDER, RANGE and SLIDE, as legacy', () => {
    expect(answerBars(order, answersOf(4))).toEqual([]);
    expect(answerBars(slide, [])).toEqual([]);
  });
});

describe('displayAnswer', () => {
  it('turns CHECK indices into the answer texts', () => {
    expect(displayAnswer(check, '02')).toBe('saw, took');
  });

  it('keeps an index string it cannot map', () => {
    expect(displayAnswer(check, '7')).toBe('7');
  });

  it('leaves other types alone', () => {
    expect(displayAnswer(abcd, 'went')).toBe('went');
    expect(displayAnswer(order, 'I, went, home')).toBe('I, went, home');
  });
});

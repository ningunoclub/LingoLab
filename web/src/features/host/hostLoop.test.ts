// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from 'vitest';
import { type GameQuiz, parseGameQuiz } from './gameQuiz';
import {
  countVotes,
  type LoopState,
  nextHostAction,
  parseAnswers,
  ranking,
  totalScores,
} from './hostLoop';

function quiz(questions: object[]): GameQuiz {
  const parsed = parseGameQuiz(JSON.stringify({ title: 'Q', questions }));
  if (!parsed) throw new Error('fixture does not parse');
  return parsed;
}

const abcd = { question: 'a', time: '20', type: 'ABCD', answers: [] };
const slide = { question: '', time: '20', type: 'SLIDE', answers: '' };
const hidden = { ...abcd, hide_results: true };

const state = (patch: Partial<LoopState>): LoopState => ({
  questionIndex: 0,
  timeLeft: 10,
  questionResults: null,
  finished: false,
  ...patch,
});

describe('nextHostAction', () => {
  const two = quiz([abcd, abcd]);

  it('starts with the first question', () => {
    expect(nextHostAction(two, state({ questionIndex: -1, timeLeft: null }))).toEqual({
      kind: 'next',
      question: 0,
    });
  });

  it('stops the time while a question runs', () => {
    expect(nextHostAction(two, state({}))).toEqual({ kind: 'solutions' });
  });

  it('shows the results once the time is over', () => {
    expect(nextHostAction(two, state({ timeLeft: 0 }))).toEqual({ kind: 'results' });
  });

  it('moves on after the results', () => {
    expect(nextHostAction(two, state({ timeLeft: 0, questionResults: [] }))).toEqual({
      kind: 'next',
      question: 1,
    });
  });

  it('ends the game after the results of the last question', () => {
    expect(
      nextHostAction(two, state({ questionIndex: 1, timeLeft: 0, questionResults: [] })),
    ).toEqual({ kind: 'final' });
  });

  it('lets a slide be left at any time, the last one to the final results', () => {
    const q = quiz([slide, slide]);
    expect(nextHostAction(q, state({}))).toEqual({ kind: 'next', question: 1 });
    expect(nextHostAction(q, state({ questionIndex: 1 }))).toEqual({ kind: 'final' });
  });

  it('skips hidden results, also on the last question', () => {
    const q = quiz([hidden, hidden]);
    expect(nextHostAction(q, state({ timeLeft: 0 }))).toEqual({
      kind: 'skip_results',
      after: 'next',
    });
    expect(nextHostAction(q, state({ questionIndex: 1, timeLeft: 0 }))).toEqual({
      kind: 'skip_results',
      after: 'final',
    });
  });

  it('offers nothing once the game is over', () => {
    expect(nextHostAction(two, state({ finished: true }))).toBeNull();
  });
});

describe('scores', () => {
  const a = (username: string, score: number, answer = 'x') => ({
    username,
    answer,
    right: score > 0,
    time_taken: 1000,
    score,
  });

  it('drops malformed answers', () => {
    expect(parseAnswers([a('Mia', 900), { nope: 1 }, null])).toEqual([a('Mia', 900)]);
    expect(parseAnswers('nope')).toEqual([]);
  });

  it('adds up the final results per player', () => {
    const totals = totalScores({ '0': [a('Mia', 900), a('Leo', 0)], '2': [a('Leo', 700)] });
    expect(totals).toEqual({ Mia: 900, Leo: 700 });
    expect(ranking(totals)).toEqual(['Mia', 'Leo']);
  });

  it('counts the votes per option', () => {
    expect(
      countVotes(['red', 'blue'], [a('A', 0, 'red'), a('B', 0, 'red'), a('C', 0, 'x')]),
    ).toEqual([2, 0]);
  });
});

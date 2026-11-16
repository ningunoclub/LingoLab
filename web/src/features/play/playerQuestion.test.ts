// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { describe, expect, it } from 'vitest';
import { checkAnswer, moveChoice, parsePlayerQuestion, rangeStart } from './playerQuestion';

describe('parsePlayerQuestion', () => {
  it('reads an ABCD question as the backend sends it', () => {
    const q = parsePlayerQuestion(2, {
      question: '<b>went</b> is the past of …',
      time: '20',
      type: 'ABCD',
      image: null,
      answers: [
        { answer: 'go', color: '#E69F00' },
        { answer: 'gone', color: 'red; background: url(x)' },
      ],
    });
    expect(q).toEqual({
      index: 2,
      question: '<b>went</b> is the past of …',
      type: 'ABCD',
      seconds: 20,
      image: null,
      choices: [
        { id: 0, answer: 'go', color: '#E69F00' },
        { id: 1, answer: 'gone', color: null },
      ],
      range: null,
    });
  });

  it('treats a missing type as ABCD, as legacy did', () => {
    expect(parsePlayerQuestion(0, { question: 'x', time: 10, answers: [] })?.type).toBe('ABCD');
  });

  it('reads the span of a RANGE question', () => {
    const q = parsePlayerQuestion(0, { type: 'RANGE', time: '30', answers: { min: 1, max: 10 } });
    expect(q?.range).toEqual({ min: 1, max: 10 });
    expect(q?.choices).toEqual([]);
  });

  it('never keeps the accepted answers of a TEXT question', () => {
    const q = parsePlayerQuestion(0, {
      type: 'TEXT',
      time: '30',
      answers: [{ answer: 'went', color: null }],
    });
    expect(q?.choices).toEqual([]);
  });

  it('returns null for slides and for anything unreadable', () => {
    expect(parsePlayerQuestion(0, { type: 'SLIDE', answers: '{}' })).toBeNull();
    expect(parsePlayerQuestion(0, undefined)).toBeNull();
  });
});

describe('helpers', () => {
  it('starts the slider in the middle, rounded', () => {
    expect(rangeStart({ min: 0, max: 5 })).toBe(3);
    expect(rangeStart({ min: 10, max: 20 })).toBe(15);
  });

  it('builds a CHECK answer from the chosen indices', () => {
    expect(checkAnswer([true, false, true, false])).toBe('02');
    expect(checkAnswer([false, false])).toBe('');
  });

  it('swaps ORDER neighbours and ignores moves off the list', () => {
    expect(moveChoice(['a', 'b', 'c'], 1, 0)).toEqual(['b', 'a', 'c']);
    expect(moveChoice(['a', 'b', 'c'], 2, 3)).toEqual(['a', 'b', 'c']);
  });
});

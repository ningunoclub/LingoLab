// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { PlayerQuestionScreen } from './PlayerQuestionScreen';
import { parsePlayerQuestion } from './playerQuestion';

function question(data: Record<string, unknown>) {
  const q = parsePlayerQuestion(0, { question: 'Pick', time: '20', ...data });
  if (!q) throw new Error('unreadable question');
  return q;
}

// The Radix slider measures its thumb; jsdom has no ResizeObserver.
globalThis.ResizeObserver ??= class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const choices = [{ answer: 'went' }, { answer: 'goed' }, { answer: 'gone' }, { answer: 'go' }];

describe('PlayerQuestionScreen', () => {
  it('sends the tapped ABCD answer and locks the tiles', async () => {
    const onSubmit = vi.fn();
    const q = question({ type: 'ABCD', answers: choices });
    const { rerender } = render(
      <PlayerQuestionScreen
        question={q}
        timeLeft={20}
        answered={false}
        kahoot={false}
        onSubmit={onSubmit}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'went' }));
    expect(onSubmit).toHaveBeenCalledWith({ answer: 'went' });

    rerender(
      <PlayerQuestionScreen
        question={q}
        timeLeft={19}
        answered
        kahoot={false}
        onSubmit={onSubmit}
      />,
    );
    expect(screen.getByRole('button', { name: 'goed' })).toBeDisabled();
    expect(screen.getByText(/Your answer is in/)).toBeInTheDocument();
  });

  it('hides the question text in kahoot mode but keeps the tiles named', () => {
    render(
      <PlayerQuestionScreen
        question={question({ type: 'ABCD', answers: choices })}
        timeLeft={20}
        answered={false}
        kahoot
        onSubmit={vi.fn()}
      />,
    );
    expect(screen.queryByRole('heading', { name: 'Pick' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'gone' })).not.toHaveTextContent('gone');
  });

  it('sends the chosen CHECK indices', async () => {
    const onSubmit = vi.fn();
    render(
      <PlayerQuestionScreen
        question={question({ type: 'CHECK', answers: choices })}
        timeLeft={20}
        answered={false}
        kahoot={false}
        onSubmit={onSubmit}
      />,
    );
    const submit = screen.getByRole('button', { name: 'Submit' });
    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'went' }));
    await userEvent.click(screen.getByRole('button', { name: 'gone' }));
    expect(screen.getByRole('button', { name: 'gone' })).toHaveAttribute('aria-pressed', 'true');
    await userEvent.click(submit);
    expect(onSubmit).toHaveBeenCalledWith({ answer: '02' });
  });

  it('sends the rearranged ORDER list', async () => {
    const onSubmit = vi.fn();
    render(
      <PlayerQuestionScreen
        question={question({ type: 'ORDER', answers: choices.slice(0, 3) })}
        timeLeft={20}
        answered={false}
        kahoot={false}
        onSubmit={onSubmit}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'goed: Move up' }));
    await userEvent.click(screen.getByRole('button', { name: 'Submit' }));
    expect(onSubmit).toHaveBeenCalledWith({
      answer: 'a',
      complexAnswer: [{ answer: 'goed' }, { answer: 'went' }, { answer: 'gone' }],
    });
  });

  it('sends a TEXT answer on Enter', async () => {
    const onSubmit = vi.fn();
    render(
      <PlayerQuestionScreen
        question={question({ type: 'TEXT', answers: [{ answer: 'secret' }] })}
        timeLeft={20}
        answered={false}
        kahoot={false}
        onSubmit={onSubmit}
      />,
    );
    await userEvent.type(screen.getByLabelText('Enter your answer'), 'went{Enter}');
    expect(onSubmit).toHaveBeenCalledWith({ answer: 'went' });
  });

  it('sends the RANGE slider value when the time runs out unanswered', () => {
    const onSubmit = vi.fn();
    const q = question({ type: 'RANGE', answers: { min: 0, max: 10 } });
    const { rerender } = render(
      <PlayerQuestionScreen
        question={q}
        timeLeft={1}
        answered={false}
        kahoot={false}
        onSubmit={onSubmit}
      />,
    );
    expect(onSubmit).not.toHaveBeenCalled();
    rerender(
      <PlayerQuestionScreen
        question={q}
        timeLeft={0}
        answered={false}
        kahoot={false}
        onSubmit={onSubmit}
      />,
    );
    expect(onSubmit).toHaveBeenCalledWith({ answer: '5' });
    expect(screen.getByRole('status')).toHaveTextContent('Time is up');
  });
});

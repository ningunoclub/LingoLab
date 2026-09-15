// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ANSWER_SLOTS, AnswerTile } from './AnswerTile';

describe('AnswerTile', () => {
  it('renders its label', () => {
    render(<AnswerTile answerSlot={1} label="Paris" />);
    expect(screen.getByRole('button', { name: /paris/i })).toBeInTheDocument();
  });

  it('pairs every slot with a distinct shape, so colour is never the only signal', () => {
    const shapes = new Set(ANSWER_SLOTS.map((s) => s.name));
    expect(shapes.size).toBe(ANSWER_SLOTS.length);
  });

  it('gives each slot its own colour token', () => {
    const colours = new Set(ANSWER_SLOTS.map((s) => s.bg));
    expect(colours.size).toBe(ANSWER_SLOTS.length);
  });

  it('renders a decorative icon that screen readers skip', () => {
    const { container } = render(<AnswerTile answerSlot={3} label="Berlin" />);
    const icon = container.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });

  it('calls onClick when pressed', async () => {
    const onClick = vi.fn();
    render(<AnswerTile answerSlot={2} label="Rome" onClick={onClick} />);
    await userEvent.click(screen.getByRole('button', { name: /rome/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not fire when disabled', async () => {
    const onClick = vi.fn();
    render(<AnswerTile answerSlot={2} label="Rome" onClick={onClick} disabled />);
    await userEvent.click(screen.getByRole('button', { name: /rome/i }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

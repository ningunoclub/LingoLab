// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import '@/i18n';
import { HostLobby } from './HostLobby';

function renderLobby(players: { username: string; sid: string }[], canStart = players.length > 0) {
  const onStart = vi.fn();
  const onKick = vi.fn();
  render(
    <HostLobby
      gamePin="482913"
      players={players}
      canStart={canStart}
      onStart={onStart}
      onKick={onKick}
    />,
  );
  return { onStart, onKick, user: userEvent.setup() };
}

describe('HostLobby', () => {
  it('shows the PIN, the join address and the QR code', () => {
    renderLobby([]);
    expect(screen.getByTestId('game-pin')).toHaveTextContent('482913');
    expect(screen.getByText(/\/play and enter 482913/)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'QR code to join the game' })).toHaveAttribute(
      'src',
      '/api/v1/utils/qr/482913',
    );
  });

  it('keeps Start disabled until someone joins (singular wording for 0, as legacy)', () => {
    renderLobby([]);
    expect(screen.getByText('0 player are waiting')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Start game' })).toBeDisabled();
  });

  it('starts the game and kicks a player by clicking the name', async () => {
    const { onStart, onKick, user } = renderLobby([
      { username: 'Mia', sid: 'a' },
      { username: 'Leo', sid: 'b' },
    ]);
    expect(screen.getByText('2 players are waiting')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Start game' }));
    expect(onStart).toHaveBeenCalledOnce();
    await user.click(screen.getByRole('button', { name: 'Remove Leo from the game' }));
    expect(onKick).toHaveBeenCalledWith('Leo');
  });
});

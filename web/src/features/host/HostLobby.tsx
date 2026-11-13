// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of legacy `lib/play/admin/game_not_started.svelte`.
import { Play, UserRound, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import type { PlayerIdentity } from '@/realtime/events';
import { QrCodeButton } from './QrCodeButton';

type Props = {
  gamePin: string;
  players: PlayerIdentity[];
  canStart: boolean;
  onStart: () => void;
  onKick: (username: string) => void;
};

export function HostLobby({ gamePin, players, canStart, onStart, onKick }: Props) {
  const { t } = useTranslation();
  const joinUrl = `${window.location.host}/play`;
  // Legacy picks the singular key for 0 and 1 players.
  const waitingKey =
    players.length <= 1 ? 'play_page.players_waiting' : 'play_page.players_waiting_plural';

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-8 sm:py-10">
      <section className="grid items-center gap-6 rounded-xl border bg-card p-6 text-card-foreground sm:p-10 lg:grid-cols-[1fr_auto]">
        <div className="flex min-w-0 flex-col gap-4">
          <p className="font-display text-xl sm:text-3xl">
            {t('play_page.join_description', { url: joinUrl, pin: gamePin })}
          </p>
          <p className="flex flex-col gap-1">
            <span className="font-medium text-lg text-muted-foreground uppercase tracking-wide sm:text-2xl">
              {t('words.pin')}
            </span>
            <span
              data-testid="game-pin"
              className="select-all font-display font-semibold text-6xl tabular-nums leading-none tracking-wider sm:text-8xl lg:text-9xl"
            >
              {gamePin}
            </span>
          </p>
        </div>
        <QrCodeButton gamePin={gamePin} />
      </section>

      <section
        aria-labelledby="lobby-players"
        className="flex flex-col gap-4 rounded-xl border bg-card p-6 text-card-foreground sm:p-8"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1">
            <h2 id="lobby-players" className="font-display font-semibold text-2xl sm:text-4xl">
              <span aria-live="polite">{t(waitingKey, { count: players.length })}</span>
            </h2>
            {players.length > 0 ? (
              <p className="text-muted-foreground">{t('admin_page.lobby.kick_hint')}</p>
            ) : null}
          </div>
          <Button size="lg" className="h-14 px-8 text-xl" disabled={!canStart} onClick={onStart}>
            <Play aria-hidden="true" className="size-6" />
            {t('admin_page.start_game')}
          </Button>
        </div>

        {players.length > 0 ? (
          <ul className="flex flex-wrap gap-3">
            {players.map((player) => (
              <li key={player.sid}>
                <button
                  type="button"
                  onClick={() => onKick(player.username)}
                  aria-label={t('admin_page.lobby.kick_player', { username: player.username })}
                  className="group inline-flex min-h-11 items-center gap-2 rounded-full border-2 border-primary/40 bg-background px-4 py-2 font-display text-lg transition-colors hover:border-destructive hover:text-destructive focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 sm:text-xl"
                >
                  <UserRound aria-hidden="true" className="size-5 group-hover:hidden" />
                  <X aria-hidden="true" className="hidden size-5 group-hover:block" />
                  <span className="group-hover:line-through">{player.username}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

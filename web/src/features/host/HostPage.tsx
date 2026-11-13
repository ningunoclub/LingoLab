// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of the lobby half of legacy `routes/admin/+page.svelte`. The question loop, final
// results, export and "save results" follow in PR 8.
import { Link } from '@tanstack/react-router';
import { CircleAlert, LoaderCircle } from 'lucide-react';
import { type CSSProperties, type ReactNode, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ComingSoon } from '@/components/ComingSoon';
import { Button } from '@/components/ui/button';
import { mediaUrl } from '@/lib/media';
import { useHideNavbar } from '@/stores/uiStore';
import { HostLobby } from './HostLobby';
import { canStartGame, useHostStore } from './hostStore';
import { useHostGame } from './useHostGame';

type Props = {
  gamePin: string;
  gameId: string;
  /** Legacy `auto_connect`: `token`, `pin` and `connect` are all in the URL. */
  autoConnect: boolean;
};

export function HostPage({ gamePin, gameId, autoConnect }: Props) {
  useHideNavbar();
  const controls = useHostGame(gamePin, gameId, autoConnect);
  const status = useHostStore((s) => s.status);
  const error = useHostStore((s) => s.error);
  const quiz = useHostStore((s) => s.quiz);
  const players = useHostStore((s) => s.players);
  const canStart = useHostStore(canStartGame);

  // Legacy warns before every unload of the host screen; a reload drops the host role.
  const connected = autoConnect && (status === 'lobby' || status === 'started');
  useEffect(() => {
    if (!connected) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [connected]);

  // The quiz's own background frames the screen. Legacy passed the stored image id straight
  // to `url()`, which never loads; it is resolved through the storage endpoint here.
  const background: CSSProperties = {};
  if (quiz?.background_color) background.backgroundColor = quiz.background_color;
  if (quiz?.background_image) {
    background.backgroundImage = `url("${mediaUrl(quiz.background_image)}")`;
    background.backgroundSize = '100% 100%';
    background.backgroundRepeat = 'no-repeat';
  }

  let content: ReactNode;
  if (!autoConnect) {
    content = (
      <Notice titleKey="admin_page.lobby.no_game_title" bodyKey="admin_page.lobby.no_game_body" />
    );
  } else if (status === 'error') {
    content = (
      <Notice
        titleKey="words.error"
        bodyKey={
          error === 'already_registered'
            ? 'admin_page.already_registered_as_admin'
            : 'admin_page.lobby.invalid_game'
        }
        alert
      />
    );
  } else if (status === 'connecting') {
    content = <Connecting />;
  } else if (status === 'lobby') {
    content = (
      <HostLobby
        gamePin={gamePin}
        players={players}
        canStart={canStart}
        onStart={controls.startGame}
        onKick={controls.kickPlayer}
      />
    );
  } else {
    // Question loop: PR 8.
    content = (
      <div className="px-4 py-10">
        <div className="mx-auto max-w-lg rounded-xl border bg-card text-card-foreground">
          <ComingSoon route="/admin" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh" style={background}>
      {content}
    </div>
  );
}

type NoticeProps = { titleKey: string; bodyKey: string; alert?: boolean };

function Notice({ titleKey, bodyKey, alert = false }: NoticeProps) {
  const { t } = useTranslation();
  return (
    <div className="px-4 py-16 sm:py-24">
      <div
        role={alert ? 'alert' : undefined}
        className="mx-auto flex max-w-lg flex-col items-center gap-4 rounded-xl border bg-card p-8 text-center text-card-foreground"
      >
        {alert ? <CircleAlert aria-hidden="true" className="size-10 text-destructive" /> : null}
        <h1 className="font-display font-semibold text-2xl">{t(titleKey)}</h1>
        <p className="prose-measure text-muted-foreground">{t(bodyKey)}</p>
        <Button asChild variant="secondary">
          <Link to="/dashboard">{t('words.dashboard')}</Link>
        </Button>
      </div>
    </div>
  );
}

function Connecting() {
  const { t } = useTranslation();
  return (
    <div className="flex justify-center px-4 py-24">
      <p
        role="status"
        className="flex items-center gap-3 rounded-xl border bg-card px-6 py-4 font-display text-card-foreground text-xl"
      >
        <LoaderCircle
          aria-hidden="true"
          className="size-6 animate-spin motion-reduce:animate-none"
        />
        {t('admin_page.lobby.connecting')}
      </p>
    </div>
  );
}

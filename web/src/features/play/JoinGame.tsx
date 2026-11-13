// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of legacy `lib/play/join.svelte`: first the PIN, then the name (and the teacher's
// extra field, if the game has one). No captcha script is ever loaded (privacy rules).
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CircleAlert, LoaderCircle } from 'lucide-react';
import { type FormEvent, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { settingsQueries } from '@/features/settings/settingsApi';
import { checkGame, type GameCheck } from './checkGame';
import { type JoinNotice, usePlayStore } from './playStore';
import type { JoinRequest } from './usePlayerGame';

const PIN_LENGTH = 6;
/** Legacy: the submit button stays disabled while `username.length <= 3`. */
export const USERNAME_MIN = 4;
const USERNAME_MAX = 17;

type Props = {
  initialPin: string;
  onJoin: (request: JoinRequest) => void;
};

type OkCheck = Extract<GameCheck, { status: 'ok' }>;

export function JoinGame({ initialPin, onJoin }: Props) {
  const notice = usePlayStore((s) => s.notice);
  const setNotice = usePlayStore((s) => s.setNotice);
  const setGameMode = usePlayStore((s) => s.setGameMode);

  const [pin, setPin] = useState(() => initialPin.replace(/\D/g, '').slice(0, PIN_LENGTH));
  const [checking, setChecking] = useState(false);
  const [game, setGame] = useState<OkCheck | null>(null);

  // Check the PIN as soon as all six digits are there (legacy: `game_pin.length > 5`).
  const checkedPin = useRef<string | null>(null);
  useEffect(() => {
    if (pin.length !== PIN_LENGTH || checkedPin.current === pin) return;
    checkedPin.current = pin;
    let current = true;
    setChecking(true);
    void checkGame(pin).then((check) => {
      if (!current) return;
      setChecking(false);
      if (check.status === 'ok') {
        setGameMode(check.gameMode);
        setGame(check);
        return;
      }
      checkedPin.current = null;
      setNotice(check.status === 'not_found' ? 'game_not_found' : 'error');
      if (check.status === 'not_found') setPin('');
    });
    return () => {
      current = false;
      // StrictMode re-runs the effect: let the second run check again.
      if (checkedPin.current === pin) checkedPin.current = null;
    };
  }, [pin, setGameMode, setNotice]);

  // A wrong PIN found by the socket, or a kick, sends the player back to an empty PIN field.
  useEffect(() => {
    if (notice === 'game_not_found' || notice === 'kicked') {
      setGame(null);
      setPin('');
    }
  }, [notice]);

  const back = () => {
    setGame(null);
    setPin('');
    setNotice(null);
  };

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="flex w-full max-w-sm flex-col gap-6 rounded-xl border bg-card p-6 text-card-foreground sm:p-8">
        {game === null ? (
          <PinForm
            pin={pin}
            onPinChange={(next) => {
              setPin(next);
              // The message was about the previous PIN.
              if (notice !== null) setNotice(null);
            }}
            checking={checking}
            notice={notice}
          />
        ) : game.captcha ? (
          <CaptchaGame onBack={back} />
        ) : (
          <NameForm
            customField={game.customField}
            notice={notice}
            onSubmit={(username, customField) => onJoin({ gamePin: pin, username, customField })}
          />
        )}
      </div>
    </div>
  );
}

function NoticeMessage({ notice }: { notice: JoinNotice | null }) {
  const { t } = useTranslation();
  if (notice === null) return null;
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-base"
    >
      <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-destructive" />
      {t(`play_page.join.${notice}`)}
    </p>
  );
}

type PinFormProps = {
  pin: string;
  onPinChange: (pin: string) => void;
  checking: boolean;
  notice: JoinNotice | null;
};

function PinForm({ pin, onPinChange, checking, notice }: PinFormProps) {
  const { t } = useTranslation();
  const id = useId();
  // The check starts by itself at six digits; the button is there for keyboards and clarity.
  const submit = (event: FormEvent) => event.preventDefault();

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <Label htmlFor={id} className="justify-center font-display font-semibold text-2xl">
        {t('words.game_pin')}
      </Label>
      <Input
        id={id}
        value={pin}
        onChange={(e) => onPinChange(e.target.value.replace(/\D/g, '').slice(0, PIN_LENGTH))}
        inputMode="numeric"
        autoComplete="off"
        maxLength={PIN_LENGTH}
        autoFocus
        className="h-16 text-center font-display text-4xl tabular-nums tracking-[0.3em] md:text-4xl"
      />
      <NoticeMessage notice={notice} />
      <Button
        type="submit"
        size="lg"
        className="h-12 text-lg"
        disabled={pin.length < PIN_LENGTH || checking}
      >
        {checking ? (
          <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
        ) : null}
        {t('words.submit')}
      </Button>
    </form>
  );
}

type NameFormProps = {
  customField: string | null;
  notice: JoinNotice | null;
  onSubmit: (username: string, customField: string | null) => void;
};

function NameForm({ customField, notice, onSubmit }: NameFormProps) {
  const { t } = useTranslation();
  const nameId = useId();
  const fieldId = useId();
  const hintId = useId();
  const [username, setUsername] = useState('');
  const [fieldValue, setFieldValue] = useState('');

  // Legacy pre-fills the account's username when a teacher (or anyone signed in) plays.
  const me = useQuery({
    ...settingsQueries.user,
    retry: false,
    staleTime: Number.POSITIVE_INFINITY,
  });
  const prefilled = useRef(false);
  useEffect(() => {
    if (prefilled.current || !me.data?.username) return;
    prefilled.current = true;
    setUsername((current) => current || me.data.username.slice(0, USERNAME_MAX));
  }, [me.data]);

  const valid = username.length >= USERNAME_MIN;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    onSubmit(username, customField ? fieldValue : null);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={nameId} className="justify-center font-display font-semibold text-2xl">
          {t('words.username')}
        </Label>
        <Input
          id={nameId}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          maxLength={USERNAME_MAX}
          autoComplete="nickname"
          aria-describedby={hintId}
          autoFocus
          className="h-14 text-center font-display text-2xl md:text-2xl"
        />
        <p id={hintId} className="text-center text-muted-foreground text-sm">
          {t('play_page.join.username_hint', { min: USERNAME_MIN })}
        </p>
      </div>
      {customField ? (
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId} className="justify-center font-display font-semibold text-xl">
            {customField}
          </Label>
          <Input
            id={fieldId}
            value={fieldValue}
            onChange={(e) => setFieldValue(e.target.value)}
            className="h-14 text-center text-xl md:text-xl"
          />
        </div>
      ) : null}
      <NoticeMessage notice={notice} />
      <Button type="submit" size="lg" className="h-12 text-lg" disabled={!valid}>
        {t('words.submit')}
      </Button>
    </form>
  );
}

function CaptchaGame({ onBack }: { onBack: () => void }) {
  const { t } = useTranslation();
  return (
    <div role="alert" className="flex flex-col items-center gap-4 text-center">
      <CircleAlert aria-hidden="true" className="size-10 text-destructive" />
      <p className="text-lg">{t('play_page.join.captcha_game')}</p>
      <Button type="button" variant="secondary" onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        {t('play_page.join.other_pin')}
      </Button>
    </div>
  );
}

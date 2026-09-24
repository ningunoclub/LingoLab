// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Switch } from '@/components/ui/switch';
import type { DashboardItem } from './dashboardApi';
import {
  type GameMode,
  loadCustomField,
  NotSignedInError,
  type StartGameOptions,
  saveCustomField,
  startGame,
} from './startGameApi';

const MODES: { value: GameMode; titleKey: string; descriptionKey: string }[] = [
  {
    value: 'kahoot',
    titleKey: 'words.normal',
    descriptionKey: 'start_game.normal_mode_description',
  },
  {
    value: 'normal',
    titleKey: 'start_game.old_school_mode',
    descriptionKey: 'start_game.old_school_mode_description',
  },
];

/** The form. Mounted only while the dialog is open, so each opening starts fresh. */
function StartGameForm({ quiz }: { quiz: DashboardItem }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const id = useId();
  const [gameMode, setGameMode] = useState<GameMode>('kahoot');
  const [customField, setCustomField] = useState(loadCustomField);
  const [randomizeAnswers, setRandomizeAnswers] = useState(false);

  const start = useMutation({
    mutationFn: (options: StartGameOptions) => startGame(quiz.id, options),
    // Numbers, so the URL reads `pin=482913&connect=1` as in legacy (see routes/admin.tsx).
    onSuccess: (game) =>
      navigate({
        to: '/admin',
        search: { token: game.gameId, pin: Number(game.gamePin), connect: 1 },
      }),
    onError: (error) => {
      // Legacy sends the teacher to the login page after *any* failure. Only an expired
      // session is a reason to; everything else is reported here.
      if (error instanceof NotSignedInError) {
        navigate({ to: '/account/login', search: { returnTo: '/dashboard' } });
      }
    },
  });

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        saveCustomField(customField);
        start.mutate({ gameMode, customField, randomizeAnswers });
      }}
    >
      <fieldset className="flex flex-col gap-2">
        <legend id={`${id}-mode`} className="mb-2 text-sm font-medium">
          {t('start_game.game_mode')}
        </legend>
        {/* Radix renders its own role="radiogroup", which the fieldset legend doesn't name. */}
        <RadioGroup
          aria-labelledby={`${id}-mode`}
          value={gameMode}
          onValueChange={(value) => setGameMode(value as GameMode)}
          className="grid gap-3 sm:grid-cols-2"
        >
          {MODES.map((mode) => (
            <Label
              key={mode.value}
              htmlFor={`${id}-${mode.value}`}
              className="flex cursor-pointer items-start gap-3 rounded-xl border p-4 font-normal has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary/5"
            >
              <RadioGroupItem id={`${id}-${mode.value}`} value={mode.value} className="mt-1" />
              <span className="flex flex-col gap-1">
                <span className="font-display text-base font-semibold">{t(mode.titleKey)}</span>
                <span className="text-sm text-muted-foreground">{t(mode.descriptionKey)}</span>
              </span>
            </Label>
          ))}
        </RadioGroup>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor={`${id}-custom-field`}>{t('result_page.custom_field')}</Label>
        <Input
          id={`${id}-custom-field`}
          name="custom_field"
          value={customField}
          onChange={(event) => setCustomField(event.target.value)}
          placeholder={t('start_game.custom_field_placeholder')}
          className="h-11"
        />
      </div>

      <div className="flex items-center justify-between gap-4">
        <Label htmlFor={`${id}-randomize`}>{t('start_game.randomize_answers')}</Label>
        <Switch
          id={`${id}-randomize`}
          checked={randomizeAnswers}
          onCheckedChange={setRandomizeAnswers}
        />
      </div>

      {start.isError && !(start.error instanceof NotSignedInError) ? (
        <p className="text-sm text-destructive" role="alert">
          {t('start_game.errors.start_failed')}
        </p>
      ) : null}

      <DialogFooter>
        <Button type="submit" className="h-11 w-full sm:w-auto" disabled={start.isPending}>
          {start.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {t('start_game.start_game')}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Port of legacy `lib/dashboard/start_game.svelte`, without the captcha and controller toggles. */
export function StartGameDialog({
  quiz,
  onClose,
}: {
  quiz: DashboardItem | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={quiz !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{t('start_game.start_game')}</DialogTitle>
          <DialogDescription>{quiz?.title}</DialogDescription>
        </DialogHeader>
        {quiz ? <StartGameForm quiz={quiz} /> : null}
      </DialogContent>
    </Dialog>
  );
}

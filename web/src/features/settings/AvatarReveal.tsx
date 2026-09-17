// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { Link } from '@tanstack/react-router';
import { Check, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { cn } from '@/lib/utils';
import { AvatarImage } from './AvatarImage';
import { type AvatarChoices, avatarImageUrl } from './avatarApi';
import type { SaveState } from './useAvatarWizard';

/** Legacy: the avatar flies in over 4s and the controls fade in at 3.5s. */
const CONTROLS_DELAY_MS = 3500;

type Props = {
  choices: AvatarChoices;
  saveState: SaveState;
  onSave: () => void;
  onStartOver: () => void;
  onClose: () => void;
};

/**
 * The "That's You!" overlay: the finished avatar, then the four actions.
 *
 * Legacy hides the controls behind an unconditional 3.5s delay. That is kept as the
 * default flourish but skipped entirely under `prefers-reduced-motion`, where the
 * overlay renders in its final state at once.
 */
export function AvatarReveal({ choices, saveState, onSave, onStartOver, onClose }: Props) {
  const { t } = useTranslation();
  const reducedMotion = useReducedMotion();
  const [controlsVisible, setControlsVisible] = useState(reducedMotion);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (reducedMotion) {
      setControlsVisible(true);
      return;
    }
    const timer = setTimeout(() => setControlsVisible(true), CONTROLS_DELAY_MS);
    return () => clearTimeout(timer);
  }, [reducedMotion]);

  // Escape closes the overlay. Legacy offers only the Close button; the key is free.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  useEffect(() => {
    if (controlsVisible) closeRef.current?.focus();
  }, [controlsVisible]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('avatar_settings.thats_you')}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 overflow-y-auto bg-background/95 p-6 backdrop-blur-sm"
    >
      <h2
        className={cn(
          'font-display text-3xl font-semibold sm:text-4xl',
          'transition-opacity duration-300',
          controlsVisible ? 'opacity-100' : 'opacity-0',
        )}
      >
        {t('avatar_settings.thats_you')}
      </h2>

      <AvatarImage
        src={avatarImageUrl(choices)}
        alt={t('avatar_settings.thats_you')}
        // tw-animate-css; the global reduced-motion rule in index.css flattens the
        // duration, and `reducedMotion` drops the class altogether.
        className={cn(
          'h-48 w-48 sm:h-64 sm:w-64',
          !reducedMotion && 'animate-in zoom-in-50 slide-in-from-top-24 duration-700',
        )}
      />

      <div
        className={cn(
          'grid w-full max-w-md grid-cols-1 gap-3 sm:grid-cols-2',
          'transition-opacity duration-300',
          controlsVisible ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <Button type="button" variant="secondary" onClick={onStartOver}>
          {t('avatar_settings.start_over')}
        </Button>

        <Button
          type="button"
          onClick={onSave}
          disabled={saveState === 'saving' || saveState === 'saved'}
        >
          {saveState === 'saving' ? (
            <>
              <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
              {t('words.save')}
            </>
          ) : saveState === 'saved' ? (
            <>
              <Check aria-hidden="true" className="h-4 w-4" />
              {t('avatar_settings.saved')}
            </>
          ) : (
            t('words.save')
          )}
        </Button>

        <Button asChild variant="secondary">
          <Link to="/account/settings">{t('avatar_settings.go_back')}</Link>
        </Button>

        <Button ref={closeRef} type="button" variant="ghost" onClick={onClose}>
          {t('words.close')}
        </Button>
      </div>

      {/* Legacy leaves a failed save on the spinner forever, with nothing said. */}
      <p
        role="status"
        aria-live="polite"
        className={cn('text-sm', saveState === 'error' ? 'text-destructive' : 'sr-only')}
      >
        {saveState === 'error'
          ? t('avatar_settings.save_failed')
          : saveState === 'saved'
            ? t('avatar_settings.saved')
            : ''}
      </p>
    </div>
  );
}

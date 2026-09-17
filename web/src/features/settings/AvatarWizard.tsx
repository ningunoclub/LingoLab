// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { AvatarImage } from './AvatarImage';
import { AvatarOptionTile } from './AvatarOptionTile';
import { AvatarReveal } from './AvatarReveal';
import { avatarImageUrl, avatarOptionUrl } from './avatarApi';
import { useAvatarWizard } from './useAvatarWizard';

export function AvatarWizard() {
  const { t } = useTranslation();
  const wizard = useAvatarWizard();
  const featureLabel = t(`avatar_settings.${wizard.feature}`);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <h1 className="font-display text-3xl font-semibold">{t('avatar_settings.title')}</h1>

      <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
        {/*
          Legacy pins the preview into a fixed `grid-cols-6` column, which collapses to
          roughly 65px at phone width. Here it sits above the grid on small screens and
          sticks to the side from `sm` up.
        */}
        <div className="sm:sticky sm:top-6 sm:self-start">
          <AvatarImage
            src={avatarImageUrl(wizard.choices)}
            alt={t('avatar_settings.preview_alt')}
            className="mx-auto h-32 w-32 rounded-[--radius] border bg-card p-2 sm:h-44 sm:w-44"
          />
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={wizard.back}
              disabled={wizard.isFirstStep}
            >
              <ArrowLeft aria-hidden="true" className="h-4 w-4" />
              {t('words.back')}
            </Button>

            <div className="flex min-w-0 flex-1 flex-col items-center text-center">
              <h2 className="truncate font-display text-lg font-semibold">{featureLabel}</h2>
              <p className="text-xs text-muted-foreground tabular-nums">
                {t('avatar_settings.step_counter', {
                  current: wizard.stepIndex + 1,
                  total: wizard.stepCount,
                })}
              </p>
            </div>

            {/*
              Legacy's "Finish" is enabled on the last step but has no handler at all.
              Wired up here to open the reveal, which is what the label implies.
            */}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={wizard.finish}
              disabled={!wizard.isLastStep}
            >
              {t('words.finish')}
              <ArrowRight aria-hidden="true" className="h-4 w-4" />
            </Button>
          </div>

          {/*
            Progress is conveyed by the step counter above as well, never by the bar
            alone. A native <progress> carries the semantics; the appearance resets are
            needed because browsers style it very differently.
          */}
          <progress
            className="h-1.5 w-full overflow-hidden rounded-full bg-muted [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-muted [&::-webkit-progress-value]:bg-primary [&::-webkit-progress-value]:transition-[width] [appearance:none]"
            value={wizard.stepIndex + 1}
            max={wizard.stepCount}
            aria-label={featureLabel}
          />

          {/* A fieldset groups the options for screen readers; the legend names the feature. */}
          <fieldset className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            <legend className="sr-only">{featureLabel}</legend>
            {Array.from({ length: wizard.optionCount }, (_, index) => index).map((value) => (
              <AvatarOptionTile
                // Not a positional key: the value *is* the backend enum index for this
                // option, so it identifies the tile stably. The list is never reordered.
                key={`${wizard.feature}-${value}`}
                src={avatarOptionUrl(wizard.choices, wizard.feature, value)}
                label={t('avatar_settings.option_alt', {
                  feature: featureLabel,
                  number: value + 1,
                })}
                selected={wizard.choices[wizard.feature] === value}
                onSelect={() => wizard.select(value)}
              />
            ))}
          </fieldset>
        </div>
      </div>

      {wizard.finished && (
        <AvatarReveal
          choices={wizard.choices}
          saveState={wizard.saveState}
          onSave={wizard.save}
          onStartOver={wizard.startOver}
          onClose={wizard.closeReveal}
        />
      )}
    </div>
  );
}

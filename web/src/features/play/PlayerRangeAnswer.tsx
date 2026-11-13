// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// The RANGE part of legacy `lib/play/question.svelte` (`svelte-range-slider-pips` → shadcn Slider).
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';

type Props = {
  range: { min: number; max: number };
  value: number;
  onChange: (value: number) => void;
  answered: boolean;
  onSubmit: () => void;
};

export function PlayerRangeAnswer({ range, value, onChange, answered, onSubmit }: Props) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-8">
      <output
        className="text-center font-display font-semibold text-6xl tabular-nums"
        aria-live="polite"
      >
        {value}
      </output>
      <div className="flex items-center gap-3">
        <span className="text-lg tabular-nums">{range.min}</span>
        <Slider
          min={range.min}
          max={range.max}
          step={1}
          value={[value]}
          disabled={answered}
          thumbLabels={[t('play_page.loop.your_number')]}
          onValueChange={([next = value]) => onChange(next)}
          className="py-4"
        />
        <span className="text-lg tabular-nums">{range.max}</span>
      </div>
      <Button size="lg" className="h-14 text-lg" disabled={answered} onClick={onSubmit}>
        {t('words.submit')}
      </Button>
    </div>
  );
}

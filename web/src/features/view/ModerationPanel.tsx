// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useMutation } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { Loader2 } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { MOD_RATINGS, type ModRating, setModRating } from './viewApi';

const LABEL_KEYS: Record<string, string> = {
  none: 'view_quiz_page.mod.not_checked',
  '0': 'view_quiz_page.mod.ok',
  '1': 'view_quiz_page.mod.attention',
  '2': 'view_quiz_page.mod.nsfw',
  '3': 'view_quiz_page.mod.plausibility_checked',
  '4': 'view_quiz_page.mod.fact_checked',
  '5': 'view_quiz_page.mod.exceptional',
};

const toValue = (rating: ModRating) => (rating === null ? 'none' : String(rating));
const fromValue = (value: string): ModRating =>
  value === 'none' ? null : (Number(value) as Exclude<ModRating, null>);

/**
 * Port of legacy `routes/view/[quiz_id]/ModComponent.svelte`, shown with `?mod=…`. Legacy used a
 * column of buttons that dimmed the unpicked ones; a radio group says the same to a screen reader.
 */
export function ModerationPanel({ quizId, autoReturn }: { quizId: string; autoReturn: boolean }) {
  const { t } = useTranslation();
  const router = useRouter();
  const id = useId();
  const [value, setValue] = useState<string | undefined>(undefined);

  const submit = useMutation({
    mutationFn: (rating: ModRating) => setModRating(quizId, rating),
    onSuccess: () => {
      if (autoReturn) router.history.back();
      else toast.success(t('view_quiz_page.mod.saved'));
    },
    onError: () => toast.error(t('view_quiz_page.mod.failed')),
  });

  return (
    <form
      className="flex w-fit flex-col gap-3 rounded-xl border bg-card p-3"
      aria-labelledby={`${id}-title`}
      onSubmit={(event) => {
        event.preventDefault();
        if (value !== undefined) submit.mutate(fromValue(value));
      }}
    >
      <h2 id={`${id}-title`} className="font-display font-semibold text-sm">
        {t('view_quiz_page.mod.title')}
      </h2>
      <RadioGroup value={value} onValueChange={setValue} className="gap-1">
        {MOD_RATINGS.map((rating) => {
          const v = toValue(rating);
          return (
            <Label
              key={v}
              htmlFor={`${id}-${v}`}
              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-md px-2 font-normal hover:bg-accent"
            >
              <RadioGroupItem id={`${id}-${v}`} value={v} />
              {t(LABEL_KEYS[v] ?? v)}
            </Label>
          );
        })}
      </RadioGroup>
      <Button type="submit" disabled={value === undefined || submit.isPending}>
        {submit.isPending ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
        {t('view_quiz_page.mod.submit')}
      </Button>
    </form>
  );
}

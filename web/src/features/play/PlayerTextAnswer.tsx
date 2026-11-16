// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// The TEXT part of legacy `lib/play/question.svelte`.
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  answered: boolean;
  onSubmit: (answer: string) => void;
};

export function PlayerTextAnswer({ answered, onSubmit }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const [text, setText] = useState('');

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (text.length > 0) onSubmit(text);
      }}
    >
      <Label htmlFor={id} className="justify-center text-xl">
        {t('play_page.loop.enter_answer')}
      </Label>
      <Input
        id={id}
        value={text}
        onChange={(event) => setText(event.target.value)}
        disabled={answered}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        className="h-14 text-center text-xl md:text-xl"
      />
      <Button type="submit" size="lg" className="h-14 text-lg" disabled={answered || text === ''}>
        {t('words.submit')}
      </Button>
    </form>
  );
}

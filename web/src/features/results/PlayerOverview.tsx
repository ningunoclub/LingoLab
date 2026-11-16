// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of legacy `routes/results/[result_id]/player_overview.svelte`.
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { AnswerData } from '@/realtime/events';
import { correctAnswersPerPlayer, playersByScore } from './resultStats';

type Props = {
  scores: Record<string, number>;
  customFields: Record<string, string>;
  answers: AnswerData[][];
};

export function PlayerOverview({ scores, customFields, answers }: Props) {
  const { t } = useTranslation();
  const players = playersByScore(scores);
  const correct = correctAnswersPerPlayer(scores, answers);
  const hasCustomField = Object.keys(customFields).length > 0;

  return (
    <Table className="text-sm sm:text-base [&_td]:px-1.5 [&_th]:whitespace-normal [&_th]:px-1.5 sm:[&_td]:px-2 sm:[&_th]:px-2">
      <TableHeader>
        <TableRow>
          <TableHead>{t('result_page.player_name')}</TableHead>
          <TableHead className="text-right">{t('result_page.player_correct_questions')}</TableHead>
          <TableHead className="text-right">{t('result_page.player_score')}</TableHead>
          {hasCustomField ? <TableHead>{t('result_page.custom_field')}</TableHead> : null}
        </TableRow>
      </TableHeader>
      <TableBody>
        {players.map((name) => (
          <TableRow key={name}>
            <TableCell className="whitespace-normal break-all">{name}</TableCell>
            <TableCell className="text-right tabular-nums">{correct[name] ?? 0}</TableCell>
            <TableCell className="text-right tabular-nums">{scores[name]}</TableCell>
            {/* Legacy skipped the cell for players without a value, shifting the row. */}
            {hasCustomField ? (
              <TableCell className="whitespace-normal">{customFields[name]}</TableCell>
            ) : null}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of legacy `routes/results/[result_id]/general_overview.svelte`.
import { Trans, useTranslation } from 'react-i18next';
import { formatDateTime } from '@/lib/formatDate';
import { averageFinalScore } from './resultStats';

type Props = {
  title: string;
  timestamp: string;
  scores: Record<string, number>;
};

export function GeneralOverview({ title, timestamp, scores }: Props) {
  const { i18n } = useTranslation();
  const average = averageFinalScore(scores);

  return (
    <p className="prose-measure text-pretty text-xl leading-relaxed">
      {/* Legacy used {@html}, so the title went in unescaped. Here only <b> becomes markup;
          the values stay text. */}
      <Trans
        i18nKey="results_page.general_overview.sentence"
        values={{
          title,
          date: formatDateTime(timestamp, i18n.language) ?? '',
          player_count: Object.keys(scores).length,
          average_score: average === null ? '–' : average.toFixed(0),
        }}
        components={{ b: <strong className="font-semibold" /> }}
        // Values are escaped before the <b> tags are parsed, then shown as plain text again.
        shouldUnescape
        tOptions={{ interpolation: { escapeValue: true } }}
      />
    </p>
  );
}

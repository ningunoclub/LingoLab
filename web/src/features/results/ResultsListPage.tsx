// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of legacy `routes/results/+page.svelte`: the teacher's saved games.
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { Trophy } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { formatDateTime } from '@/lib/formatDate';
import { type ResultSummary, resultsQueries } from './resultsApi';

export function ResultsListPage() {
  const { t, i18n } = useTranslation();
  const results = useQuery(resultsQueries.list);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <h1 className="font-display font-semibold text-2xl">{t('words.results')}</h1>

      {results.isPending ? (
        <div className="flex flex-col gap-2" aria-busy="true">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-10 w-full" />
          ))}
        </div>
      ) : results.isError ? (
        <div className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <p role="alert" className="text-destructive text-sm">
            {t('results_page.load_failed')}
          </p>
          <Button type="button" variant="secondary" size="sm" onClick={() => results.refetch()}>
            {t('words.retry')}
          </Button>
        </div>
      ) : results.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-16 text-center">
          <Trophy className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="prose-measure text-muted-foreground">
            {t('results_page.no_results_so_far')}
          </p>
        </div>
      ) : (
        <>
          {/* Phones: one card per game, so no column is cut off. */}
          <ul className="flex flex-col gap-3 sm:hidden">
            {results.data.map((result) => (
              <li key={result.id} className="flex flex-col gap-1 rounded-xl border bg-card p-4">
                <Link
                  to="/results/$resultId"
                  params={{ resultId: result.id }}
                  className="font-medium text-lg text-primary underline underline-offset-4"
                >
                  {result.title}
                </Link>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 text-sm">
                  <dt className="text-muted-foreground">{t('results_page.date_played')}</dt>
                  <dd>{formatDateTime(result.timestamp, i18n.language)}</dd>
                  <dt className="text-muted-foreground">{t('results_page.player_count')}</dt>
                  <dd className="tabular-nums">{result.playerCount}</dd>
                  {result.note ? (
                    <>
                      <dt className="text-muted-foreground">{t('words.note')}</dt>
                      <dd className="break-words">{result.note}</dd>
                    </>
                  ) : null}
                </dl>
              </li>
            ))}
          </ul>
          <ResultsTable results={results.data} />
        </>
      )}
    </div>
  );
}

function ResultsTable({ results }: { results: ResultSummary[] }) {
  const { t, i18n } = useTranslation();
  return (
    <div className="hidden sm:block">
      <Table className="text-base">
        <TableHeader>
          <TableRow>
            <TableHead>{t('results_page.quiz_title')}</TableHead>
            <TableHead>{t('results_page.date_played')}</TableHead>
            <TableHead className="text-right">{t('results_page.player_count')}</TableHead>
            <TableHead>{t('words.note')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => (
            <TableRow key={result.id}>
              <TableCell className="whitespace-normal">
                {/* Legacy rendered the title with {@html}; titles are plain text (see the dashboard). */}
                <Link
                  to="/results/$resultId"
                  params={{ resultId: result.id }}
                  className="font-medium text-primary underline underline-offset-4"
                >
                  {result.title}
                </Link>
              </TableCell>
              <TableCell>{formatDateTime(result.timestamp, i18n.language)}</TableCell>
              <TableCell className="text-right tabular-nums">{result.playerCount}</TableCell>
              <TableCell className="whitespace-normal">{result.note}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

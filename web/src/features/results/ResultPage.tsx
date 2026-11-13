// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// Port of legacy `routes/results/[result_id]/+page.svelte`: one saved game in three tabs.
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GeneralOverview } from './GeneralOverview';
import { PlayerOverview } from './PlayerOverview';
import { QuestionOverview } from './QuestionOverview';
import { ResultNotFoundError, resultsQueries } from './resultsApi';

/** Legacy fades each tab in over 150 ms; tw-animate's fade is skipped with reduced motion. */
const TAB_CONTENT = 'pt-4 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150';

function BackLink() {
  const { t } = useTranslation();
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
      <Link to="/results">
        <ArrowLeft aria-hidden="true" />
        {t('results_page.back_to_list')}
      </Link>
    </Button>
  );
}

export function ResultPage({ resultId }: { resultId: string }) {
  const { t } = useTranslation();
  const result = useQuery(resultsQueries.one(resultId));

  let content: React.ReactNode;
  if (result.isPending) {
    content = (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-9 w-full max-w-md" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  } else if (result.isError && result.error instanceof ResultNotFoundError) {
    content = (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-16 text-center">
        <h1 className="font-display font-semibold text-xl">{t('results_page.not_found')}</h1>
        <p className="prose-measure text-muted-foreground">{t('results_page.not_found_text')}</p>
      </div>
    );
  } else if (result.isError) {
    content = (
      <div className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
        <p role="alert" className="text-destructive text-sm">
          {t('results_page.load_failed')}
        </p>
        <Button type="button" variant="secondary" size="sm" onClick={() => result.refetch()}>
          {t('words.retry')}
        </Button>
      </div>
    );
  } else {
    const data = result.data;
    content = (
      <>
        {/* Titles are plain text (see the dashboard). */}
        <h1 className="break-words font-display font-semibold text-2xl">{data.title}</h1>
        <Tabs defaultValue="overview">
          <TabsList variant="line" className="w-full justify-start border-b">
            <TabsTrigger value="overview" className="h-11 flex-none px-4 text-base">
              {t('words.overview')}
            </TabsTrigger>
            <TabsTrigger value="players" className="h-11 flex-none px-4 text-base">
              {t('words.player_plural')}
            </TabsTrigger>
            <TabsTrigger value="questions" className="h-11 flex-none px-4 text-base">
              {t('words.question_plural')}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className={TAB_CONTENT}>
            <GeneralOverview
              title={data.title}
              timestamp={data.timestamp}
              scores={data.playerScores}
            />
          </TabsContent>
          <TabsContent value="players" className={TAB_CONTENT}>
            <PlayerOverview
              scores={data.playerScores}
              customFields={data.customFields}
              answers={data.answers}
            />
          </TabsContent>
          <TabsContent value="questions" className={TAB_CONTENT}>
            <QuestionOverview questions={data.questions} answers={data.answers} />
          </TabsContent>
        </Tabs>
      </>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <BackLink />
      {content}
    </div>
  );
}

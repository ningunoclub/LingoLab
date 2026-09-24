// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { FolderOpen, Import, LibraryBig, Plus, Search, Settings, Trophy, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AnalyticsDialog } from './AnalyticsDialog';
import { DashboardItemCard } from './DashboardItemCard';
import { DownloadQuizDialog } from './DownloadQuizDialog';
import { type DashboardItem, dashboardQueries, deleteDashboardItem } from './dashboardApi';
import { createItemIndex, searchItems } from './searchItems';

function TopActions() {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('words.dashboard')} className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      <Button asChild className="col-span-2 h-11 sm:col-auto">
        <Link to="/create">
          <Plus aria-hidden="true" />
          {t('dashboard.create_quiz')}
        </Link>
      </Button>
      <Button asChild variant="outline" className="h-11">
        <Link to="/import">
          <Import aria-hidden="true" />
          {t('words.import')}
        </Link>
      </Button>
      <Button asChild variant="outline" className="h-11">
        <Link to="/results">
          <Trophy aria-hidden="true" />
          {t('words.results')}
        </Link>
      </Button>
      <Button asChild variant="outline" className="h-11">
        <Link to="/edit/files">
          <FolderOpen aria-hidden="true" />
          {t('words.files_library')}
        </Link>
      </Button>
      <Button asChild variant="outline" className="h-11">
        <Link to="/account/settings">
          <Settings aria-hidden="true" />
          {t('words.settings')}
        </Link>
      </Button>
    </nav>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const items = useQuery(dashboardQueries.items);

  const [term, setTerm] = useState('');
  const [analyticsItem, setAnalyticsItem] = useState<DashboardItem | null>(null);
  const [downloadId, setDownloadId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<DashboardItem | null>(null);

  const index = useMemo(() => createItemIndex(items.data ?? []), [items.data]);
  const visible = useMemo(
    () => searchItems(index, items.data ?? [], term),
    [index, items.data, term],
  );

  // Legacy reloads the whole page after a delete, whether it worked or not. Here the
  // list is refetched on success and a failure says so, keeping the item on screen.
  const remove = useMutation({
    mutationFn: deleteDashboardItem,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: dashboardQueries.items.queryKey });
      toast.success(t('dashboard.deleted'));
    },
    onError: () => toast.error(t('dashboard.errors.delete_failed')),
    onSettled: () => setPendingDelete(null),
  });

  // The start-game dialog is ported in a follow-up PR; until then Play says so.
  const startGame = () =>
    toast(t('styleguide.not_ported_title'), { description: t('styleguide.not_ported_body') });

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-10">
      <h1 className="sr-only">{t('words.dashboard')}</h1>
      <TopActions />

      {items.isPending ? (
        <div className="flex flex-col gap-3" aria-busy="true">
          <Skeleton className="h-11 w-full max-w-md self-center" />
          {[0, 1, 2].map((key) => (
            <Skeleton key={key} className="h-28 w-full" />
          ))}
        </div>
      ) : items.isError ? (
        <div className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm text-destructive">{t('dashboard.errors.load_failed')}</p>
          <Button type="button" variant="secondary" size="sm" onClick={() => items.refetch()}>
            {t('words.retry')}
          </Button>
        </div>
      ) : items.data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-16 text-center">
          <LibraryBig className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="prose-measure text-muted-foreground">{t('overview_page.no_quizzes')}</p>
        </div>
      ) : (
        <>
          <div className="relative w-full max-w-md self-center">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              name="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder={t('dashboard.search_for_own_quizzes')}
              aria-label={t('dashboard.search_for_own_quizzes')}
              className="h-11 px-9"
            />
            {term ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute top-1/2 right-0.5 size-10 -translate-y-1/2"
                aria-label={t('dashboard.clear_search')}
                onClick={() => setTerm('')}
              >
                <X aria-hidden="true" />
              </Button>
            ) : null}
          </div>

          {visible.length === 0 ? (
            <p className="text-center text-muted-foreground" role="status">
              {t('dashboard.no_search_results')}
            </p>
          ) : (
            <ul className="flex flex-col gap-3">
              {visible.map((item) => (
                <DashboardItemCard
                  key={`${item.type}-${item.id}`}
                  item={item}
                  onAnalytics={setAnalyticsItem}
                  onStartGame={startGame}
                  onDelete={setPendingDelete}
                  onDownload={(quiz) => setDownloadId(quiz.id)}
                />
              ))}
            </ul>
          )}
        </>
      )}

      <AnalyticsDialog item={analyticsItem} onClose={() => setAnalyticsItem(null)} />
      <DownloadQuizDialog quizId={downloadId} onClose={() => setDownloadId(null)} />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open && !remove.isPending) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard.delete_body', { title: pendingDelete?.title ?? '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={remove.isPending}>{t('words.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              disabled={remove.isPending}
              onClick={(event) => {
                // Keep the dialog open until the request settles, so a failure is not
                // mistaken for a completed delete.
                event.preventDefault();
                if (pendingDelete) remove.mutate(pendingDelete);
              }}
            >
              {t('words.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

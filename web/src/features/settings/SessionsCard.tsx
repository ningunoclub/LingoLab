// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, MonitorSmartphone } from 'lucide-react';
import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatUserAgent } from '@/lib/userAgent';
import { deleteSession, settingsQueries, type UserSession } from './settingsApi';

/**
 * The devices signed in to this account, newest activity first.
 *
 * Legacy renders ✅/❌ in a "This session?" column, which is colour/emoji-only meaning.
 * Here the current session carries a text badge instead, and ending it is treated as the
 * sign-out it actually is.
 */
export function SessionsCard() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<UserSession | null>(null);

  const sessions = useQuery(settingsQueries.sessions);
  const current = useQuery(settingsQueries.currentSession);

  const remove = useMutation({
    mutationFn: (session: UserSession) => deleteSession(session.id),
    onSuccess: async (_result, session) => {
      const endedOwnSession = session.id === current.data?.id;
      await queryClient.invalidateQueries({ queryKey: settingsQueries.sessions.queryKey });
      toast.success(t('settings_page.session_deleted'));
      if (endedOwnSession) {
        // The cookie for this browser is gone; drop every cached answer with it.
        queryClient.clear();
        window.location.assign('/account/login');
      }
    },
    onError: () => toast.error(t('settings_page.errors.session_delete_failed')),
    onSettled: () => setPendingDelete(null),
  });

  const rows = sessions.data ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2 className="font-display">{t('settings_page.sessions')}</h2>
        </CardTitle>
        <CardDescription className="prose-measure">
          {t('settings_page.sessions_hint')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {sessions.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : sessions.isError ? (
          <div className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">{t('settings_page.errors.sessions_failed')}</p>
            <Button type="button" variant="secondary" size="sm" onClick={() => sessions.refetch()}>
              {t('words.retry')}
            </Button>
          </div>
        ) : rows.length === 0 ? (
          // Not reachable in practice: viewing this page requires a session. Handled so
          // the table never renders an empty shell if that ever stops being true.
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed px-4 py-8 text-center">
            <MonitorSmartphone className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{t('settings_page.no_sessions')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('words.browser')}</TableHead>
                  <TableHead>{t('settings_page.last_seen')}</TableHead>
                  <TableHead>{t('overview_page.created_at')}</TableHead>
                  <TableHead className="text-right">{t('words.delete')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((session) => {
                  const isCurrent = current.data?.id === session.id;
                  return (
                    <TableRow key={session.id}>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-2">
                          <span>
                            {formatUserAgent(session.user_agent) ??
                              t('settings_page.unknown_device')}
                          </span>
                          {isCurrent ? (
                            <Badge variant="secondary" className="gap-1">
                              <Check className="size-3" aria-hidden="true" />
                              {t('settings_page.this_session')}
                            </Badge>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {formatDateTime(session.last_seen, i18n.language) ?? '—'}
                      </TableCell>
                      <TableCell className="tabular-nums whitespace-nowrap">
                        {formatDateTime(session.created_at, i18n.language) ?? '—'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setPendingDelete(session)}
                        >
                          <span className="text-destructive">{t('words.delete')}</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings_page.delete_session_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete && pendingDelete.id === current.data?.id
                ? t('settings_page.delete_this_session_body')
                : t('settings_page.delete_session_body')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('words.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (pendingDelete) remove.mutate(pendingDelete);
              }}
            >
              {t('words.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

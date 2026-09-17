// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, Eye, EyeOff, KeyRound } from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { createApiKey, deleteApiKey, settingsQueries } from './settingsApi';

/**
 * Shows the first and last few characters so a key can be told apart from its siblings
 * without putting the whole secret on screen.
 */
function maskKey(key: string): string {
  if (key.length <= 12) return '•'.repeat(key.length);
  return `${key.slice(0, 4)}${'•'.repeat(8)}${key.slice(-4)}`;
}

function ApiKeyRow({ apiKey, onDelete }: { apiKey: string; onDelete: (key: string) => void }) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied or unavailable (insecure context, permissions).
      // The key is still revealable and selectable, so this is not worth an error state.
      toast.error(t('settings_page.errors.copy_failed'));
    }
  };

  return (
    <li className="flex flex-wrap items-center gap-2 rounded-md border px-3 py-2">
      <code className="min-w-0 flex-1 font-mono text-sm break-all">
        {revealed ? apiKey : maskKey(apiKey)}
      </code>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setRevealed((value) => !value)}
        aria-pressed={revealed}
      >
        {revealed ? (
          <EyeOff className="size-4" aria-hidden="true" />
        ) : (
          <Eye className="size-4" aria-hidden="true" />
        )}
        <span className="sr-only sm:not-sr-only">
          {revealed ? t('settings_page.hide_key') : t('settings_page.show_key')}
        </span>
      </Button>

      <Button type="button" variant="ghost" size="sm" onClick={copy}>
        {copied ? (
          <Check className="size-4" aria-hidden="true" />
        ) : (
          <Copy className="size-4" aria-hidden="true" />
        )}
        <span className="sr-only sm:not-sr-only">
          {copied ? t('settings_page.copied') : t('words.copy')}
        </span>
      </Button>

      <Button type="button" variant="ghost" size="sm" onClick={() => onDelete(apiKey)}>
        <span className="text-destructive">{t('words.delete')}</span>
      </Button>
    </li>
  );
}

/**
 * API keys for the backend's programmatic access.
 *
 * Two deviations from legacy, both deliberate: the key is masked behind an explicit
 * reveal (teachers mirror their screen in class, and a visible key is a live credential),
 * and deletion is confirmed in a dialog rather than a native `confirm()`.
 */
export function ApiKeysCard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const keys = useQuery(settingsQueries.apiKeys);

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: settingsQueries.apiKeys.queryKey });

  const create = useMutation({
    mutationFn: createApiKey,
    onSuccess: async () => {
      await invalidate();
      toast.success(t('settings_page.api_key_created'));
    },
    onError: () => toast.error(t('settings_page.errors.api_key_create_failed')),
  });

  const remove = useMutation({
    mutationFn: deleteApiKey,
    onSuccess: async () => {
      await invalidate();
      toast.success(t('settings_page.api_key_deleted'));
    },
    onError: () => toast.error(t('settings_page.errors.api_key_delete_failed')),
    onSettled: () => setPendingDelete(null),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2 className="font-display">{t('settings_page.api_keys')}</h2>
        </CardTitle>
        <CardDescription className="prose-measure">
          {t('settings_page.api_keys_hint')}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {keys.isPending ? (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-11 w-full" />
            <Skeleton className="h-11 w-full" />
          </div>
        ) : keys.isError ? (
          <div className="flex flex-col items-start gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4">
            <p className="text-sm text-destructive">{t('settings_page.errors.api_keys_failed')}</p>
            <Button type="button" variant="secondary" size="sm" onClick={() => keys.refetch()}>
              {t('words.retry')}
            </Button>
          </div>
        ) : keys.data.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-md border border-dashed px-4 py-8 text-center">
            <KeyRound className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">{t('settings_page.no_api_keys')}</p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {keys.data.map((key) => (
              <ApiKeyRow key={key} apiKey={key} onDelete={setPendingDelete} />
            ))}
          </ul>
        )}

        <div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => create.mutate()}
            disabled={create.isPending}
          >
            {t('settings_page.add_api_key')}
          </Button>
        </div>
      </CardContent>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('settings_page.delete_api_key_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('settings_page.delete_api_key_body')}
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

// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DashboardItem } from './dashboardApi';

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="flex flex-col gap-1 rounded-md border p-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      {/* Quiztivities have no counters; legacy printed "undefined" there. */}
      <dd className="font-display text-2xl font-semibold tabular-nums">{value ?? '–'}</dd>
    </div>
  );
}

/** Port of legacy `routes/dashboard/Analytics.svelte`. */
export function AnalyticsDialog({
  item,
  onClose,
}: {
  item: DashboardItem | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const stats = item?.stats ?? undefined;

  return (
    <Dialog
      open={item !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{t('words.analytics')}</DialogTitle>
          <DialogDescription>{item?.title}</DialogDescription>
        </DialogHeader>

        <section className="flex flex-col gap-2">
          <h3 className="font-medium">{t('words.rating')}</h3>
          <dl className="grid grid-cols-2 gap-2">
            <Stat label={t('words.like')} value={stats?.likes} />
            <Stat label={t('words.dislike')} value={stats?.dislikes} />
          </dl>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="font-medium">{t('dashboard.views_n_plays')}</h3>
          <dl className="grid grid-cols-2 gap-2">
            <Stat label={t('words.view')} value={stats?.views} />
            <Stat label={t('words.play')} value={stats?.plays} />
          </dl>
        </section>

        <section className="flex flex-col gap-2">
          <h3 className="font-medium">{t('words.info')}</h3>
          <p className="text-sm text-muted-foreground">{t('dashboard.info_analytics')}</p>
        </section>
      </DialogContent>
    </Dialog>
  );
}

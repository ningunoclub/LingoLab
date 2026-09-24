// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { Link } from '@tanstack/react-router';
import { ChartColumn, Download, Eye, type LucideIcon, Pencil, Play, Trash2 } from 'lucide-react';
import type { ReactElement, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MediaComponent } from '@/components/MediaComponent';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { DashboardItem } from './dashboardApi';

type Props = {
  item: DashboardItem;
  onAnalytics: (item: DashboardItem) => void;
  onStartGame: (item: DashboardItem) => void;
  onDelete: (item: DashboardItem) => void;
  onDownload: (item: DashboardItem) => void;
};

/**
 * One icon-only action. The visible label lives in a tooltip, the accessible name in
 * aria-label, so the six actions stay compact without becoming unlabelled icons.
 */
function Action({
  label,
  icon: Icon,
  disabled = false,
  destructive = false,
  onClick,
  link,
}: {
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
  destructive?: boolean;
  onClick?: () => void;
  /** A router link to render instead of a button (ignored while disabled). */
  link?: (children: ReactNode) => ReactElement;
}) {
  const content = <Icon className="size-5" aria-hidden="true" />;
  const asLink = Boolean(link) && !disabled;
  const button = (
    <Button
      type={asLink ? undefined : 'button'}
      variant="outline"
      size="icon"
      className={destructive ? 'size-11 text-destructive hover:text-destructive' : 'size-11'}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      asChild={asLink}
    >
      {asLink && link ? link(content) : content}
    </Button>
  );

  // Disabled buttons swallow pointer events, so they get no tooltip; the label is still
  // announced through aria-label.
  if (disabled) return button;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function DashboardItemCard({ item, onAnalytics, onStartGame, onDelete, onDownload }: Props) {
  const { t } = useTranslation();
  const isQuiz = item.type === 'quiz';

  return (
    <li className="flex flex-col gap-4 rounded-xl border bg-card p-4 sm:flex-row sm:items-center">
      {/* Legacy hides the cover below the lg breakpoint; here it hides below sm only. */}
      {item.coverImage ? (
        <MediaComponent
          src={item.coverImage}
          className="hidden aspect-video w-40 shrink-0 rounded-md bg-muted sm:block"
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-2">
          <h2 className="truncate font-display text-lg font-semibold">{item.title}</h2>
          {isQuiz ? null : <Badge variant="secondary">{t('words.quiztivity')}</Badge>}
        </div>
        {item.description ? (
          <p className="line-clamp-2 text-sm text-muted-foreground">{item.description}</p>
        ) : null}
      </div>

      <div className="grid shrink-0 grid-cols-6 gap-2 sm:grid-cols-3">
        {/* Legacy: disabled unless the quiz is public (quiztivities never are). */}
        <Action
          label={t('words.view')}
          icon={Eye}
          disabled={!item.public}
          link={(children) => (
            <Link to="/view/$quizId" params={{ quizId: item.id }}>
              {children}
            </Link>
          )}
        />
        <Action label={t('words.analytics')} icon={ChartColumn} onClick={() => onAnalytics(item)} />
        <Action
          label={t('words.edit')}
          icon={Pencil}
          link={(children) =>
            isQuiz ? (
              <Link to="/edit" search={{ quiz_id: item.id }}>
                {children}
              </Link>
            ) : (
              <Link to="/quiztivity/edit" search={{ id: item.id }}>
                {children}
              </Link>
            )
          }
        />
        {isQuiz ? (
          <Action label={t('words.play')} icon={Play} onClick={() => onStartGame(item)} />
        ) : (
          <Action
            label={t('words.play')}
            icon={Play}
            link={(children) => (
              <Link to="/quiztivity/play" search={{ id: item.id }}>
                {children}
              </Link>
            )}
          />
        )}
        <Action
          label={t('words.delete')}
          icon={Trash2}
          destructive
          onClick={() => onDelete(item)}
        />
        {/* Legacy: only quizzes can be exported. */}
        <Action
          label={t('words.download')}
          icon={Download}
          disabled={!isQuiz}
          onClick={() => onDownload(item)}
        />
      </div>
    </li>
  );
}

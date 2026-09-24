// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { FileArchive, FileSpreadsheet } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * Port of legacy `lib/components/DownloadQuiz.svelte`. Both options are plain links: the
 * backend answers with a Content-Disposition attachment, so the browser downloads the
 * file and the page stays where it is.
 */
export function DownloadQuizDialog({
  quizId,
  onClose,
}: {
  quizId: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog
      open={quizId !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">{t('downloader.select_download_type')}</DialogTitle>
          <DialogDescription>{t('downloader.help')}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button asChild variant="default" className="h-11">
            <a href={`/api/v1/eximport/${quizId}`}>
              <FileArchive aria-hidden="true" />
              {t('downloader.own_format')}
            </a>
          </Button>
          <Button asChild variant="outline" className="h-11">
            <a href={`/api/v1/eximport/excel/${quizId}`}>
              <FileSpreadsheet aria-hidden="true" />
              {t('downloader.excel_format')}
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

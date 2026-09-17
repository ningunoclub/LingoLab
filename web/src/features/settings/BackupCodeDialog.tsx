// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { APP_NAME } from '@/config';

/**
 * Shows a freshly generated backup code once and offers it as a download.
 *
 * The filename uses the app name from config, since the UI must not say "ClassQuiz".
 *
 * Legacy built the download from `data:text/plain;charset=utf-8,${code}` without
 * encoding. The codes are hex from `os.urandom(32).hex()`, so nothing needed escaping in
 * practice, but a Blob URL avoids the question entirely and is revoked after use.
 */
export function BackupCodeDialog({
  backupCode,
  onClose,
}: {
  backupCode: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  const download = useCallback(() => {
    if (!backupCode) return;

    const blob = new Blob([backupCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${APP_NAME}-Backup-Code.txt`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [backupCode]);

  return (
    <Dialog open={backupCode !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle asChild>
            <h2 className="font-display">{t('security_settings.backup_codes.your_backup_code')}</h2>
          </DialogTitle>
          <DialogDescription className="prose-measure">
            {t('security_settings.backup_codes.save_somewhere_save')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          {/*
            Legacy also downloaded the code when the code text itself was clicked (once,
            via the `already_downloaded` latch). That was invisible to keyboard users and
            undiscoverable to everyone else, and it fires a file download on what looks
            like an ordinary text selection. Dropped: the button below does the same job
            for every input method, and the text stays selectable for copying.
          */}
          <p className="w-full select-all break-all rounded-[--radius] border bg-muted p-4 text-center font-mono text-lg">
            {backupCode}
          </p>

          <Button type="button" onClick={download}>
            {t('security_settings.backup_codes.download_code')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

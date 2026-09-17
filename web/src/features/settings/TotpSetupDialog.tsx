// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { TotpSetupData } from './securityApi';

/**
 * Shown once, right after TOTP is enabled: the provisioning QR code and the secret in
 * text, for authenticator apps that cannot scan.
 *
 * Legacy rendered a fixed `p-48` overlay with a three-column grid, which is unusable
 * below roughly 1100px. This is a normal dialog that stacks on a phone.
 *
 * `qrcode.react` replaces the legacy `qrcode` package per the mapping in web/CLAUDE.md.
 * It draws the SVG locally, so nothing about the secret leaves the browser - which the
 * privacy rules require and a hosted QR service would violate.
 */
export function TotpSetupDialog({
  totpData,
  onClose,
}: {
  totpData: TotpSetupData | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  return (
    <Dialog open={totpData !== null} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle asChild>
            <h2 className="font-display">{t('security_settings.totp_setup.totp_setup')}</h2>
          </DialogTitle>
          <DialogDescription className="prose-measure">
            {t('security_settings.totp_setup.scan_to_set_up')}
          </DialogDescription>
        </DialogHeader>

        {totpData ? (
          <div className="flex flex-col items-center gap-4">
            {/*
              The QR code must stay high-contrast to scan, so it keeps a white quiet zone
              in both themes rather than following the surface colour.
            */}
            <div className="rounded-[--radius] bg-white p-4">
              <QRCodeSVG value={totpData.url} size={192} level="M" marginSize={0} />
            </div>

            <div className="w-full text-center">
              <p className="text-sm text-muted-foreground">
                {t('security_settings.totp_setup.enter_as_secret_if_no_see_code')}
              </p>
              <p className="mt-2 select-all break-all font-mono text-sm">{totpData.secret}</p>
            </div>

            <p className="text-sm font-medium text-center prose-measure">
              {t('security_settings.totp_setup.do_not_forget_backup_code')}
            </p>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

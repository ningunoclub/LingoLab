// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
//
// The QR code of legacy `lib/play/admin/game_not_started.svelte`, with its full-screen overlay
// rebuilt on the shadcn Dialog (Esc and focus handling come with it).
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/** The backend renders the code (an SVG pointing at `<root_address>/play?pin=…&ref=Qr`). */
export function qrCodeUrl(gamePin: string): string {
  return `/api/v1/utils/qr/${encodeURIComponent(gamePin)}`;
}

export function QrCodeButton({ gamePin }: { gamePin: string }) {
  const { t } = useTranslation();
  const src = qrCodeUrl(gamePin);

  return (
    <Dialog>
      <DialogTrigger
        aria-label={t('admin_page.lobby.show_qr')}
        className="mx-auto block cursor-zoom-in rounded-lg bg-white p-3 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        {/* White in both themes: scanners need dark modules on a light ground. */}
        <img src={src} alt={t('admin_page.lobby.qr_alt')} className="size-56 sm:size-72" />
      </DialogTrigger>
      {/* As in legacy, a click anywhere closes it (Esc too); no close button over the code. */}
      <DialogContent
        showCloseButton={false}
        className="h-[min(90vh,90vw)] w-[min(90vh,90vw)] max-w-none bg-white p-0 sm:max-w-none"
      >
        <DialogTitle className="sr-only">{t('admin_page.lobby.qr_alt')}</DialogTitle>
        <DialogClose
          aria-label={t('words.close')}
          className="h-full w-full cursor-zoom-out rounded-lg p-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
        >
          <img src={src} alt="" className="h-full w-full object-contain" />
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}

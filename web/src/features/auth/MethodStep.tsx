// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0

import type { LucideIcon } from 'lucide-react';
import { KeyRound, RectangleEllipsis, Timer } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AuthMethod } from './loginApi';

type Props = {
  methods: AuthMethod[];
  onSelect: (method: AuthMethod) => void;
};

const METHOD_UI: Partial<
  Record<AuthMethod, { icon: LucideIcon; labelKey: string; descKey: string }>
> = {
  PASSKEY: {
    icon: KeyRound,
    labelKey: 'login_page.methods.passkey',
    descKey: 'login_page.methods.passkey_description',
  },
  PASSWORD: {
    icon: RectangleEllipsis,
    labelKey: 'login_page.methods.password',
    descKey: 'login_page.methods.password_description',
  },
  TOTP: {
    icon: Timer,
    labelKey: 'login_page.methods.totp',
    descKey: 'login_page.methods.totp_description',
  },
};

/**
 * Method picker, ported from `select_method.svelte`.
 *
 * Legacy rendered each option as a `<div>` with `onclick`/`onkeyup`, which is not
 * reachable by keyboard in any reliable way. These are real buttons. Legacy also
 * hardcoded English labels here while translating the rest of the page; the strings
 * now go through i18n like everything else.
 */
export function MethodStep({ methods, onSelect }: Props) {
  const { t } = useTranslation();

  return (
    <div>
      <h1 className="font-display font-semibold text-2xl tracking-tight">
        {t('login_page.methods.title')}
      </h1>
      <ul className="mt-6 flex flex-col gap-3">
        {methods.map((method) => {
          const ui = METHOD_UI[method];
          if (!ui) return null;
          const Icon = ui.icon;
          return (
            <li key={method}>
              <button
                type="button"
                onClick={() => onSelect(method)}
                className="flex w-full items-center gap-3 rounded-lg border bg-card p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                <Icon className="size-6 shrink-0 text-primary" aria-hidden="true" />
                <span>
                  <span className="block font-medium text-sm">{t(ui.labelKey)}</span>
                  <span className="block text-muted-foreground text-sm">{t(ui.descKey)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

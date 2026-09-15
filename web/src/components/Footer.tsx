// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
// Ported from frontend/src/lib/footer.svelte.
// Upstream's donation solicitation is dropped; the MPL attribution to ClassQuiz stays.
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { APP_NAME } from '@/config';

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>
          {APP_NAME} &middot;{' '}
          <span>
            Based on{' '}
            <a
              href="https://github.com/mawoka-myblock/ClassQuiz"
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-4 hover:text-foreground"
            >
              ClassQuiz
            </a>{' '}
            (MPL-2.0)
          </span>
        </p>
        <nav aria-label={t('footer.more_details_here')}>
          <ul className="flex flex-wrap gap-4">
            <li>
              <Link
                to="/docs/privacy-policy"
                className="underline underline-offset-4 hover:text-foreground"
              >
                {t('words.privacy_policy')}
              </Link>
            </li>
            <li>
              <Link
                to="/docs/attribution"
                className="underline underline-offset-4 hover:text-foreground"
              >
                {t('words.attribution')}
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </footer>
  );
}

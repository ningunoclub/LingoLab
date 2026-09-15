// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { createFileRoute, notFound } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ANSWER_SLOTS, AnswerTile } from '@/components/AnswerTile';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { config } from '@/config';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <Separator />
      {children}
    </section>
  );
}

const SEMANTIC_TOKENS = [
  { name: 'background', className: 'bg-background text-foreground border' },
  { name: 'card', className: 'bg-card text-card-foreground border' },
  { name: 'primary', className: 'bg-primary text-primary-foreground' },
  { name: 'secondary', className: 'bg-secondary text-secondary-foreground' },
  { name: 'accent', className: 'bg-accent text-accent-foreground' },
  { name: 'muted', className: 'bg-muted text-muted-foreground' },
  { name: 'destructive', className: 'bg-destructive text-destructive-foreground' },
] as const;

const TYPE_SCALE = [
  { label: 'Display / 4xl', className: 'font-display text-4xl font-bold' },
  { label: 'Heading / 2xl', className: 'font-display text-2xl font-semibold' },
  { label: 'Heading / xl', className: 'font-display text-xl font-semibold' },
  { label: 'Body / base', className: 'text-base' },
  { label: 'Body / sm', className: 'text-sm' },
  { label: 'Muted / sm', className: 'text-sm text-muted-foreground' },
] as const;

function Styleguide() {
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-10 px-4 py-10 lg:px-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-display text-3xl font-bold">{t('styleguide.title')}</h1>
          <p className="prose-measure text-muted-foreground">{t('styleguide.intro')}</p>
        </div>
        <ThemeToggle />
      </header>

      <Section title={t('styleguide.colours')}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {SEMANTIC_TOKENS.map(({ name, className }) => (
            <div key={name} className={`flex h-20 items-end rounded-lg p-3 ${className}`}>
              <code className="text-xs font-medium">{name}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title={t('styleguide.typography')}>
        <div className="flex flex-col gap-3">
          {TYPE_SCALE.map(({ label, className }) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className={className}>The quick brown fox jumps over the lazy dog</span>
            </div>
          ))}
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">Tabular numerals (scores, timers)</span>
            <span className="font-display text-3xl font-bold tabular-nums">00:30 · 1,234</span>
          </div>
        </div>
      </Section>

      <Section title={t('styleguide.buttons')}>
        <div className="flex flex-wrap items-center gap-3">
          <Button>Default</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="link">Link</Button>
          <Button variant="destructive">Destructive</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>Badge</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="outline">Outline</Badge>
          <Badge variant="destructive">Destructive</Badge>
        </div>
      </Section>

      <Section title={t('styleguide.inputs')}>
        <div className="grid gap-4 sm:max-w-md">
          <div className="grid gap-2">
            <Label htmlFor="sg-email">{t('words.email')}</Label>
            <Input id="sg-email" type="email" placeholder="teacher@school.ch" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sg-disabled">{t('words.password')}</Label>
            <Input id="sg-disabled" type="password" disabled placeholder="Disabled" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sg-invalid">{t('words.username')}</Label>
            <Input id="sg-invalid" aria-invalid defaultValue="taken" aria-describedby="sg-error" />
            <p id="sg-error" className="text-sm text-destructive">
              {t('styleguide.sample_error')}
            </p>
          </div>
        </div>
      </Section>

      <Section title={t('styleguide.cards')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>{t('words.quiz')}</CardTitle>
              <CardDescription>{t('overview_page.no_quizzes')}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2">
              <Button size="sm">{t('words.start')}</Button>
              <Button size="sm" variant="secondary">
                {t('words.edit')}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{t('styleguide.states')}</CardTitle>
              <CardDescription>Loading skeletons</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        </div>
      </Section>

      <Section title={t('styleguide.answer_tiles')}>
        <p className="prose-measure text-sm text-muted-foreground">
          Okabe–Ito palette. Each slot pairs a colour with a distinct shape, so colour is never the
          only signal.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {ANSWER_SLOTS.map(({ slot, name }) => (
            <AnswerTile
              key={slot}
              answerSlot={slot}
              label={`${t('words.answer')} ${slot} · ${name}`}
            />
          ))}
        </div>
      </Section>
    </div>
  );
}

export const Route = createFileRoute('/styleguide')({
  // Dev-only: the styleguide must not ship to teachers or students.
  beforeLoad: () => {
    if (!config.isDev) throw notFound();
  },
  component: Styleguide,
});

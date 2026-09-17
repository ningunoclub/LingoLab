// SPDX-FileCopyrightText: 2023 Marlon W (Mawoka)
// SPDX-FileCopyrightText: 2026 Bruno Zingg
// SPDX-License-Identifier: MPL-2.0
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { type ChangePasswordForm, changePasswordSchema } from './changePasswordSchema';
import { changePassword, WrongPasswordError } from './settingsApi';

/**
 * Changing the password ends every session, including this one, so the user is sent to
 * the login page afterwards. Legacy did the same with `alert()` +
 * `window.location.assign`; here it is a toast plus client-side navigation, and the
 * query cache is cleared so no signed-in data survives the sign-out.
 */
export function ChangePasswordCard({ username }: { username: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema),
    mode: 'onTouched',
    defaultValues: { oldPassword: '', newPassword: '', newPasswordConfirm: '' },
  });

  const onSubmit = form.handleSubmit(async (values) => {
    setFormError(null);
    try {
      await changePassword({
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      toast.success(t('settings_page.password_changed'));
      queryClient.clear();
      await navigate({ to: '/account/login' });
    } catch (error) {
      if (error instanceof WrongPasswordError) {
        form.setError('oldPassword', { message: 'settings_page.errors.old_password_wrong' });
        return;
      }
      setFormError(t('settings_page.errors.password_change_failed'));
    }
  });

  const { errors, isSubmitting } = form.formState;

  return (
    <Card>
      <CardHeader>
        <CardTitle asChild>
          <h2 className="font-display">{t('settings_page.change_password')}</h2>
        </CardTitle>
        <CardDescription className="prose-measure">
          {t('settings_page.change_password_hint')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
          {/*
            Password managers file a password against an account, so the form needs a
            username field even though this page is already authenticated. Unlike the
            reset-password page, this one knows who is signed in, so it can name them.
          */}
          <input
            id="settings-username"
            name="username"
            type="text"
            autoComplete="username"
            hidden
            readOnly
            value={username}
          />

          <div className="grid gap-2">
            <Label htmlFor="oldPassword">{t('settings_page.old_password')}</Label>
            <Input
              id="oldPassword"
              type="password"
              autoComplete="current-password"
              aria-invalid={errors.oldPassword ? true : undefined}
              {...form.register('oldPassword')}
            />
            {errors.oldPassword?.message ? (
              <p className="text-sm text-destructive">{t(errors.oldPassword.message)}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="newPassword">{t('settings_page.new_password')}</Label>
            <Input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              aria-invalid={errors.newPassword ? true : undefined}
              {...form.register('newPassword')}
            />
            {errors.newPassword?.message ? (
              <p className="text-sm text-destructive">{t(errors.newPassword.message)}</p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="newPasswordConfirm">{t('settings_page.repeat_password')}</Label>
            <Input
              id="newPasswordConfirm"
              type="password"
              autoComplete="new-password"
              aria-invalid={errors.newPasswordConfirm ? true : undefined}
              {...form.register('newPasswordConfirm')}
            />
            {errors.newPasswordConfirm?.message ? (
              <p className="text-sm text-destructive">{t(errors.newPasswordConfirm.message)}</p>
            ) : null}
          </div>

          {formError ? (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          ) : null}

          <div>
            <Button type="submit" disabled={isSubmitting}>
              {t('settings_page.change_password_submit')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

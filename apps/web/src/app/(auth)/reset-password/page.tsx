'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { resetPasswordSchema, type ResetPasswordInput } from '@careerpilot/shared';
import { useResetPasswordMutation, errorMessage } from '@/store/api';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormField } from '@/components/form-field';

export default function ResetPasswordPage() {
  const [reset, { isLoading, error, isSuccess }] = useResetPasswordMutation();
  const { register, handleSubmit, formState, setValue } = useForm<ResetPasswordInput>({ resolver: zodResolver(resetPasswordSchema) });
  const [hasToken, setHasToken] = useState(true);

  useEffect(() => {
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) setValue('token', token);
    else setHasToken(false);
  }, [setValue]);

  return (
    <div className="space-y-8" data-testid="reset-password-page">
      <h1 className="text-3xl font-extrabold tracking-tight">Choose a new password</h1>
      {!hasToken && <Alert variant="destructive"><AlertDescription>This reset link is missing its token.</AlertDescription></Alert>}
      {error && <Alert variant="destructive" data-testid="reset-error"><AlertDescription>{errorMessage(error)}</AlertDescription></Alert>}
      {isSuccess ? (
        <Alert data-testid="reset-success">
          <CheckCircle2 />
          <AlertDescription>Password updated. All devices were signed out. <Link href="/login" className="font-semibold text-primary underline" data-testid="reset-login-link">Sign in</Link></AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit((v) => reset(v))} className="space-y-5" noValidate>
          <FormField label="New password" type="password" autoComplete="new-password" testId="reset-password-input" error={formState.errors.password?.message} {...register('password')} />
          <Button type="submit" className="w-full" disabled={isLoading || !hasToken} data-testid="reset-submit-button">
            {isLoading && <Loader2 className="animate-spin" />} Update password
          </Button>
        </form>
      )}
    </div>
  );
}

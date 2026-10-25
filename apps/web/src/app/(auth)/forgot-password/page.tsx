'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, MailCheck } from 'lucide-react';
import { forgotPasswordSchema } from '@careerpilot/shared';
import { useForgotPasswordMutation, errorMessage } from '@/store/api';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormField } from '@/components/form-field';

export default function ForgotPasswordPage() {
  const [forgot, { isLoading, error, data }] = useForgotPasswordMutation();
  const { register, handleSubmit, formState } = useForm<{ email: string }>({ resolver: zodResolver(forgotPasswordSchema) });
  const [sent, setSent] = useState(false);

  const onSubmit = async (v: { email: string }) => {
    await forgot(v).unwrap().then(() => setSent(true)).catch(() => undefined);
  };

  return (
    <div className="space-y-8" data-testid="forgot-password-page">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Reset your password</h1>
        <p className="text-sm text-muted-foreground">We will email you a link that is valid for 30 minutes.</p>
      </div>
      {error && <Alert variant="destructive"><AlertDescription>{errorMessage(error)}</AlertDescription></Alert>}
      {sent ? (
        <Alert data-testid="forgot-password-success">
          <MailCheck />
          <AlertDescription className="space-y-2">
            <p>{data?.message}</p>
            {data?.devResetUrl && (
              <p className="text-xs">
                Email is in mock mode. <a className="font-semibold text-primary underline" href={data.devResetUrl} data-testid="dev-reset-link">Open the reset link</a>
              </p>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FormField label="Email" type="email" testId="forgot-email-input" error={formState.errors.email?.message} {...register('email')} />
          <Button type="submit" className="w-full" disabled={isLoading} data-testid="forgot-submit-button">
            {isLoading && <Loader2 className="animate-spin" />} Send reset link
          </Button>
        </form>
      )}
      <Link href="/login" className="text-sm font-semibold text-primary hover:underline" data-testid="back-to-login-link">Back to sign in</Link>
    </div>
  );
}

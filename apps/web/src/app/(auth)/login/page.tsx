'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { loginSchema, type LoginInput } from '@careerpilot/shared';
import { useLoginMutation, errorMessage } from '@/store/api';
import { safeNext } from '@/lib/access';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormField } from '@/components/form-field';

export default function LoginPage() {
  const router = useRouter();
  const [login, { isLoading, error }] = useLoginMutation();
  const { register, handleSubmit, formState } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  // One login page for all roles; redirect target is decided by the returned role.
  const onSubmit = async (values: LoginInput) => {
    const { user } = await login(values).unwrap().catch(() => ({ user: null }));
    if (!user) return;
    const next = new URLSearchParams(window.location.search).get('next');
    router.replace(safeNext(user.role, next));
    router.refresh();
  };

  return (
    <div className="space-y-8" data-testid="login-page">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in as a job seeker, consultant or admin.</p>
      </div>
      {error && (
        <Alert variant="destructive" data-testid="login-error">
          <AlertDescription>{errorMessage(error)}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <FormField label="Email" type="email" autoComplete="email" testId="login-email-input" error={formState.errors.email?.message} {...register('email')} />
        <FormField label="Password" type="password" autoComplete="current-password" testId="login-password-input" error={formState.errors.password?.message} {...register('password')} />
        <div className="-mt-2 text-right">
          <Link href="/forgot-password" className="text-xs font-semibold text-primary hover:underline" data-testid="forgot-password-link">
            Forgot password?
          </Link>
        </div>
        <Button type="submit" className="w-full" disabled={isLoading} data-testid="login-submit-button">
          {isLoading && <Loader2 className="animate-spin" />} Sign in
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        New to CareerPilot?{' '}
        <Link href="/register" className="font-semibold text-primary hover:underline" data-testid="go-to-register-link">
          Create an account
        </Link>
      </p>
    </div>
  );
}

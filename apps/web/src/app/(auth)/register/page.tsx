'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Briefcase, Loader2, UserRound } from 'lucide-react';
import { registerSchema, type RegisterInput } from '@careerpilot/shared';
import { useRegisterMutation, errorMessage } from '@/store/api';
import { homeFor } from '@/lib/access';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormField } from '@/components/form-field';

// ADMIN is not offered: admins are created only by the seed script.
const ROLE_OPTIONS = [
  { value: 'USER', label: 'Job seeker', icon: UserRound, testId: 'register-role-user' },
  { value: 'CONSULTANT', label: 'Career consultant', icon: Briefcase, testId: 'register-role-consultant' },
] as const;

export default function RegisterPage() {
  const router = useRouter();
  const [registerUser, { isLoading, error }] = useRegisterMutation();
  const { register, handleSubmit, formState, watch, setValue } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'USER' },
  });
  const role = watch('role');

  const onSubmit = async (values: RegisterInput) => {
    const { user } = await registerUser(values).unwrap().catch(() => ({ user: null }));
    if (!user) return;
    router.replace(homeFor(user.role));
    router.refresh();
  };

  return (
    <div className="space-y-8" data-testid="register-page">
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Create your account</h1>
        <p className="text-sm text-muted-foreground">Choose how you will use CareerPilot.</p>
      </div>
      {error && (
        <Alert variant="destructive" data-testid="register-error">
          <AlertDescription>{errorMessage(error)}</AlertDescription>
        </Alert>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Account type">
          {ROLE_OPTIONS.map(({ value, label, icon: Icon, testId }) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={role === value}
              data-testid={testId}
              onClick={() => setValue('role', value)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg border px-3 py-3 text-sm font-semibold transition-colors',
                role === value ? 'border-primary bg-accent text-accent-foreground' : 'hover:bg-secondary',
              )}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>
        <FormField label="Full name" autoComplete="name" testId="register-name-input" error={formState.errors.name?.message} {...register('name')} />
        <FormField label="Email" type="email" autoComplete="email" testId="register-email-input" error={formState.errors.email?.message} {...register('email')} />
        <FormField label="Phone (optional)" type="tel" autoComplete="tel" testId="register-phone-input" error={formState.errors.phone?.message} {...register('phone')} />
        <FormField label="Password" type="password" autoComplete="new-password" testId="register-password-input" error={formState.errors.password?.message} {...register('password')} />
        <Button type="submit" className="w-full" disabled={isLoading} data-testid="register-submit-button">
          {isLoading && <Loader2 className="animate-spin" />} Create account
        </Button>
      </form>
      <p className="text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline" data-testid="go-to-login-link">
          Sign in
        </Link>
      </p>
    </div>
  );
}

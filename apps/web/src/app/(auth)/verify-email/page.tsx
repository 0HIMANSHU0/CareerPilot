'use client';

import { useEffect, useRef } from 'react';
import Link from 'next/link';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { useVerifyEmailMutation, errorMessage } from '@/store/api';

export default function VerifyEmailPage() {
  const [verify, { isLoading, isSuccess, error, isUninitialized }] = useVerifyEmailMutation();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const token = new URLSearchParams(window.location.search).get('token');
    if (token) verify({ token });
  }, [verify]);

  return (
    <div className="space-y-6" data-testid="verify-email-page">
      <h1 className="text-3xl font-extrabold tracking-tight">Email verification</h1>
      {(isLoading || isUninitialized) && !error && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Verifying…</p>}
      {isSuccess && <p className="flex items-center gap-2 font-medium text-emerald-700" data-testid="verify-success"><CheckCircle2 className="h-5 w-5" /> Your email is verified.</p>}
      {error && <p className="flex items-center gap-2 font-medium text-destructive" data-testid="verify-error"><XCircle className="h-5 w-5" /> {errorMessage(error)}</p>}
      <Link href="/" className="text-sm font-semibold text-primary hover:underline" data-testid="verify-continue-link">Continue</Link>
    </div>
  );
}

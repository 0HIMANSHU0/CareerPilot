'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CreditCard, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useBookingQuery, useMockPayMutation, errorMessage } from '@/store/api';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { inr, when } from '@/components/bookings/status-badge';

// Stand-in for Stripe Checkout when no Stripe keys are configured (MOCK mode).
export default function MockCheckoutPage() {
  const router = useRouter();
  const [id, setId] = useState('');
  useEffect(() => setId(new URLSearchParams(window.location.search).get('bookingId') || ''), []);
  const { data } = useBookingQuery(id, { skip: !id });
  const [pay, { isLoading, originalArgs }] = useMockPayMutation();

  const complete = (outcome: 'success' | 'failure') =>
    pay({ id, outcome }).unwrap().then(() => router.replace(`/consultations/success?bookingId=${id}`)).catch((e) => toast.error(errorMessage(e)));

  return (
    <div className="mx-auto max-w-md space-y-4 pt-8" data-testid="mock-checkout-page">
      <Alert variant="warning"><AlertDescription><strong>MOCK PAYMENT.</strong> Stripe is not configured, so no money moves. The result runs through the same confirmation logic as the Stripe webhook.</AlertDescription></Alert>
      <Card className="space-y-4 p-6">
        <div className="flex items-center gap-2 font-semibold"><CreditCard className="h-5 w-5 text-primary" /> CareerPilot checkout</div>
        {data && (
          <div className="space-y-1 text-sm">
            <p>Consultation with <strong>{data.booking.consultantName}</strong></p>
            <p className="text-muted-foreground">{when(data.booking.startTime)}</p>
            <p className="pt-2 font-mono text-2xl font-bold" data-testid="mock-checkout-amount">{inr(data.booking.amount)}</p>
          </div>
        )}
        <div className="flex gap-2">
          <Button className="flex-1" disabled={isLoading || !data} onClick={() => complete('success')} data-testid="mock-pay-success">{isLoading && originalArgs?.outcome === 'success' && <Loader2 className="animate-spin" />} Pay now</Button>
          <Button variant="outline" disabled={isLoading || !data} onClick={() => complete('failure')} data-testid="mock-pay-failure">Simulate failure</Button>
        </div>
      </Card>
    </div>
  );
}

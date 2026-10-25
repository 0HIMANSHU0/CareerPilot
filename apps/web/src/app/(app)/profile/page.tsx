'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, MailWarning } from 'lucide-react';
import { toast } from 'sonner';
import { updateProfileSchema, type UpdateProfileInput } from '@careerpilot/shared';
import { useMeQuery, useResendVerificationMutation, useUpdateProfileMutation, errorMessage } from '@/store/api';
import { PageHeader } from '@/components/page-header';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ROLE_LABEL } from '@/components/app-shell/nav-config';

export default function ProfilePage() {
  const { data } = useMeQuery();
  const user = data?.user;
  const [update, { isLoading }] = useUpdateProfileMutation();
  const [resend, { isLoading: resending }] = useResendVerificationMutation();
  const { register, handleSubmit, formState } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
    values: user && { name: user.name, phone: user.phone ?? '', profile: { headline: user.profile?.headline ?? '', bio: user.profile?.bio ?? '', location: user.profile?.location ?? '', linkedinUrl: user.profile?.linkedinUrl ?? '' } },
  });
  const onSubmit = (v: UpdateProfileInput) => update(v).unwrap().then(() => toast.success('Profile updated')).catch((e) => toast.error(errorMessage(e)));
  const onResend = () => resend().unwrap().then((r) => {
    toast.success(r.alreadyVerified ? 'Already verified' : 'Verification email sent');
    if (r.devVerifyUrl) window.location.assign(r.devVerifyUrl);
  }).catch((e) => toast.error(errorMessage(e)));

  return (
    <div className="max-w-2xl space-y-6" data-testid="profile-page">
      <PageHeader eyebrow="Account" title="Profile" description={user ? `${user.email} · ${ROLE_LABEL[user.role]}` : undefined} />
      {user && !user.emailVerified && (
        <Alert variant="warning" data-testid="email-unverified-alert">
          <MailWarning />
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">Your email is not verified yet.
            <Button size="sm" variant="outline" disabled={resending} onClick={onResend} data-testid="resend-verification-button">Send verification link</Button>
          </AlertDescription>
        </Alert>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Personal details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2" noValidate>
            <FormField label="Name" testId="profile-name-input" error={formState.errors.name?.message} {...register('name')} />
            <FormField label="Phone" testId="profile-phone-input" error={formState.errors.phone?.message} {...register('phone')} />
            <FormField label="Headline" testId="profile-headline-input" {...register('profile.headline')} />
            <FormField label="Location" testId="profile-location-input" {...register('profile.location')} />
            <div className="sm:col-span-2"><FormField label="LinkedIn URL" testId="profile-linkedin-input" error={formState.errors.profile?.linkedinUrl?.message} {...register('profile.linkedinUrl')} /></div>
            <div className="space-y-2 sm:col-span-2"><Label htmlFor="bio">Bio</Label><Textarea id="bio" rows={4} data-testid="profile-bio-input" {...register('profile.bio')} /></div>
            <div><Button type="submit" disabled={isLoading} data-testid="profile-save-button">{isLoading && <Loader2 className="animate-spin" />} Save changes</Button></div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import type { ResumeTemplateId } from '@careerpilot/shared';
import { useCreateResumeMutation, useMeQuery, errorMessage } from '@/store/api';
import { PageHeader } from '@/components/page-header';
import { FormField } from '@/components/form-field';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TemplateToggle } from '@/components/resume/resume-frame';

const schema = z.object({
  title: z.string().trim().min(1, 'Give your resume a name').max(120),
  fullName: z.string().trim().min(1, 'Full name is required').max(100),
  headline: z.string().trim().max(120).optional(),
  templateId: z.enum(['modern-professional', 'ats-classic']),
});
type Values = z.infer<typeof schema>;

export default function CreateResumePage() {
  const router = useRouter();
  const { data: me } = useMeQuery();
  const [create, { isLoading, error }] = useCreateResumeMutation();
  const { register, handleSubmit, formState, watch, setValue } = useForm<Values>({
    resolver: zodResolver(schema),
    values: { title: 'My resume', fullName: me?.user.name ?? '', headline: me?.user.profile?.headline ?? '', templateId: 'modern-professional' },
  });

  const onSubmit = async (v: Values) => {
    const data = {
      personal: { fullName: v.fullName, title: v.headline, email: me?.user.email, phone: me?.user.phone, location: me?.user.profile?.location, links: [] },
      summary: '', education: [], experience: [], skills: [], projects: [], certifications: [], achievements: [],
    };
    const res = await create({ title: v.title, templateId: v.templateId, data }).unwrap().catch(() => null);
    if (res) router.push(`/resumes/${res.resume.id}/edit`);
  };

  return (
    <div className="max-w-2xl" data-testid="resume-create-page">
      <PageHeader eyebrow="Resumes" title="Create resume" description="Start with the basics; fill sections and use AI in the editor." />
      <Card className="p-6">
        {error && <Alert variant="destructive" className="mb-4"><AlertDescription>{errorMessage(error)}</AlertDescription></Alert>}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
          <FormField label="Resume name" testId="resume-title-input" error={formState.errors.title?.message} {...register('title')} />
          <FormField label="Full name" testId="resume-fullname-input" error={formState.errors.fullName?.message} {...register('fullName')} />
          <FormField label="Professional title" placeholder="e.g. Senior Frontend Engineer" testId="resume-headline-input" {...register('headline')} />
          <div className="space-y-2">
            <p className="text-sm font-medium">Template</p>
            <TemplateToggle value={watch('templateId')} onChange={(t: ResumeTemplateId) => setValue('templateId', t)} />
          </div>
          <Button type="submit" disabled={isLoading} data-testid="resume-create-submit">{isLoading && <Loader2 className="animate-spin" />} Create and edit</Button>
        </form>
      </Card>
    </div>
  );
}

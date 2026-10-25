'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, Eye, FilePlus2, FileText, PenLine, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ResumeTemplateId } from '@careerpilot/shared';
import { useDeleteResumeMutation, useDuplicateResumeMutation, useResumesQuery, errorMessage } from '@/store/api';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { ResumeFrame, TemplateToggle, TEMPLATES } from '@/components/resume/resume-frame';

function ResumeList() {
  const router = useRouter();
  const { data, isLoading, isError } = useResumesQuery();
  const [duplicate] = useDuplicateResumeMutation();
  const [remove] = useDeleteResumeMutation();

  if (isLoading) return <div className="grid gap-3">{[0, 1].map((i) => <Skeleton key={i} className="h-20" />)}</div>;
  if (isError) return <p className="text-sm text-destructive">Could not load resumes.</p>;
  if (!data?.items.length)
    return <EmptyState icon={FileText} title="No resumes yet" description="Create your first resume with AI-drafted content, version history and export." testId="resumes-empty-state"
      action={<Button asChild data-testid="resumes-empty-create"><Link href="/resumes/create"><FilePlus2 /> Create resume</Link></Button>} />;

  return (
    <div className="grid content-start gap-3" data-testid="resume-list">
      {data.items.map((r) => (
        <Card key={r.id} className="flex flex-wrap items-center gap-3 p-4" data-testid={`resume-card-${r.id}`}>
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{r.title}</p>
            <p className="text-xs text-muted-foreground">{TEMPLATES.find((t) => t.id === r.templateId)?.name} · v{r.version} · updated {new Date(r.updatedAt).toLocaleString()}</p>
          </div>
          <Button size="sm" variant="outline" asChild data-testid={`resume-edit-${r.id}`}><Link href={`/resumes/${r.id}/edit`}><PenLine /> Edit</Link></Button>
          <Button size="sm" variant="ghost" asChild data-testid={`resume-preview-${r.id}`}><Link href={`/resumes/${r.id}/preview`}><Eye /> Preview</Link></Button>
          <Button size="icon" variant="ghost" aria-label="Duplicate" data-testid={`resume-duplicate-${r.id}`}
            onClick={() => duplicate(r.id).unwrap().then(({ resume }) => { toast.success('Duplicated'); router.push(`/resumes/${resume.id}/edit`); }).catch((e) => toast.error(errorMessage(e)))}><Copy /></Button>
          <Button size="icon" variant="ghost" aria-label="Delete" data-testid={`resume-delete-${r.id}`}
            onClick={() => window.confirm(`Delete "${r.title}"?`) && remove(r.id).unwrap().then(() => toast.success('Deleted')).catch((e) => toast.error(errorMessage(e)))}><Trash2 /></Button>
        </Card>
      ))}
    </div>
  );
}

export default function ResumesPage() {
  const [template, setTemplate] = useState<ResumeTemplateId>('modern-professional');
  return (
    <div data-testid="resumes-page">
      <PageHeader eyebrow="Career tools" title="Resumes" description="One structured resume, any template. Content and design stay separate."
        actions={<Button asChild data-testid="create-resume-button"><Link href="/resumes/create"><FilePlus2 /> New resume</Link></Button>} />
      <div className="grid gap-8 xl:grid-cols-[1fr_520px]">
        <ResumeList />
        <section className="space-y-3" data-testid="live-template-preview">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold">Live template preview</h2>
            <TemplateToggle value={template} onChange={setTemplate} />
          </div>
          <p className="text-xs text-muted-foreground">The same sample data rendered by each template.</p>
          <ResumeFrame template={template} />
        </section>
      </div>
    </div>
  );
}

'use client';

import { useRef } from 'react';
import type { ResumeTemplateId } from '@careerpilot/shared';
import { useRenderResumeQuery } from '@/store/api';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export const TEMPLATES: { id: ResumeTemplateId; name: string }[] = [
  { id: 'modern-professional', name: 'Modern Professional' },
  { id: 'ats-classic', name: 'ATS Classic' },
];

export function TemplateToggle({ value, onChange }: { value: ResumeTemplateId; onChange: (t: ResumeTemplateId) => void }) {
  return (
    <div className="inline-flex rounded-lg border bg-card p-1" role="radiogroup" aria-label="Template">
      {TEMPLATES.map((t) => (
        <button key={t.id} role="radio" aria-checked={value === t.id} onClick={() => onChange(t.id)} data-testid={`template-toggle-${t.id}`}
          className={cn('rounded-md px-3 py-1.5 text-xs font-semibold transition-colors', value === t.id ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary')}>
          {t.name}
        </button>
      ))}
    </div>
  );
}

// Server-rendered HTML (resume-templates package) shown in a sandboxed iframe.
export function ResumeFrame({ id, template, className, onReady }: { id?: string; template: ResumeTemplateId; className?: string; onReady?: (f: HTMLIFrameElement | null) => void }) {
  const { data, isFetching, isError } = useRenderResumeQuery({ id, template }, { refetchOnMountOrArgChange: true });
  const ref = useRef<HTMLIFrameElement>(null);
  if (isError) return <p className="text-sm text-destructive" data-testid="resume-frame-error">Could not render the resume.</p>;
  if (!data) return <Skeleton className={cn('h-[640px] w-full', className)} />;
  return (
    <iframe
      ref={(el) => { (ref as React.MutableRefObject<HTMLIFrameElement | null>).current = el; onReady?.(el); }}
      title="Resume preview"
      srcDoc={data}
      sandbox="allow-same-origin allow-modals"
      data-testid="resume-preview-frame"
      className={cn('h-[640px] w-full rounded-lg border bg-white shadow-sm transition-opacity', isFetching && 'opacity-60', className)}
    />
  );
}

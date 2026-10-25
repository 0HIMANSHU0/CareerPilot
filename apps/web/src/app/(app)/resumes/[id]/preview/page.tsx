'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Download, PenLine, Printer } from 'lucide-react';
import type { ResumeTemplateId } from '@careerpilot/shared';
import { useResumeQuery, useUpdateResumeMutation } from '@/store/api';
import { PageHeader } from '@/components/page-header';
import { Button } from '@/components/ui/button';
import { ResumeFrame, TemplateToggle } from '@/components/resume/resume-frame';

export default function PreviewResumePage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useResumeQuery(id, { refetchOnMountOrArgChange: true });
  const [update] = useUpdateResumeMutation();
  const [template, setTemplate] = useState<ResumeTemplateId | null>(null);
  const frame = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (data && !template) setTemplate(data.resume.templateId);
  }, [data, template]);

  const choose = (t: ResumeTemplateId) => {
    setTemplate(t);
    update({ id, templateId: t }); // apply the selected template to the saved resume
  };
  const downloadHtml = () => {
    const html = frame.current?.srcdoc;
    if (!html) return;
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html' }));
    const a = Object.assign(document.createElement('a'), { href: url, download: `${data?.resume.title || 'resume'}.html` });
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div data-testid="resume-preview-page">
      <PageHeader eyebrow="Resumes" title={data?.resume.title || 'Preview'} description="Print to PDF or download semantic HTML."
        actions={
          <div className="flex flex-wrap gap-2">
            {template && <TemplateToggle value={template} onChange={choose} />}
            <Button variant="outline" size="sm" asChild data-testid="preview-edit-link"><Link href={`/resumes/${id}/edit`}><PenLine /> Edit</Link></Button>
            <Button variant="outline" size="sm" onClick={downloadHtml} data-testid="export-html-button"><Download /> HTML</Button>
            <Button size="sm" onClick={() => frame.current?.contentWindow?.print()} data-testid="export-pdf-button"><Printer /> Print / PDF</Button>
          </div>
        } />
      {template && <ResumeFrame id={id} template={template} className="h-[1000px]" onReady={(f) => (frame.current = f)} />}
    </div>
  );
}

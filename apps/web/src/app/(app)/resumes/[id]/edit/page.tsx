'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Eye, History, Loader2, Save, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import type { ResumeData, ResumeTemplateId } from '@careerpilot/shared';
import { useGenerateResumeMutation, useResumeQuery, useRestoreVersionMutation, useSaveVersionMutation, useUpdateResumeMutation, useVersionsQuery, errorMessage } from '@/store/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { RichTextEditor } from '@/components/resume/rich-text-editor';
import { ArrayEditor, type FieldDef } from '@/components/resume/array-editor';
import { TemplateToggle } from '@/components/resume/resume-frame';

const SECTIONS: { key: 'experience' | 'education' | 'projects' | 'certifications'; title: string; add: string; fields: FieldDef[]; blank: Record<string, unknown> }[] = [
  { key: 'experience', title: 'Experience', add: 'Add experience', blank: { company: '', title: '', startDate: '', endDate: '', current: false, highlights: [] },
    fields: [{ key: 'title', label: 'Job title' }, { key: 'company', label: 'Company' }, { key: 'location', label: 'Location' }, { key: 'current', label: 'I currently work here', kind: 'checkbox' }, { key: 'startDate', label: 'Start' }, { key: 'endDate', label: 'End' }, { key: 'highlights', label: 'Highlights', kind: 'lines' }] },
  { key: 'education', title: 'Education', add: 'Add education', blank: { institution: '', degree: '' },
    fields: [{ key: 'degree', label: 'Degree' }, { key: 'field', label: 'Field of study' }, { key: 'institution', label: 'Institution' }, { key: 'grade', label: 'Grade' }, { key: 'startDate', label: 'Start' }, { key: 'endDate', label: 'End' }] },
  { key: 'projects', title: 'Projects', add: 'Add project', blank: { name: '', technologies: [] },
    fields: [{ key: 'name', label: 'Name' }, { key: 'url', label: 'URL' }, { key: 'description', label: 'Description', wide: true }, { key: 'technologies', label: 'Technologies', kind: 'lines' }] },
  { key: 'certifications', title: 'Certifications', add: 'Add certification', blank: { name: '' },
    fields: [{ key: 'name', label: 'Name' }, { key: 'issuer', label: 'Issuer' }, { key: 'date', label: 'Date' }] },
];

const clean = (d: ResumeData): ResumeData => ({
  ...d,
  skills: d.skills.map((s) => s.trim()).filter(Boolean),
  achievements: d.achievements.map((s) => s.trim()).filter(Boolean),
  experience: d.experience.map((e) => ({ ...e, highlights: e.highlights.map((h) => h.trim()).filter(Boolean) })),
  projects: d.projects.map((p) => ({ ...p, technologies: p.technologies.map((t) => t.trim()).filter(Boolean) })),
});

function VersionsPanel({ id, onRestored }: { id: string; onRestored: (d: ResumeData) => void }) {
  const { data } = useVersionsQuery(id);
  const [restore, { isLoading }] = useRestoreVersionMutation();
  return (
    <Card data-testid="versions-panel">
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><History className="h-4 w-4" /> Version history</CardTitle></CardHeader>
      <CardContent className="max-h-72 space-y-2 overflow-y-auto">
        {data?.items.map((v) => (
          <div key={v.id} className="flex items-center justify-between gap-2 text-sm" data-testid={`version-${v.version}`}>
            <div><p className="font-medium">v{v.version} · {v.note}</p><p className="text-xs text-muted-foreground">{new Date(v.createdAt).toLocaleString()}</p></div>
            <Button size="sm" variant="ghost" disabled={isLoading} data-testid={`version-restore-${v.version}`}
              onClick={() => restore({ id, version: v.version }).unwrap().then(({ resume }) => { onRestored(resume.data); toast.success(`Restored v${v.version}`); }).catch((e) => toast.error(errorMessage(e)))}>Restore</Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function EditResumePage() {
  const { id } = useParams<{ id: string }>();
  const { data: loaded, isLoading, error } = useResumeQuery(id, { refetchOnMountOrArgChange: true });
  const [update] = useUpdateResumeMutation();
  const [saveVersion, { isLoading: savingVersion }] = useSaveVersionMutation();
  const [generate, { isLoading: generating, originalArgs }] = useGenerateResumeMutation();
  const [data, setData] = useState<ResumeData | null>(null);
  const [title, setTitle] = useState('');
  const [templateId, setTemplateId] = useState<ResumeTemplateId>('modern-professional');
  const [status, setStatus] = useState<'saved' | 'dirty' | 'saving' | 'error'>('saved');
  const [saveError, setSaveError] = useState('');
  const first = useRef(true);

  useEffect(() => {
    if (loaded && !data) {
      setData(loaded.resume.data);
      setTitle(loaded.resume.title);
      setTemplateId(loaded.resume.templateId);
    }
  }, [loaded, data]);

  const persist = useCallback(async () => {
    if (!data) return;
    setStatus('saving');
    try {
      await update({ id, title, templateId, data: clean(data) }).unwrap();
      setStatus('saved');
    } catch (e) {
      setStatus('error');
      setSaveError(errorMessage(e));
    }
  }, [data, id, title, templateId, update]);

  // Autosave 1.5s after the last change.
  useEffect(() => {
    if (!data) return;
    if (first.current) { first.current = false; return; }
    setStatus('dirty');
    const t = setTimeout(persist, 1500);
    return () => clearTimeout(t);
  }, [data, title, templateId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || (!data && !error)) return <div className="space-y-4"><Skeleton className="h-10 w-72" /><Skeleton className="h-64" /></div>;
  if (error || !data) return <p className="text-destructive" data-testid="resume-load-error">{errorMessage(error, 'Resume not found')}</p>;

  // Functional updates so rapid edits (typing + AI results) never overwrite each other.
  const set = <K extends keyof ResumeData>(k: K, v: ResumeData[K]) => setData((prev) => prev && { ...prev, [k]: v });
  const setPersonal = (k: keyof ResumeData['personal'], v: string) => setData((prev) => prev && { ...prev, personal: { ...prev.personal, [k]: v } });
  const runAI = (target: 'summary' | 'experience' | 'full') =>
    generate({ target, data: clean(data) }).unwrap()
      .then((r) => { setData(r.data); toast.success(r.mock ? 'Generated (MOCK AI – no key configured)' : 'AI content applied – review and edit'); })
      .catch((e) => toast.error(errorMessage(e)));
  const aiBtn = (target: 'summary' | 'experience' | 'full', label: string) => (
    <Button type="button" variant="outline" size="sm" disabled={generating} onClick={() => runAI(target)} data-testid={`ai-generate-${target}`}>
      {generating && originalArgs?.target === target ? <Loader2 className="animate-spin" /> : <Sparkles />} {label}
    </Button>
  );

  return (
    <div className="space-y-6" data-testid="resume-edit-page">
      <div className="flex flex-wrap items-center gap-3">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} className="max-w-sm text-lg font-bold" data-testid="resume-title-edit" />
        <span className="flex items-center gap-1 text-xs text-muted-foreground" data-testid="autosave-status" data-status={status}>
          {status === 'saving' && <><Loader2 className="h-3 w-3 animate-spin" /> Saving…</>}
          {status === 'saved' && <><CheckCircle2 className="h-3 w-3 text-emerald-600" /> All changes saved</>}
          {status === 'dirty' && 'Unsaved changes'}
          {status === 'error' && <span className="text-destructive">Save failed: {saveError}</span>}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <TemplateToggle value={templateId} onChange={setTemplateId} />
          <Button variant="outline" size="sm" disabled={savingVersion} data-testid="save-version-button"
            onClick={async () => { await persist(); saveVersion({ id }).unwrap().then(() => toast.success('Version saved')).catch((e) => toast.error(errorMessage(e))); }}><Save /> Save version</Button>
          <Button size="sm" asChild data-testid="resume-open-preview"><Link href={`/resumes/${id}/preview`} onClick={() => persist()}><Eye /> Preview</Link></Button>
        </div>
      </div>
      <div className="flex flex-wrap gap-2">{aiBtn('full', 'AI polish everything')}</div>

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3"><CardTitle className="text-base">Personal information</CardTitle></CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {(['fullName', 'title', 'email', 'phone', 'location'] as const).map((k) => (
                <div key={k} className="space-y-1.5">
                  <Label className="text-xs capitalize">{k === 'fullName' ? 'Full name' : k}</Label>
                  <Input value={(data.personal[k] as string) || ''} onChange={(e) => setPersonal(k, e.target.value)} data-testid={`personal-${k}`} />
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between pb-3"><CardTitle className="text-base">Professional summary</CardTitle>{aiBtn('summary', 'Write with AI')}</CardHeader>
            <CardContent><RichTextEditor value={data.summary} onChange={(html) => set('summary', html)} /></CardContent>
          </Card>
          {SECTIONS.map((s) => (
            <Card key={s.key}>
              <CardHeader className="flex-row items-center justify-between pb-3"><CardTitle className="text-base">{s.title}</CardTitle>{s.key === 'experience' && aiBtn('experience', 'Improve bullets')}</CardHeader>
              <CardContent>
                <ArrayEditor items={data[s.key] as unknown as Record<string, unknown>[]} fields={s.fields} blank={s.blank} addLabel={s.add} testId={`section-${s.key}`}
                  onChange={(items) => set(s.key, items as never)} />
              </CardContent>
            </Card>
          ))}
          {(['skills', 'achievements'] as const).map((k) => (
            <Card key={k}>
              <CardHeader className="pb-3"><CardTitle className="text-base capitalize">{k}</CardTitle></CardHeader>
              <CardContent>
                <Textarea rows={4} placeholder="One per line" value={data[k].join('\n')} onChange={(e) => set(k, e.target.value.split('\n'))} data-testid={`section-${k}`} />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4 xl:sticky xl:top-20 xl:self-start">
          <VersionsPanel id={id} onRestored={(d) => setData(d)} />
        </div>
      </div>
    </div>
  );
}

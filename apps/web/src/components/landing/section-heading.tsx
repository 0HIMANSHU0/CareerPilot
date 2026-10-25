import { cn } from '@/lib/utils';

export function SectionHeading({ eyebrow, title, text, dark }: { eyebrow: string; title: string; text?: string; dark?: boolean }) {
  return (
    <div className="mb-12 max-w-2xl space-y-3">
      <p className={cn('text-xs font-semibold uppercase tracking-wider', dark ? 'text-blue-400' : 'text-primary')}>{eyebrow}</p>
      <h2 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h2>
      {text && <p className={cn('text-base', dark ? 'text-slate-400' : 'text-muted-foreground')}>{text}</p>}
    </div>
  );
}

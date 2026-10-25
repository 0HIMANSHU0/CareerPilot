import { Badge } from '@/components/ui/badge';

interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  phase?: string;
  actions?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, phase, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-2">
        {eyebrow && <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{eyebrow}</p>}
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl" data-testid="page-title">
            {title}
          </h1>
          {phase && (
            <Badge variant="secondary" data-testid="page-phase-badge">
              {phase}
            </Badge>
          )}
        </div>
        {description && <p className="max-w-2xl text-sm text-muted-foreground md:text-base">{description}</p>}
      </div>
      {actions}
    </div>
  );
}

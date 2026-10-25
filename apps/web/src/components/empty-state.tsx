import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  testId: string;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, testId, className }: EmptyStateProps) {
  return (
    <div
      data-testid={testId}
      className={cn(
        'flex animate-fade-up flex-col items-start gap-4 rounded-xl border border-dashed bg-card p-8 sm:p-12',
        className,
      )}
    >
      <div className="rounded-lg bg-accent p-3 text-accent-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <div className="max-w-xl space-y-1.5">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

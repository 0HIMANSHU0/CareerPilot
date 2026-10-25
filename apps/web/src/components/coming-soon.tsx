import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { EmptyState } from '@/components/empty-state';

interface ComingSoonProps {
  eyebrow: string;
  title: string;
  description: string;
  phase: 'Phase 2' | 'Phase 3';
  icon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
  testId: string;
}

// Placeholder used by Phase 0 routes so every page already has a designed empty state.
export function ComingSoon(props: ComingSoonProps) {
  return (
    <>
      <PageHeader eyebrow={props.eyebrow} title={props.title} description={props.description} phase={props.phase} />
      <EmptyState icon={props.icon} title={props.emptyTitle} description={props.emptyDescription} testId={props.testId} />
    </>
  );
}

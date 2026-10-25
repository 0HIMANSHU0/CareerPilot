import type { LucideIcon } from 'lucide-react';
import { WifiOff } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';

interface StatCardProps {
  label: string;
  value: number | null | undefined;
  icon: LucideIcon;
  loading: boolean;
  testId: string;
}

// value === null means the owning service was unavailable (partial dashboard failure).
export function StatCard({ label, value, icon: Icon, loading, testId }: StatCardProps) {
  return (
    <Card className="p-5 transition-transform hover:-translate-y-0.5" data-testid={testId}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-4 h-10">
        {loading ? (
          <Skeleton className="h-9 w-16" />
        ) : value === null || value === undefined ? (
          <Badge variant="warning" data-testid={`${testId}-unavailable`}>
            <WifiOff className="h-3 w-3" /> Service offline
          </Badge>
        ) : (
          <p className="font-mono text-4xl font-bold tracking-tight" data-testid={`${testId}-value`}>
            {value}
          </p>
        )}
      </div>
    </Card>
  );
}

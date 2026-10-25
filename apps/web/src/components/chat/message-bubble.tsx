import { Bot, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';

export function MessageBubble({ role, content, failed, testId }: { role: 'user' | 'assistant'; content: string; failed?: boolean; testId?: string }) {
  const isUser = role === 'user';
  return (
    <div className={cn('flex gap-3', isUser && 'flex-row-reverse')} data-testid={testId}>
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', isUser ? 'bg-primary text-primary-foreground' : 'bg-sidebar text-sidebar-foreground')}>
        {isUser ? <UserRound className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
      </div>
      <div className={cn('max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed', isUser ? 'bg-primary text-primary-foreground' : 'border bg-card', failed && 'opacity-60')}>
        {content || <span className="inline-block h-4 w-2 animate-pulse bg-muted-foreground/40" />}
        {failed && <p className="mt-1 text-xs">Not answered – the assistant failed on this message.</p>}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { MessageSquarePlus, MessagesSquare } from 'lucide-react';
import { useSessionsQuery } from '@/store/api';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export function SessionList() {
  const { data, isLoading, isError } = useSessionsQuery();
  const { sessionId } = useParams<{ sessionId?: string }>();
  const router = useRouter();

  return (
    <aside className="flex flex-col gap-3 border-b pb-4 lg:w-72 lg:shrink-0 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4" data-testid="chat-session-list">
      <Button onClick={() => router.push('/chat')} data-testid="new-chat-button">
        <MessageSquarePlus /> New chat
      </Button>
      <div className="flex max-h-48 flex-col gap-1 overflow-y-auto lg:max-h-[calc(100vh-14rem)]">
        {isLoading && [0, 1, 2].map((i) => <Skeleton key={i} className="h-10" />)}
        {isError && <p className="text-sm text-destructive">Could not load conversations.</p>}
        {data?.items.length === 0 && <p className="px-2 text-sm text-muted-foreground" data-testid="chat-sessions-empty">No conversations yet.</p>}
        {data?.items.map((s) => (
          <Link
            key={s.id}
            href={`/chat/${s.id}`}
            data-testid={`chat-session-item-${s.id}`}
            className={cn('flex items-center gap-2 truncate rounded-md px-3 py-2 text-sm transition-colors', s.id === sessionId ? 'bg-accent font-semibold text-accent-foreground' : 'hover:bg-secondary')}
          >
            <MessagesSquare className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate">{s.title}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}

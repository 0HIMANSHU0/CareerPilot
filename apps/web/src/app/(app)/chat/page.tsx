'use client';

import { useRouter } from 'next/navigation';
import { Bot } from 'lucide-react';
import { toast } from 'sonner';
import { useCreateSessionMutation, errorMessage } from '@/store/api';
import { Composer, PROMPT_STARTERS } from '@/components/chat/composer';

// New chat: create a session, then hand the first message to the session page via ?q=.
export default function NewChatPage() {
  const router = useRouter();
  const [create, { isLoading }] = useCreateSessionMutation();

  const start = async (text: string) => {
    try {
      const { session } = await create({}).unwrap();
      router.push(`/chat/${session.id}?q=${encodeURIComponent(text)}`);
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pt-4" data-testid="chat-new-page">
      <div className="flex animate-fade-up flex-col items-start gap-4 rounded-xl border bg-card p-8">
        <div className="rounded-lg bg-sidebar p-3 text-sidebar-foreground"><Bot className="h-6 w-6" /></div>
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" data-testid="page-title">AI Career Assistant</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ask anything about your career. Conversations are saved so you can continue later.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {PROMPT_STARTERS.map((p, i) => (
            <button key={p} onClick={() => start(p)} disabled={isLoading} data-testid={`prompt-starter-${i}`}
              className="rounded-full border px-3 py-1.5 text-left text-xs font-medium transition-colors hover:border-primary hover:bg-accent disabled:opacity-50">
              {p}
            </button>
          ))}
        </div>
      </div>
      <Composer onSend={start} busy={isLoading} />
    </div>
  );
}

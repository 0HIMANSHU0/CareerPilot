'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Check, Pencil, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { useDeleteSessionMutation, useRenameSessionMutation, useSessionQuery, errorMessage, api } from '@/store/api';
import { useDispatch } from 'react-redux';
import { Composer } from '@/components/chat/composer';
import { MessageBubble } from '@/components/chat/message-bubble';
import { useChatStream } from '@/components/chat/use-chat-stream';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/empty-state';
import { MessagesSquare } from 'lucide-react';

function TitleBar({ id, title }: { id: string; title: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(title);
  const [rename] = useRenameSessionMutation();
  const [remove] = useDeleteSessionMutation();

  const save = async () => {
    await rename({ id, title: value.trim() || title }).unwrap().catch((e) => toast.error(errorMessage(e)));
    setEditing(false);
  };
  const del = async () => {
    if (!window.confirm('Delete this conversation permanently?')) return;
    await remove(id).unwrap().then(() => router.replace('/chat')).catch((e) => toast.error(errorMessage(e)));
  };

  return (
    <div className="mb-4 flex items-center gap-2 border-b pb-4">
      {editing ? (
        <>
          <Input value={value} onChange={(e) => setValue(e.target.value)} maxLength={120} autoFocus data-testid="chat-rename-input" onKeyDown={(e) => e.key === 'Enter' && save()} />
          <Button size="icon" variant="ghost" onClick={save} data-testid="chat-rename-save"><Check /></Button>
          <Button size="icon" variant="ghost" onClick={() => setEditing(false)} data-testid="chat-rename-cancel"><X /></Button>
        </>
      ) : (
        <>
          <h1 className="flex-1 truncate text-xl font-bold" data-testid="chat-session-title">{title}</h1>
          <Button size="icon" variant="ghost" onClick={() => { setValue(title); setEditing(true); }} aria-label="Rename" data-testid="chat-rename-button"><Pencil /></Button>
          <Button size="icon" variant="ghost" onClick={del} aria-label="Delete" data-testid="chat-delete-button"><Trash2 /></Button>
        </>
      )}
    </div>
  );
}

export default function ChatSessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const dispatch = useDispatch();
  const { data, isLoading, error, refetch } = useSessionQuery(sessionId);
  const onFinished = useCallback(() => {
    refetch();
    dispatch(api.util.invalidateTags(['Sessions', 'Dashboard']));
  }, [refetch, dispatch]);
  const { send, stop, pending, error: streamError, streaming } = useChatStream(sessionId, onFinished);
  const bottomRef = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);

  // First message from the "New chat" page arrives as ?q=
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('q');
    if (q && data && !sentInitial.current) {
      sentInitial.current = true;
      window.history.replaceState(null, '', `/chat/${sessionId}`);
      send(q);
    }
  }, [data, send, sessionId]);

  // useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [data?.messages.length, pending?.assistant]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [data?.messages.length, pending?.assistant]);

  if (isLoading) return <div className="space-y-3"><Skeleton className="h-8 w-64" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>;
  if (error || !data) return <EmptyState icon={MessagesSquare} title="Conversation not found" description={errorMessage(error, 'This conversation does not exist or belongs to someone else.')} testId="chat-not-found" />;

  return (
    <div className="flex h-[calc(100vh-10rem)] flex-col" data-testid="chat-session-page">
      <TitleBar key={data.session.title} id={sessionId} title={data.session.title} />
      <div className="flex-1 space-y-5 overflow-y-auto pb-4 pr-1" data-testid="chat-messages">
        {data.messages.length === 0 && !pending && <p className="text-sm text-muted-foreground" data-testid="chat-empty-thread">Send a message to start the conversation.</p>}
        {data.messages.map((m) => <MessageBubble key={m.id} role={m.role} content={m.content} failed={m.status === 'error'} testId={`chat-message-${m.role}`} />)}
        {pending && (
          <>
            <MessageBubble role="user" content={pending.user} />
            <MessageBubble role="assistant" content={pending.assistant} testId="chat-streaming-message" />
          </>
        )}
        <div ref={bottomRef} />
      </div>
      {streamError && <Alert variant="destructive" className="mb-3" data-testid="chat-error"><AlertDescription>{streamError}</AlertDescription></Alert>}
      <Composer onSend={send} onStop={stop} busy={streaming} streaming={streaming} />
    </div>
  );
}

'use client';

import { useState } from 'react';
import { Loader2, SendHorizonal, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export const PROMPT_STARTERS = [
  'Review my resume bullet points for a senior frontend role',
  'How do I prepare for a system design interview?',
  'Help me negotiate a better salary offer',
  'Plan a career switch from QA to software development',
];

interface ComposerProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  busy: boolean;
  streaming?: boolean;
}

export function Composer({ onSend, onStop, busy, streaming }: ComposerProps) {
  const [text, setText] = useState('');
  const submit = () => {
    const value = text.trim();
    if (!value || busy) return;
    onSend(value);
    setText('');
  };
  return (
    <div className="flex items-end gap-2 rounded-xl border bg-card p-2 shadow-sm">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            submit();
          }
        }}
        maxLength={8000}
        rows={2}
        placeholder="Ask about resumes, interviews, salary or your next move… (Enter to send)"
        className="min-h-[52px] resize-none border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        data-testid="chat-input"
      />
      {streaming ? (
        <Button size="icon" variant="outline" onClick={onStop} aria-label="Stop" data-testid="chat-stop-button"><Square /></Button>
      ) : (
        <Button size="icon" onClick={submit} disabled={busy || !text.trim()} aria-label="Send" data-testid="chat-send-button">
          {busy ? <Loader2 className="animate-spin" /> : <SendHorizonal />}
        </Button>
      )}
    </div>
  );
}

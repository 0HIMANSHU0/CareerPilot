'use client';

import { useCallback, useRef, useState } from 'react';
import type { ChatMessage } from '@careerpilot/shared';

type StreamEvent =
  | { type: 'user_message'; message: ChatMessage }
  | { type: 'delta'; content: string }
  | { type: 'done'; message: ChatMessage }
  | { type: 'error'; message: string };

async function post(sessionId: string, content: string, signal: AbortSignal) {
  const init: RequestInit = { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }), signal };
  let res = await fetch(`/api/chat/sessions/${sessionId}/messages`, init);
  if (res.status === 401 && (await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })).ok) {
    res = await fetch(`/api/chat/sessions/${sessionId}/messages`, init);
  }
  return res;
}

// Streams an assistant reply over SSE (fetch + ReadableStream, since EventSource cannot POST).
// export function useChatStream(sessionId: string, onFinished: () => void) {
//   const [pending, setPending] = useState<{ user: string; assistant: string } | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const abortRef = useRef<AbortController | null>(null);

//   const send = useCallback(
//     async (content: string) => {
//       setError(null);
//       setPending({ user: content, assistant: '' });
//       const abort = new AbortController();
//       abortRef.current = abort;
//       try {
//         const res = await post(sessionId, content, abort.signal);
//         if (!res.ok || !res.body) {
//           const body = await res.json().catch(() => null);
//           throw new Error(body?.error?.message || 'The assistant is unavailable right now.');
//         }
//         const reader = res.body.getReader();
//         const decoder = new TextDecoder();
//         let buffer = '';
//         for (;;) {
//           const { done, value } = await reader.read();
//           if (done) break;
//           buffer += decoder.decode(value, { stream: true });
//           const events = buffer.split('\n\n');
//           buffer = events.pop() ?? '';
//           for (const raw of events) {
//             if (!raw.startsWith('data:')) continue;
//             const ev = JSON.parse(raw.slice(5)) as StreamEvent;
//             if (ev.type === 'delta') setPending((p) => p && { ...p, assistant: p.assistant + ev.content });
//             if (ev.type === 'error') setError(ev.message);
//           }
//         }
//       } catch (err) {
//         if (!abort.signal.aborted) setError(err instanceof Error ? err.message : 'Connection lost.');
//       } finally {
//         setPending(null);
//         onFinished();
//       }
//     },
//     [sessionId, onFinished],
//   );

//   const stop = useCallback(() => abortRef.current?.abort(), []);
//   return { send, stop, pending, error, streaming: pending !== null };
// }



export function useChatStream(sessionId: string, onFinished: () => void) {
  const [pending, setPending] = useState<{
    user: string;
    assistant: string;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const send = useCallback(
    async (content: string) => {
      // Prevent overlapping requests.
      if (abortRef.current) return;

      const abort = new AbortController();
      abortRef.current = abort;

      setError(null);
      setPending({ user: content, assistant: '' });

      try {
        const res = await post(sessionId, content, abort.signal);

        if (!res.ok || !res.body) {
          const body = await res.json().catch(() => null);
          throw new Error(
            body?.error?.message ||
            'The assistant is unavailable right now.'
          );
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();

        let buffer = '';
        let completed = false;
        let streamError: string | null = null;

        const handleEvent = (raw: string) => {
          const dataLines = raw
            .split(/\r?\n/)
            .filter((line) => line.startsWith('data:'))
            .map((line) => line.slice(5).replace(/^ /, ''));

          if (!dataLines.length) return;

          const ev = JSON.parse(dataLines.join('\n')) as StreamEvent;

          switch (ev.type) {
            case 'user_message':
              // The user message is already shown optimistically.
              break;

            case 'delta':
              setPending((p) =>
                p
                  ? { ...p, assistant: p.assistant + ev.content }
                  : p
              );
              break;

            case 'done':
              completed = true;

              // The completed server message is authoritative.
              setPending((p) =>
                p ? { ...p, assistant: ev.message.content } : p
              );
              break;

            case 'error':
              streamError = ev.message;
              break;
          }
        };

        try {
          while (true) {
            const { done, value } = await reader.read();

            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // SSE events are separated by a blank line.
            const events = buffer.split(/\r?\n\r?\n/);
            buffer = events.pop() ?? '';

            for (const raw of events) {
              if (raw.trim()) handleEvent(raw);
            }
          }

          // Flush any remaining decoder bytes.
          buffer += decoder.decode();

          // Process a final event even if the stream omitted
          // its trailing blank-line delimiter.
          if (buffer.trim()) {
            handleEvent(buffer);
          }
        } finally {
          reader.releaseLock();
        }

        if (streamError) {
          throw new Error(streamError);
        }

        if (!completed) {
          throw new Error(
            'The response stream ended before the completion event.'
          );
        }
      } catch (err) {
        if (!abort.signal.aborted) {
          setError(
            err instanceof Error ? err.message : 'Connection lost.'
          );
        }
      } finally {
        if (abortRef.current === abort) {
          abortRef.current = null;
          setPending(null);
          onFinished();
        }
      }
    },
    [sessionId, onFinished]
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    send,
    stop,
    pending,
    error,
    streaming: pending !== null,
  };
}

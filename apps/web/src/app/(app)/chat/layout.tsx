import { SessionList } from '@/components/chat/session-list';

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-6 lg:flex-row" data-testid="chat-layout">
      <SessionList />
      <section className="min-w-0 flex-1">{children}</section>
    </div>
  );
}

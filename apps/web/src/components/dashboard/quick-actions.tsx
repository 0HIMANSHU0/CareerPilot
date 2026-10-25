import Link from 'next/link';
import { ArrowUpRight, CalendarPlus, FilePlus2, MessageSquarePlus } from 'lucide-react';

const actions = [
  { href: '/chat', title: 'Ask the AI assistant', text: 'Interview prep, salary talks, career moves.', icon: MessageSquarePlus, testId: 'quick-action-chat' },
  { href: '/resumes/create', title: 'Build a resume', text: 'Structured content, two templates.', icon: FilePlus2, testId: 'quick-action-resume' },
  { href: '/consultations/book', title: 'Book an expert', text: 'Pick a slot and pay securely.', icon: CalendarPlus, testId: 'quick-action-book' },
];

export function QuickActions() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {actions.map(({ href, title, text, icon: Icon, testId }) => (
        <Link
          key={href}
          href={href}
          data-testid={testId}
          className="group flex items-start gap-4 rounded-lg border bg-card p-5 transition-colors hover:border-primary/50"
        >
          <div className="rounded-md bg-accent p-2 text-accent-foreground">
            <Icon className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="flex items-center gap-1 font-semibold">
              {title}
              <ArrowUpRight className="h-4 w-4 opacity-0 transition-opacity group-hover:opacity-100" />
            </p>
            <p className="text-sm text-muted-foreground">{text}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

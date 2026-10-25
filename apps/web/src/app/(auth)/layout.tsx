import { Bot, FileText, CalendarCheck, Quote } from 'lucide-react';

const features = [
  { icon: Bot, label: 'AI career assistant' },
  { icon: FileText, label: 'ATS-friendly resume builder' },
  { icon: CalendarCheck, label: 'Paid expert consultations' },
];

// Split auth layout: editorial panel on the left (desktop), form on the right.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden overflow-hidden bg-sidebar p-12 text-sidebar-foreground lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-primary/30 blur-3xl" />
        <p className="relative text-lg font-extrabold tracking-tight">CareerPilot</p>
        <div className="relative max-w-lg space-y-8">
          <h2 className="text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
            Plan the next move in your career with a co-pilot.
          </h2>
          <ul className="flex flex-wrap gap-2">
            {features.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-2 rounded-full border border-slate-700 bg-sidebar-muted px-3 py-1.5 text-sm">
                <Icon className="h-4 w-4 text-blue-400" /> {label}
              </li>
            ))}
          </ul>
        </div>
        <blockquote className="relative max-w-md rounded-xl border border-slate-700 bg-sidebar-muted/60 p-5 text-sm text-slate-300">
          <Quote className="mb-2 h-4 w-4 text-blue-400" />
          One honest resume review and a 60-minute session changed how I interview.
          <footer className="mt-3 text-xs font-semibold text-slate-400">Sample testimonial</footer>
        </blockquote>
      </section>
      <section className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md animate-fade-up">{children}</div>
      </section>
    </div>
  );
}

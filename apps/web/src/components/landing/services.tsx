import { SERVICES, STEPS, STEPS_IMAGE } from '@/lib/landing-content';
import { SectionHeading } from './section-heading';

export function Services() {
  return (
    <section id="services" className="scroll-mt-20 py-20" data-testid="landing-services">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <SectionHeading eyebrow="Services" title="Everything you need for your next career move" text="AI for speed, humans for depth. Use any service on its own or combine them." />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(({ icon: Icon, title, text }, i) => (
            <article key={title} className="group rounded-xl border bg-card p-6 transition-[transform,border-color] hover:-translate-y-1 hover:border-primary/50" data-testid={`service-card-${i}`}>
              <div className="mb-5 inline-flex rounded-lg bg-accent p-3 text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground"><Icon className="h-6 w-6" /></div>
              <h3 className="mb-2 text-lg font-semibold">{title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20 bg-sidebar py-20 text-sidebar-foreground" data-testid="landing-how-it-works">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-8 lg:grid-cols-2">
        <img src={STEPS_IMAGE} alt="Mentor guiding a job seeker at a laptop" className="aspect-[4/3] w-full rounded-2xl object-cover" />
        <div>
          <SectionHeading eyebrow="How it works" title="From first question to signed offer" dark />
          <ol className="space-y-6">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4" data-testid={`how-step-${i}`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary font-mono text-sm font-bold text-primary-foreground">{i + 1}</span>
                <div><h3 className="font-semibold">{s.title}</h3><p className="text-sm text-slate-400">{s.text}</p></div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

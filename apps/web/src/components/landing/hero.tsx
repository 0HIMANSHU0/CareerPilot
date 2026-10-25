import Link from 'next/link';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { HERO, STATS } from '@/lib/landing-content';
import { Button } from '@/components/ui/button';

export function Hero() {
  return (
    <section className="relative overflow-hidden" data-testid="landing-hero">
      <div className="absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-primary/15 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-4 py-16 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:py-24">
        <div className="animate-fade-up space-y-7">
          <p className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-semibold text-accent-foreground"><Sparkles className="h-3.5 w-3.5 text-primary" /> {HERO.eyebrow}</p>
          <h1 className="text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl" data-testid="landing-hero-title">{HERO.title}</h1>
          <p className="max-w-xl text-base text-muted-foreground md:text-lg">{HERO.text}</p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild data-testid="hero-get-started-button"><Link href="/register">Start for free <ArrowRight /></Link></Button>
            <Button size="lg" variant="outline" asChild data-testid="hero-explore-button"><a href="#services">Explore services</a></Button>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            {['Free AI assistant', 'Two resume templates', 'Secure payments'].map((t) => <li key={t} className="flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> {t}</li>)}
          </ul>
        </div>
        <div className="relative animate-fade-up [animation-delay:150ms]">
          <img src={HERO.image} alt="Career coach reviewing a plan with a client" className="aspect-[4/3] w-full rounded-2xl object-cover shadow-xl" data-testid="landing-hero-image" />
          <div className="absolute -bottom-6 left-6 rounded-xl border bg-card p-4 shadow-lg">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Next session</p>
            <p className="font-semibold">Interview prep with Riya</p>
            <p className="text-xs text-emerald-700">Confirmed · Meet link sent</p>
          </div>
        </div>
      </div>
      <div className="border-y bg-card">
        <dl className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-8 md:grid-cols-4" data-testid="landing-stats">
          {STATS.map((s) => (
            <div key={s.label}><dt className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</dt><dd className="font-mono text-3xl font-bold">{s.value}</dd></div>
          ))}
        </dl>
      </div>
    </section>
  );
}

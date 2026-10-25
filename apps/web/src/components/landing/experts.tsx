import Link from 'next/link';
import { ArrowRight, Quote, Star } from 'lucide-react';
import { EXPERTS, TESTIMONIALS } from '@/lib/landing-content';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SectionHeading } from './section-heading';

export function Experts() {
  return (
    <section id="experts" className="scroll-mt-20 py-20" data-testid="landing-experts">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <SectionHeading eyebrow="Experts" title="Learn from people who have hired for these roles" text="Verified career coaches with transparent hourly rates in INR." />
        <div className="grid gap-6 md:grid-cols-3">
          {EXPERTS.map((e, i) => (
            <article key={e.name} className="overflow-hidden rounded-xl border bg-card" data-testid={`expert-card-${i}`}>
              <img src={e.image} alt={e.name} className="aspect-[4/3] w-full object-cover object-top" />
              <div className="space-y-3 p-5">
                <div className="flex items-start justify-between gap-2">
                  <div><h3 className="font-semibold">{e.name}</h3><p className="text-sm text-muted-foreground">{e.role}</p></div>
                  <span className="whitespace-nowrap font-mono text-sm font-bold">{e.rate}</span>
                </div>
                <div className="flex flex-wrap gap-1">{e.tags.map((t) => <Badge key={t} variant="secondary">{t}</Badge>)}</div>
              </div>
            </article>
          ))}
        </div>
        <Button className="mt-8" variant="outline" asChild data-testid="experts-book-button"><Link href="/register">Book a session <ArrowRight /></Link></Button>
      </div>
    </section>
  );
}

export function Testimonials() {
  return (
    <section id="testimonials" className="scroll-mt-20 border-t bg-card py-20" data-testid="landing-testimonials">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <SectionHeading eyebrow="Testimonials" title="Careers that moved forward" />
        <div className="grid gap-6 md:grid-cols-3">
          {TESTIMONIALS.map((t, i) => (
            <figure key={t.name} className="flex flex-col justify-between gap-6 rounded-xl border bg-background p-6" data-testid={`testimonial-card-${i}`}>
              <div className="space-y-3">
                <div className="flex gap-0.5 text-amber-500">{[0, 1, 2, 3, 4].map((s) => <Star key={s} className="h-4 w-4 fill-current" />)}</div>
                <Quote className="h-5 w-5 text-primary" />
                <blockquote className="text-sm leading-relaxed">{t.quote}</blockquote>
              </div>
              <figcaption className="flex items-center gap-3">
                <img src={t.image} alt={t.name} className="h-11 w-11 rounded-full object-cover" />
                <div><p className="text-sm font-semibold">{t.name}</p><p className="text-xs text-muted-foreground">{t.role}</p></div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

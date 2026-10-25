import Link from 'next/link';
import { Instagram, Linkedin, Mail, MapPin, Phone, Twitter, Youtube } from 'lucide-react';
import { CONTACT, NAV_LINKS, SOCIAL_LINKS } from '@/lib/landing-content';
import { Button } from '@/components/ui/button';
import { LandingLogo } from './landing-header';

const SOCIAL_ICONS = { LinkedIn: Linkedin, Twitter, Instagram, YouTube: Youtube };

export function CallToAction() {
  return (
    <section className="py-20" data-testid="landing-cta">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-primary p-10 text-primary-foreground md:flex-row md:items-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-extrabold tracking-tight">Ready to take the controls?</h2>
            <p className="text-primary-foreground/80">Create your free account in under a minute.</p>
          </div>
          <div className="flex gap-3">
            <Button size="lg" variant="secondary" asChild data-testid="cta-register-button"><Link href="/register">Create account</Link></Button>
            <Button size="lg" variant="ghost" className="text-primary-foreground hover:bg-white/10 hover:text-primary-foreground" asChild data-testid="cta-login-button"><Link href="/login">Log in</Link></Button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer id="contact" className="scroll-mt-20 bg-sidebar text-sidebar-foreground" data-testid="landing-footer">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-8 md:grid-cols-[1.4fr_1fr_1.4fr]">
        <div className="space-y-4">
          <LandingLogo />
          <p className="max-w-xs text-sm text-slate-400">AI-powered career guidance, resumes and expert consultations.</p>
          <div className="flex gap-2">
            {SOCIAL_LINKS.map(({ label, href }) => {
              const Icon = SOCIAL_ICONS[label];
              return (
                <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={label} data-testid={`footer-social-${label.toLowerCase()}`}
                  className="rounded-lg bg-sidebar-muted p-2.5 transition-colors hover:bg-primary"><Icon className="h-4 w-4" /></a>
              );
            })}
          </div>
        </div>
        <div>
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Explore</h3>
          <ul className="space-y-2 text-sm">
            {NAV_LINKS.map((l) => <li key={l.href}><a href={l.href} className="hover:text-white" data-testid={`footer-link-${l.href.slice(1)}`}>{l.label}</a></li>)}
            <li><Link href="/login" className="hover:text-white" data-testid="footer-login-link">Log in</Link></li>
            <li><Link href="/register" className="hover:text-white" data-testid="footer-register-link">Register</Link></li>
          </ul>
        </div>
        <address className="space-y-3 text-sm not-italic" data-testid="footer-address">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-400">Contact</h3>
          <p className="font-semibold">{CONTACT.company}</p>
          <p className="flex gap-2 text-slate-300"><MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {CONTACT.address}</p>
          <p className="flex gap-2 text-slate-300"><Mail className="h-4 w-4" /> <a href={`mailto:${CONTACT.email}`} className="hover:text-white">{CONTACT.email}</a></p>
          <p className="flex gap-2 text-slate-300"><Phone className="h-4 w-4" /> {CONTACT.phone}</p>
        </address>
      </div>
      <div className="border-t border-slate-800 py-5 text-center text-xs text-slate-500">© {new Date().getFullYear()} {CONTACT.company}. All rights reserved.</div>
    </footer>
  );
}

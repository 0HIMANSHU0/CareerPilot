import { cookies } from 'next/headers';
import { LandingHeader } from '@/components/landing/landing-header';
import { Hero } from '@/components/landing/hero';
import { HowItWorks, Services } from '@/components/landing/services';
import { Experts, Testimonials } from '@/components/landing/experts';
import { CallToAction, LandingFooter } from '@/components/landing/footer';

// Public single-page landing site. The app itself starts at /login and /register.
export default function LandingPage() {
  // httpOnly cookies are readable on the server; only their presence is used, never their value.
  const store = cookies();
  const hasSession = store.has('access_token') || store.has('refresh_token');
  return (
    <div className="min-h-screen" data-testid="landing-page">
      <LandingHeader hasSession={hasSession} />
      <main>
        <Hero />
        <Services />
        <HowItWorks />
        <Experts />
        <Testimonials />
        <CallToAction />
      </main>
      <LandingFooter />
    </div>
  );
}

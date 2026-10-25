import Link from 'next/link';
import { Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center" data-testid="not-found-page">
      <Compass className="h-10 w-10 text-primary" />
      <h1 className="text-3xl font-extrabold tracking-tight">Page not found</h1>
      <p className="text-sm text-muted-foreground">The page you are looking for does not exist.</p>
      <Button asChild data-testid="not-found-home-link">
        <Link href="/">Go home</Link>
      </Button>
    </div>
  );
}

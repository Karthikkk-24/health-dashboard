import { SignUp } from '@clerk/nextjs';
import { Activity } from 'lucide-react';
import { ThemeToggle } from '@/components/theme/ThemeToggle';

export default function SignUpPage() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-background px-4 text-text">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="mb-6 flex items-center gap-2 text-lg font-semibold">
        <Activity className="h-5 w-5 text-accent" strokeWidth={1.5} />
        Health Dashboard
      </div>
      <SignUp
        routing="path"
        path="/sign-up"
        signInUrl="/sign-in"
        forceRedirectUrl="/dashboard"
      />
    </div>
  );
}

import { SignIn } from '@clerk/nextjs';
import { Activity } from 'lucide-react';

export default function SignInPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-6 flex items-center gap-2 text-lg font-semibold">
        <Activity className="h-5 w-5 text-accent" />
        Health Dashboard
      </div>
      <SignIn
        routing="path"
        path="/sign-in"
        signUpUrl="/sign-up"
        forceRedirectUrl="/dashboard"
      />
    </div>
  );
}

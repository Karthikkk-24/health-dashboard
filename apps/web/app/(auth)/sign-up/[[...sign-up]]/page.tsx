import { SignUp } from '@clerk/nextjs';
import { Activity } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="mb-6 flex items-center gap-2 text-lg font-semibold">
        <Activity className="h-5 w-5 text-accent" />
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

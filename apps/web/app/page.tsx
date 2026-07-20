import Link from 'next/link';
import { FileUp, LineChart, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LandingHeader } from '@/components/layout/LandingHeader';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-text">
      <LandingHeader />

      <section className="hero-glow relative overflow-hidden px-6 pb-24 pt-16">
        <div className="particle pointer-events-none absolute left-[12%] top-24 h-40 w-40 rounded-full bg-accent/20 blur-3xl" />
        <div className="particle pointer-events-none absolute right-[18%] top-40 h-52 w-52 rounded-full bg-accent-glow/10 blur-3xl [animation-delay:2s]" />
        <div className="relative mx-auto max-w-4xl text-center">
          <p className="mb-4 text-sm font-medium uppercase tracking-[0.2em] text-accent-glow">
            Personal health analytics
          </p>
          <h1 className="text-4xl font-semibold tracking-tight md:text-6xl">
            Your Health, Visualized
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-base text-muted md:text-lg">
            Upload medical PDFs, extract lab metrics with AI, understand risks,
            and compare reports over time — all in one calm, clinical dashboard.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href="/sign-up">
              <Button>Get Started</Button>
            </Link>
            <Link href="/sign-in">
              <Button variant="secondary">Sign In</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
        {[
          {
            icon: FileUp,
            title: 'Upload Any Report',
            body: 'Drop lab PDFs and attach the report date so progress stays comparable.',
          },
          {
            icon: Sparkles,
            title: 'AI-Powered Analysis',
            body: 'Gemini extracts metrics, flags risks, and summarizes clinical findings.',
          },
          {
            icon: LineChart,
            title: 'Track Progress Over Time',
            body: 'Charts and comparisons show what improved, declined, or stayed stable.',
          },
        ].map((feature) => (
          <div
            key={feature.title}
            className="rounded-2xl border border-border bg-surface p-6 card-glow"
          >
            <feature.icon
              className="mb-4 h-6 w-6 text-accent"
              strokeWidth={1.5}
            />
            <h2 className="text-lg font-semibold">{feature.title}</h2>
            <p className="mt-2 text-sm text-muted">{feature.body}</p>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="overflow-hidden rounded-3xl border border-border bg-surface2 p-6 md:p-10">
          <p className="text-sm uppercase tracking-[0.18em] text-muted">
            Dashboard preview
          </p>
          <h2 className="mt-2 text-2xl font-semibold">
            Charts, risks, and report history in one place
          </h2>
          <div className="mt-8 grid gap-4 md:grid-cols-4">
            {['Reports', 'Health score', 'Last report', 'This month'].map(
              (label) => (
                <div
                  key={label}
                  className="rounded-2xl border border-border bg-surface p-4"
                >
                  <p className="text-xs text-muted">{label}</p>
                  <p className="mt-2 font-mono text-2xl font-bold text-accent-glow">
                    —
                  </p>
                </div>
              ),
            )}
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="h-48 rounded-2xl border border-border bg-gradient-to-br from-accent/10 to-transparent" />
            <div className="h-48 rounded-2xl border border-border bg-gradient-to-br from-success/10 to-transparent" />
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-6 py-8 text-center text-sm text-muted">
        © {new Date().getFullYear()} Health Dashboard
      </footer>
    </div>
  );
}

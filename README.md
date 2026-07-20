# Health Dashboard

Personal health analytics platform — upload medical PDFs, get AI-powered insights, and track progress across reports.

## Stack

- **Web:** Next.js 15 (App Router), Tailwind CSS v4, Clerk, Recharts
- **API:** NestJS, Supabase (Postgres + Storage), Gemini, Clerk JWT auth
- **Monorepo:** pnpm workspaces (`apps/web`, `apps/api`)

## Prerequisites

- Node.js 20+
- pnpm 10+
- Clerk application keys
- Supabase project (`health-dashboard`)
- Google Gemini API key

## Environment

Copy placeholders from `.env.example`.

### `apps/web/.env.local`

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### `apps/api/.env`

```env
CLERK_SECRET_KEY=
CLERK_PUBLISHABLE_KEY=
CLERK_WEBHOOK_SECRET=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

## Setup

```bash
pnpm install
pnpm --filter @health-dashboard/api start:dev
pnpm --filter @health-dashboard/web dev
```

- Web: http://localhost:3000
- API: http://localhost:3001/api/v1

## Clerk webhook (optional but recommended)

1. Clerk Dashboard → Webhooks → Add endpoint
2. URL: `https://<your-api-host>/api/v1/users/sync`
3. Events: `user.created`, `user.updated`
4. Paste signing secret into `CLERK_WEBHOOK_SECRET`

The API also upserts the user on first authenticated request, so local development works without a webhook.

## Key flows

1. Register / sign in with Clerk
2. Upload a PDF + report date on `/upload`
3. Poll processing status until analysis completes
4. Review charts on `/dashboard`, details on `/reports`
5. Compare two completed reports for progress diffs

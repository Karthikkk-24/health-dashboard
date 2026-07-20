# Health Dashboard — Cursor AI Development Rules

You are a **principal-level full-stack engineer** with deep expertise in Next.js, NestJS,
TypeScript, Supabase, Clerk, and healthcare data systems. You write production-grade code
with a security-first mindset, pixel-perfect UI, and zero tolerance for incomplete flows.

You do not stop. You do not ask "should I continue?" You complete the application fully.

---

## THE PRIME DIRECTIVE — AUTONOMOUS LOOPING DEVELOPMENT

This is a **looping, self-healing development process**. You do not stop at "feature complete."
After every development pass, you enter a review loop automatically. You only stop when ALL
of the following conditions are simultaneously true:

1. Every page renders without runtime errors
2. Every user flow works end-to-end (auth → dashboard → upload → analysis → comparison)
3. All NestJS API endpoints return correct responses with proper status codes
4. All Supabase RLS policies are active and tested
5. All Clerk auth flows work (register, login, logout, profile, session expiry)
6. PDF upload, parsing, and AI analysis pipeline works completely
7. Report comparison between two uploads works with visible diff/progress UI
8. All charts render with real data, not mock placeholders
9. UI is polished, responsive (mobile + desktop), and pixel-perfect
10. Zero `console.error`, zero unhandled promise rejections, zero TypeScript errors

**After completing any task block**, run this loop:
```
LOOP START
  → Scan every file in the codebase for: TypeScript errors, missing imports,
    broken API calls, incomplete UI states, missing error boundaries,
    hardcoded values, TODO comments, and missing environment variable checks
  → Fix every issue found
  → Re-scan to confirm fixes did not introduce new issues
  → If any issue remains → return to top of LOOP
  → If zero issues remain → proceed to next feature block
LOOP END
```

Do not ask for permission to continue. Do not pause for confirmation.
Fix → Verify → Continue.

---

## Application Overview

**Name:** Health Dashboard
**Stack:** Next.js 15 (App Router) + NestJS + TypeScript + Tailwind CSS + Supabase + Clerk
**Purpose:** Personal health analytics platform — upload medical PDFs, get AI-powered
health insights, track progress across multiple reports over time.

---

## Project Structure

```
health-dashboard/
├── apps/
│   ├── web/                          # Next.js frontend
│   │   ├── app/
│   │   │   ├── (auth)/               # Public auth routes
│   │   │   │   ├── sign-in/[[...sign-in]]/page.tsx
│   │   │   │   └── sign-up/[[...sign-up]]/page.tsx
│   │   │   ├── (marketing)/          # Public landing page
│   │   │   │   └── page.tsx          # Landing page
│   │   │   ├── (dashboard)/          # Protected app routes
│   │   │   │   ├── layout.tsx        # Sidebar + Navbar shell
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── upload/page.tsx
│   │   │   │   ├── reports/page.tsx
│   │   │   │   ├── stats/page.tsx
│   │   │   │   └── settings/page.tsx
│   │   │   ├── layout.tsx            # Root layout with ClerkProvider
│   │   │   └── globals.css
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── Navbar.tsx
│   │   │   │   └── ProfileDropdown.tsx
│   │   │   ├── charts/
│   │   │   │   ├── BloodPressureChart.tsx
│   │   │   │   ├── CholesterolChart.tsx
│   │   │   │   ├── GlucoseChart.tsx
│   │   │   │   ├── HealthScoreCard.tsx
│   │   │   │   └── TrendChart.tsx
│   │   │   ├── upload/
│   │   │   │   ├── UploadZone.tsx
│   │   │   │   ├── UploadProgress.tsx
│   │   │   │   └── ReportDatePicker.tsx
│   │   │   ├── reports/
│   │   │   │   ├── ReportCard.tsx
│   │   │   │   ├── ComparisonView.tsx
│   │   │   │   └── RiskBadge.tsx
│   │   │   └── ui/                   # Reusable primitives
│   │   ├── lib/
│   │   │   ├── supabase/
│   │   │   │   ├── client.ts         # Browser Supabase client
│   │   │   │   └── server.ts         # Server Supabase client
│   │   │   └── api.ts                # NestJS API client
│   │   ├── middleware.ts              # Clerk route protection
│   │   └── types/
│   │       └── health.ts             # Shared TypeScript types
│   └── api/                          # NestJS backend
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── health/
│       │   │   ├── health.module.ts
│       │   │   ├── health.controller.ts
│       │   │   ├── health.service.ts
│       │   │   └── dto/
│       │   ├── reports/
│       │   │   ├── reports.module.ts
│       │   │   ├── reports.controller.ts
│       │   │   ├── reports.service.ts
│       │   │   └── dto/
│       │   ├── pdf/
│       │   │   ├── pdf.module.ts
│       │   │   ├── pdf.service.ts    # PDF parsing + AI extraction
│       │   │   └── pdf.types.ts
│       │   ├── auth/
│       │   │   ├── clerk.guard.ts    # Clerk JWT verification guard
│       │   │   └── clerk.strategy.ts
│       │   └── supabase/
│       │       ├── supabase.module.ts
│       │       └── supabase.service.ts
│       └── test/
```

---

## Environment Variables

### Next.js Web App — `.env.local`
```env
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...       # From Clerk Dashboard → API Keys
CLERK_SECRET_KEY=sk_test_...                         # From Clerk Dashboard → API Keys
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
CLERK_WEBHOOK_SECRET=whsec_...                       # From Clerk Dashboard → Webhooks

# Supabase — health-dashboard project
NEXT_PUBLIC_SUPABASE_URL=https://[project-ref].supabase.co   # From Supabase → Settings → API
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...                          # From Supabase → Settings → API
SUPABASE_SERVICE_ROLE_KEY=eyJ...                              # From Supabase → Settings → API (keep secret, server only)

# NestJS API
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### NestJS API — `.env`
```env
# Clerk
CLERK_SECRET_KEY=sk_test_...
CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Supabase
SUPABASE_URL=https://[project-ref].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...           # Service role for backend — full DB access

# AI (for PDF analysis)
GEMINI_API_KEY=...                          # Google AI Studio → Get API Key (free tier)
# OR
OPENAI_API_KEY=sk-...                       # OpenAI Platform (if preferred)

# App
PORT=3001
NODE_ENV=development
ALLOWED_ORIGINS=http://localhost:3000
```

### Where to Get Each Key
- **Clerk keys**: https://dashboard.clerk.com → Select your app → API Keys
- **Clerk webhook secret**: Clerk Dashboard → Webhooks → Add endpoint → copy signing secret
- **Supabase URL + Anon key**: https://supabase.com/dashboard → health-dashboard project → Settings → API
- **Supabase Service Role key**: Same page, below Anon key — NEVER expose in browser
- **Gemini API key**: https://aistudio.google.com/app/apikey (free, generous quota)

---

## Supabase Database Schema

Run these migrations in Supabase SQL Editor in order:

```sql
-- 1. Users table (synced from Clerk via webhook)
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Health reports table
CREATE TABLE public.health_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  report_date DATE NOT NULL,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  processing_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  raw_text TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Health metrics extracted from PDFs
CREATE TABLE public.health_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.health_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  metric_unit TEXT,
  metric_category TEXT NOT NULL,
  reference_min NUMERIC,
  reference_max NUMERIC,
  status TEXT CHECK (status IN ('normal', 'low', 'high', 'critical')),
  recorded_at DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AI analysis results
CREATE TABLE public.health_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.health_reports(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  overall_health_score INTEGER CHECK (overall_health_score BETWEEN 0 AND 100),
  summary TEXT,
  risks JSONB DEFAULT '[]',
  current_issues JSONB DEFAULT '[]',
  potential_issues JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  positive_indicators JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Report comparisons
CREATE TABLE public.report_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  report_a_id UUID NOT NULL REFERENCES public.health_reports(id),
  report_b_id UUID NOT NULL REFERENCES public.health_reports(id),
  comparison_data JSONB NOT NULL,
  overall_trend TEXT CHECK (overall_trend IN ('improved', 'declined', 'stable')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Indexes
CREATE INDEX idx_health_reports_user_id ON public.health_reports(user_id);
CREATE INDEX idx_health_reports_report_date ON public.health_reports(report_date DESC);
CREATE INDEX idx_health_metrics_report_id ON public.health_metrics(report_id);
CREATE INDEX idx_health_metrics_user_id ON public.health_metrics(user_id);
CREATE INDEX idx_health_metrics_category ON public.health_metrics(metric_category);
CREATE INDEX idx_health_analyses_report_id ON public.health_analyses(report_id);

-- 7. Row Level Security — Enable on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_comparisons ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies — users can only see their own data
-- Note: Clerk user ID must be passed as a custom JWT claim or via service role
-- Backend uses service role key, so RLS is enforced at application layer for API calls
-- Direct Supabase client calls from frontend use anon key with these policies

CREATE POLICY "Users see own profile" ON public.users
  FOR ALL USING (clerk_id = current_setting('request.jwt.claims', true)::json->>'sub');

CREATE POLICY "Users see own reports" ON public.health_reports
  FOR ALL USING (user_id IN (
    SELECT id FROM public.users
    WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  ));

CREATE POLICY "Users see own metrics" ON public.health_metrics
  FOR ALL USING (user_id IN (
    SELECT id FROM public.users
    WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  ));

CREATE POLICY "Users see own analyses" ON public.health_analyses
  FOR ALL USING (user_id IN (
    SELECT id FROM public.users
    WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  ));

CREATE POLICY "Users see own comparisons" ON public.report_comparisons
  FOR ALL USING (user_id IN (
    SELECT id FROM public.users
    WHERE clerk_id = current_setting('request.jwt.claims', true)::json->>'sub'
  ));

-- 9. Storage bucket for PDF uploads
-- Run in Supabase Dashboard → Storage → Create bucket
-- Bucket name: health-reports
-- Private: true (no public access)
-- Max file size: 20MB
-- Allowed MIME types: application/pdf
```

### Supabase Storage Setup
1. Go to **Storage** in your Supabase health-dashboard project
2. Click **New bucket**
3. Name: `health-reports`
4. Toggle: **Private** (not public)
5. Under bucket policies, add:
```sql
-- Only the owning user can upload/read their own files
CREATE POLICY "Users upload own reports" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'health-reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users read own reports" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'health-reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own reports" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'health-reports' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Design System

### Color Palette (Tailwind custom config)
```js
// tailwind.config.ts
colors: {
  background: '#0a0f1e',       // Deep navy — main background
  surface: '#111827',           // Card backgrounds
  surface2: '#1a2236',          // Elevated surfaces, sidebar
  border: '#1f2d45',            // Subtle borders
  accent: '#3b82f6',            // Primary blue (Tailwind blue-500)
  'accent-glow': '#60a5fa',     // Lighter blue for hover/glow
  success: '#10b981',           // Green for good metrics
  warning: '#f59e0b',           // Amber for borderline metrics
  danger: '#ef4444',            // Red for critical/high risk
  muted: '#64748b',             // Secondary text
  text: '#f1f5f9',              // Primary text
}
```

### Typography
- Display: `Inter` (clean, medical-grade readability)
- Mono: `JetBrains Mono` (for metric values and numbers)
- Import via `next/font/google`

### Component Style Rules
- All cards: `bg-surface rounded-2xl border border-border p-6`
- All inputs: `bg-surface2 border border-border rounded-xl px-4 py-3 text-text focus:ring-2 focus:ring-accent focus:border-transparent`
- All buttons primary: `bg-accent hover:bg-accent-glow text-white rounded-xl px-6 py-3 font-semibold transition-all duration-200`
- Shadows: `shadow-[0_0_30px_rgba(59,130,246,0.08)]` for ambient blue glow on cards
- Sidebar width: `w-64` collapsed on mobile, `w-20` icon-only mode on md
- Charts: Use Recharts with custom dark theme matching the color palette
- All metric numbers: `font-mono text-2xl font-bold`

---

## Page-by-Page Specifications

### 1. Landing Page `/`
- Hero section: Full-screen dark gradient, headline "Your Health, Visualized", subheadline, CTA buttons (Get Started → `/sign-up`, Sign In → `/sign-in`)
- Features section: 3-column grid — "Upload Any Report", "AI-Powered Analysis", "Track Progress Over Time"
- Demo section: Static screenshot/mockup of the dashboard
- Footer: minimal, copyright only
- **No auth required — fully public**
- Animate hero with subtle floating particles or gradient animation using CSS

### 2. Sign In Page `/sign-in`
- Centered card on dark background
- Use Clerk's `<SignIn />` component with custom appearance matching the design system
- Logo + app name above the card

### 3. Sign Up Page `/sign-up`
- Same layout as sign-in
- Use Clerk's `<SignUp />` component
- After registration, redirect to `/dashboard`
- Trigger Clerk webhook → create user record in Supabase

### 4. Dashboard Layout (all protected pages)
**Sidebar (left, fixed):**
- Logo at top
- Navigation items with icons:
  - Dashboard (Home icon)
  - Upload (Upload icon)
  - Reports (FileText icon)
  - Stats (BarChart icon)
  - Settings (Settings icon)
- Active state: `bg-accent/10 text-accent border-r-2 border-accent`
- User avatar + name at the bottom
- Collapsible on mobile (slide-in drawer)

**Navbar (top, fixed):**
- Page title (dynamic, based on current route)
- Right side: notification bell + user avatar
- Avatar click → dropdown with: Profile, Settings, divider, Sign Out
- Dropdown uses `@headlessui/react` or custom Tailwind implementation

### 5. Dashboard Page `/dashboard`
**Top row — 4 stat cards:**
- Total Reports Uploaded
- Latest Health Score (0–100, colored by range)
- Last Report Date
- Reports This Month

**Main charts row:**
- Blood Pressure trend (LineChart — systolic + diastolic lines, last 6 reports)
- Cholesterol breakdown (BarChart — LDL, HDL, Total, Triglycerides)

**Second charts row:**
- Glucose levels over time (AreaChart with reference range band)
- Health Score trend (LineChart showing score improvement/decline)

**Bottom section:**
- Latest report summary card (AI-generated text)
- Quick risk indicators (color-coded badges: Low / Moderate / High / Critical)
- "View Full Report" button → navigate to reports page

### 6. Upload Page `/upload`
**Upload Zone:**
- Large dashed-border drag-and-drop area
- PDF file only (validate on client before sending)
- Max 20MB (show error if exceeded)
- Show file name + size preview after selection
- Progress bar during upload (real, not fake)

**Report Date Picker:**
- Date input for "Report Date" (the date the medical test was conducted, not upload date)
- Default: today's date
- Required field — cannot upload without it

**Upload Flow:**
1. User drops/selects PDF + picks report date
2. Client validates file type and size
3. Client uploads PDF to Supabase Storage via the NestJS API (not directly from browser)
4. NestJS receives the file, uploads to Supabase Storage, stores record in DB
5. NestJS triggers async PDF processing job
6. Frontend polls `/reports/:id/status` every 3 seconds and shows live status
7. On completion: show success state with link to view the analysis

**Processing status states:**
- `pending` → "Queued for analysis..."
- `processing` → "Reading your report..." (animated spinner)
- `completed` → "Analysis ready!" (green check, link to report)
- `failed` → "Processing failed" (red, retry button)

**Past Uploads section (below upload zone):**
- List of all previously uploaded reports
- Each row: file name, report date, upload date, status badge, action buttons (View, Delete)

### 7. Reports Page `/reports`
**Report list with filtering:**
- Filter by date range, sort by report date or upload date
- Each report card: date, health score, top 3 risk flags, "View Analysis" button

**Individual Report View (modal or nested route):**
- Full AI analysis: summary paragraph, health score circle, categorized metrics table
- Risk section: color-coded list of identified risks
- Recommendations section
- Positive indicators section
- Download original PDF button

**Report Comparison (when 2+ reports exist):**
- "Compare Reports" button at top
- Select Report A and Report B from dropdowns
- Side-by-side metric comparison table: metric name | old value | new value | change arrow + %
- Overall trend banner: "Health Improved" / "Health Declined" / "Stable"
- Per-metric change indicators: ↑ green (improved), ↓ red (worsened), → gray (stable)
- AI-generated comparison narrative paragraph

### 8. Stats Page `/stats`
- Comprehensive charts for all extracted health metrics over time
- Filterable by metric category (Blood, Cardiovascular, Metabolic, etc.)
- Date range picker
- Table view toggle alongside chart view

### 9. Settings Page `/settings`
- Profile section: name, email (from Clerk, read-only)
- Notification preferences (stored in Supabase user record)
- Delete all data (with confirmation modal)
- Danger zone with red border

---

## NestJS API Endpoints

### Authentication
All protected routes require `Authorization: Bearer <clerk_jwt>` header.
Use a `ClerkAuthGuard` that verifies the JWT using Clerk's JWKS endpoint.

### Endpoints

```
POST   /api/v1/users/sync          # Webhook from Clerk — create/update user in Supabase
GET    /api/v1/users/me            # Get current user profile

POST   /api/v1/reports/upload      # Upload PDF + report date, trigger processing
GET    /api/v1/reports             # List all reports for current user
GET    /api/v1/reports/:id         # Get single report with analysis
GET    /api/v1/reports/:id/status  # Poll processing status
DELETE /api/v1/reports/:id         # Delete report + all associated data

GET    /api/v1/metrics             # All metrics for current user (with filters)
GET    /api/v1/metrics/categories  # List of metric categories found in user's data

POST   /api/v1/comparisons         # Create comparison between two reports
GET    /api/v1/comparisons/:id     # Get comparison result

GET    /api/v1/dashboard           # Aggregated dashboard data (all charts, summary stats)
```

---

## PDF Processing Pipeline (NestJS)

```
PDF received
    ↓
Store raw file in Supabase Storage (health-reports bucket)
    ↓
Update report status → 'processing'
    ↓
Extract text from PDF (use pdf-parse npm package)
    ↓
Send extracted text to Gemini API with structured prompt:
  "You are a medical data extraction expert. Extract ALL health metrics from this
   report text. Return ONLY valid JSON in this exact schema: {metrics: [], summary: '',
   risks: [], current_issues: [], potential_issues: [], recommendations: [],
   positive_indicators: [], overall_health_score: 0}"
    ↓
Parse Gemini response → validate JSON schema
    ↓
Insert metrics into health_metrics table (one row per metric)
Insert analysis into health_analyses table
    ↓
Update report status → 'completed'
    ↓
If any step fails → update status → 'failed', log full error with context
```

### Gemini Prompt for Health Extraction
```
System: You are an expert medical data analyst. Your task is to extract all health
metrics and provide clinical analysis from the provided medical report text.
You must respond ONLY with valid JSON. No preamble, no markdown, no backticks.

Extract: patient vitals, blood test results, cholesterol levels, glucose, CBC,
liver function, kidney function, thyroid, hormones, urine analysis, and any other
medical metrics present.

For each metric, classify its status as: normal, low, high, or critical based on
standard medical reference ranges.

For risks, list specific, actionable medical risks identified from the data.
For recommendations, be specific and practical.
Overall health score: 0-100 where 0=critical, 50=borderline, 100=optimal.

JSON Schema:
{
  "metrics": [
    {
      "name": "string",
      "value": number,
      "unit": "string",
      "category": "string",
      "reference_min": number | null,
      "reference_max": number | null,
      "status": "normal|low|high|critical"
    }
  ],
  "summary": "string (2-3 paragraph clinical summary)",
  "risks": ["string"],
  "current_issues": ["string"],
  "potential_issues": ["string"],
  "recommendations": ["string"],
  "positive_indicators": ["string"],
  "overall_health_score": number
}
```

---

## Code Quality Standards

### TypeScript
- `strict: true` in tsconfig — no exceptions
- Every function has explicit parameter and return types
- No `any` — use `unknown` and type guards instead
- Use `zod` for all runtime validation (API request bodies, Gemini response parsing)
- Define shared types in `types/health.ts` and import everywhere

### Error Handling
- Every async function is wrapped in try/catch
- Custom exception classes per domain (`ReportNotFoundException`, `PDFProcessingException`)
- NestJS global exception filter returns consistent error shape:
  `{ error: { code: string, message: string, requestId: string } }`
- Frontend shows user-friendly error states for every possible failure

### Component Rules
- Every component that fetches data has: loading state, error state, empty state, data state
- No hardcoded strings visible to users — use constants
- All forms have: validation, loading state during submission, success/error feedback
- All modals are accessible (focus trap, ESC to close, aria labels)

### Security
- Validate Clerk webhook signature on every webhook call (use `svix` package)
- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the browser
- Validate PDF MIME type server-side (not just extension check)
- Rate limit upload endpoint (max 10 uploads per hour per user)
- Sanitize all text extracted from PDFs before storing or rendering

---

## What "Done" Looks Like — Final Verification Checklist

Run through every item before considering any feature complete:

### Auth
- [ ] New user can register → lands on dashboard → user record created in Supabase
- [ ] Existing user can sign in → session persists across page refresh
- [ ] Sign out → redirected to landing page → protected routes inaccessible
- [ ] Unauthenticated users hitting `/dashboard` → redirected to `/sign-in`

### Upload
- [ ] Non-PDF file → client-side error shown, upload blocked
- [ ] File over 20MB → error shown, upload blocked
- [ ] Valid PDF + date → uploads successfully → processing status visible
- [ ] Processing completes → analysis appears automatically (via polling)
- [ ] Processing fails → error state shown with retry option
- [ ] Uploaded file appears in the past uploads list immediately

### Dashboard
- [ ] All 4 stat cards show real data from Supabase
- [ ] All charts render with actual extracted metrics
- [ ] Empty state shown correctly when user has no reports yet

### Reports
- [ ] Full AI analysis visible for each completed report
- [ ] Health score displays correctly with appropriate color
- [ ] Risks and recommendations are visible and legible
- [ ] With 2+ reports: comparison view accessible and working
- [ ] Comparison shows per-metric change with direction and percentage
- [ ] Comparison AI narrative is generated and visible

### UI/UX
- [ ] Sidebar navigation works on desktop
- [ ] Sidebar collapses to drawer on mobile (hamburger menu)
- [ ] Navbar profile dropdown opens, closes on outside click
- [ ] Sign out from dropdown works
- [ ] All pages are responsive at 375px, 768px, and 1280px
- [ ] No layout overflow or horizontal scroll on any page
- [ ] Loading skeletons visible while data fetches
- [ ] All empty states have helpful messages and call-to-action

### Performance & Reliability
- [ ] Zero TypeScript compile errors
- [ ] Zero console.error in browser on any user flow
- [ ] All API calls have timeout handling
- [ ] PDF processing failure does not crash the server
- [ ] Concurrent uploads from the same user are handled correctly

---

## Development Order

Follow this sequence. Do not skip ahead. Complete each block and run the verification
loop before moving to the next.

```
Block 1: Project Setup
  → Initialize Next.js + NestJS monorepo
  → Install all dependencies
  → Configure TypeScript strict mode in both apps
  → Set up Tailwind with custom design tokens
  → Configure environment variables
  → Set up Clerk provider in Next.js root layout
  → Set up middleware.ts to protect /dashboard routes
  → Create .env.local and .env with all required keys (documented above)
  [LOOP: verify builds, no errors, middleware blocks unauthenticated access]

Block 2: Auth Pages
  → Landing page with hero, features, CTA
  → Sign-in page with Clerk component + custom appearance
  → Sign-up page with Clerk component + custom appearance
  → Clerk webhook endpoint in NestJS → create user in Supabase
  [LOOP: full auth flow works end-to-end]

Block 3: Dashboard Shell
  → Sidebar component with navigation and active states
  → Navbar with profile dropdown
  → Protected route layout wrapping all dashboard pages
  → Placeholder pages for each route
  [LOOP: navigation works, layout is correct, auth protection works]

Block 4: Supabase Schema
  → Run all migrations in SQL editor
  → Set up RLS policies
  → Create storage bucket and policies
  → Set up Supabase clients in Next.js (client + server)
  → Set up Supabase service in NestJS
  [LOOP: can read/write all tables, storage uploads work]

Block 5: Upload Feature
  → Upload zone component (drag and drop)
  → Report date picker
  → NestJS upload endpoint (receive file, store in Supabase Storage)
  → PDF text extraction (pdf-parse)
  → Gemini integration for health data extraction
  → Store metrics and analysis in Supabase
  → Status polling from frontend
  → Past uploads list with real data
  [LOOP: full upload-to-analysis flow works with a real PDF]

Block 6: Dashboard Charts
  → Fetch real data from NestJS /dashboard endpoint
  → Blood pressure LineChart
  → Cholesterol BarChart
  → Glucose AreaChart
  → Health score trend chart
  → Stat cards with real numbers
  → Latest report summary
  → Risk badges
  [LOOP: all charts render with real data, empty states work]

Block 7: Reports & Comparison
  → Reports list with real data
  → Individual report view with full analysis
  → Report comparison feature
  → Comparison narrative
  [LOOP: comparison works correctly with 2 real reports]

Block 8: Stats Page
  → All metrics over time charts
  → Category filtering
  → Date range filtering
  [LOOP: stats page shows comprehensive data]

Block 9: Settings Page
  → Profile display
  → Preferences
  → Delete all data flow with confirmation
  [LOOP: settings work correctly]

Block 10: Polish & QA
  → Responsive layout audit (mobile, tablet, desktop)
  → All loading states
  → All error states
  → All empty states
  → Animation and transitions
  → Accessibility audit (keyboard nav, focus states, aria)
  → Final full-app walkthrough
  [LOOP: every checklist item above is green]
```

---

## Never Do

- Never leave a `TODO` or `FIXME` in committed code
- Never use `any` TypeScript type
- Never expose service role key to the browser
- Never trust PDF content without sanitizing before storing or rendering
- Never skip the status polling — user must always know what's happening
- Never return database errors or stack traces to the API client
- Never use `console.log` in production code paths — use the Logger service
- Never render a chart with empty/undefined data — always show empty state
- Never allow duplicate report uploads (same file hash + same date = block)
- Never delete a health report without first confirming in a modal
- Never stop development mid-feature — complete it, then loop
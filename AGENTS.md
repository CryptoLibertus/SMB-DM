# Agent Team — SMB-DM Platform Build

**Project:** SMB-DM Website Refresh & Growth Platform
**Source:** [PRD.md](./PRD.md) v1.0
**Date:** Feb 6, 2026

---

## Team Overview

7 agents organized by domain ownership. Each agent owns a vertical slice of the system with clear interfaces to other agents. The Lead/Architect agent runs first to establish shared foundations; remaining agents can parallelize where dependencies allow.

```
                        ┌──────────────┐
                        │     Lead     │
                        │  /Architect  │
                        └──────┬───────┘
                               │ Phase 0: foundation, schema, shared types
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
     ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
     │    Audit    │   │  Frontend   │   │   Billing   │
     │   Engine    │   │     UI      │   │ & Lifecycle │
     └──────┬──────┘   └──────┬──────┘   └──────┬──────┘
            │                 │                  │
     ┌──────▼──────┐         │           ┌──────▼──────┐
     │     AI      │─────────┘           │  Content    │
     │ Generation  │                     │  & Email    │
     └─────────────┘                     └──────┬──────┘
                                                │
                                         ┌──────▼──────┐
                                         │  Analytics  │
                                         └─────────────┘
```

---

## Agent 0: Lead / Architect

**Owner of:** Phase 0 — Foundation
**PRD Sections:** 8.2 (Stack), 9 (Data Model), 8.4 (API Routes)

### Responsibilities

1. Initialize Next.js 14+ App Router project with TypeScript
2. Configure Vercel project settings, environment variables, CI/CD
3. Set up Drizzle ORM + Vercel Postgres (Neon) connection
4. **Define and migrate the full database schema** (all 10 entities from PRD Section 9.2)
5. Create shared TypeScript types/enums matching the data model
6. Stub all API route files from PRD Section 8.4 (handler signature + TODO body)
7. Set up Auth.js with email-based authentication
8. Configure Vercel AI SDK with Anthropic + OpenAI providers
9. Set up PostHog project and client initialization
10. Set up Resend client for outbound email
11. Set up Stripe client with test mode keys
12. Establish project conventions: file structure, naming, error handling patterns

### Outputs (consumed by all other agents)

| Output | Location | Consumed By |
|--------|----------|-------------|
| DB schema + migrations | `src/db/schema.ts` | All agents |
| Shared types/enums | `src/types/` | All agents |
| API route stubs | `src/app/api/` | All agents |
| Auth config | `src/lib/auth.ts` | Frontend, Billing |
| AI SDK config | `src/lib/ai.ts` | Audit, AI Gen, Content |
| Stripe client | `src/lib/stripe.ts` | Billing |
| PostHog client | `src/lib/posthog.ts` | Analytics, Frontend |
| Resend client | `src/lib/email.ts` | Billing, Content, Analytics |
| DB client + helpers | `src/lib/db.ts` | All agents |

### Definition of Done

- [ ] `npm run dev` starts cleanly
- [ ] Database schema migrated to Vercel Postgres (dev)
- [ ] All API route files exist with typed request/response signatures
- [ ] Stripe test webhook endpoint receives events
- [ ] Auth.js login/logout flow works
- [ ] Environment variables documented in `.env.example`

---

## Agent 1: Audit Engine

**Owner of:** Phase 1 — Audit Engine
**PRD Sections:** 4.1, 3.1 (audit stages), 3.2 (live demo audit)

### Responsibilities

1. Build serverless Puppeteer crawler using `@sparticuz/chromium`
2. Implement SEO analysis: title, meta description, H1/H2 structure, robots.txt, keywords
3. Implement mobile compatibility check: viewport meta, responsive styles
4. Implement analytics detection: GA4, GTM, other tags
5. Implement CTA detection: phone numbers, tel: links, forms, mailto:, buttons
6. Implement DNS/hosting detection: WHOIS lookup, nameserver detection, switchability check
7. Integrate PageSpeed Insights API for Lighthouse scores
8. Capture desktop + mobile screenshots, store in Vercel Blob Storage
9. Implement SSE streaming for multi-stage progress (`/api/audit/[id]/status`)
10. Produce structured JSON output matching `AuditResult` schema
11. Handle error states: URL unreachable, timeout, blocked — return partial results

### API Routes Owned

| Route | Method | Notes |
|-------|--------|-------|
| `/api/audit` | POST | Accept URL, create AuditResult record, start pipeline |
| `/api/audit/[id]/status` | GET | SSE stream: stages 1–4 progress + partial results |

### Inputs

| From | What |
|------|------|
| Lead | DB schema (`AuditResult` entity), Vercel Blob client, API route stub |

### Outputs

| Output | Schema | Consumed By |
|--------|--------|-------------|
| `AuditResult` record | `{seoScore, mobileScore, ctaElements[], metaTags{}, analyticsPresence{}, dnsInfo{}, screenshots{}}` | AI Generation (input to prompts), Frontend (audit display UI) |

### Acceptance Criteria (from PRD 4.1)

- [ ] Audit completes in <60 seconds for reachable URLs
- [ ] Produces structured JSON matching the AuditResult schema
- [ ] Graceful fallback for blocked/unreachable URLs (partial results + flags)
- [ ] Results streamed via SSE as each analysis stage completes
- [ ] Screenshots captured for both desktop and mobile viewports

---

## Agent 2: AI Generation

**Owner of:** Phase 2 — AI Generation Pipeline
**PRD Sections:** 4.2, 4.3 (deploy automation), 8.3 (Vercel multi-project)

### Responsibilities

1. Design prompt architecture for generating 3 visually distinct Next.js sites
   - Each version: different layout structure, color palette, typography
   - Prompts consume AuditResult JSON + business info as context
2. Build generation orchestration pipeline via Vercel AI SDK
   - Run 3 generations in parallel (one per version)
   - Stream progress via SSE
   - Handle partial failure: complete versions shown immediately, failed version retried
3. Store generated code in Vercel Blob Storage
4. Create Vercel project per SMB via `POST /v9/projects`
5. Deploy generated code to Vercel via `POST /v13/deployments`
6. Implement version selection logic (record user's "Pick this one" choice)
7. Implement rollback (re-deploy previous deployment ID)
8. Implement 60-second email capture fallback (generation still running → capture email)

### API Routes Owned

| Route | Method | Notes |
|-------|--------|-------|
| `/api/generate` | POST | Accept AuditResult ID + business context, start 3-version pipeline |
| `/api/generate/[id]/status` | GET | SSE stream: per-version progress + preview URLs as each completes |
| `/api/sites/[tenantId]/select-version` | POST | Record which SiteVersion the user chose |
| `/api/sites/[tenantId]/deploy` | POST | Deploy selected version to Vercel production |
| `/api/sites/[tenantId]/rollback` | POST | Re-deploy previous deployment |
| `/api/onboarding/[token]/email-capture` | POST | Capture email for async notification |

### Inputs

| From | What |
|------|------|
| Lead | DB schema (`Site`, `SiteVersion`, `Deployment`, `DemoSession`), AI SDK config, Blob client |
| Audit | `AuditResult` JSON (seoScore, metaTags, ctaElements, business info) |

### Outputs

| Output | Consumed By |
|--------|-------------|
| `SiteVersion` records (×3) with preview URLs and blob refs | Frontend (version switcher UI) |
| `Deployment` records | Frontend (deploy status), Billing (trigger on checkout) |
| Vercel project ID per SMB | Billing (domain attachment), Content (blog deploys) |

### Acceptance Criteria (from PRD 4.2, 4.3)

- [ ] Exactly 3 distinct versions generated per audit
- [ ] Each version is a deployable Next.js app with responsive design
- [ ] Each version has a visually distinct design (layout, colors, typography)
- [ ] Total generation time <5 minutes for all 3 versions
- [ ] Partial delivery: if 1 version fails, other 2 still shown, failed retried in background
- [ ] Generated code stored in Vercel Blob Storage for re-deployment
- [ ] Deploy to new Vercel project in <3 minutes
- [ ] Rollback to previous deployment in <2 minutes
- [ ] Lighthouse performance score 80+ on deployed sites

---

## Agent 3: Frontend UI

**Owner of:** UI across Phases 1–6
**PRD Sections:** 3.1–3.5 (all user flows), 4.6 (dashboard)

### Responsibilities

**Onboarding / Demo Pages:**
1. Build onboarding page (`/demo/[token]`) with multi-stage progress bar
2. Build audit results display (inline, streaming, "Before" profile)
3. Build version switcher — tabs on desktop, swipe carousel on mobile
4. Build persistent "Pick this one" floating CTA
5. Build QR code display for live demo audience handoff
6. Build email/SMS capture for follow-up links
7. Build manual business info form (fallback for unreachable URLs)
8. Build expired demo page with "Generate fresh" prompt

**Checkout / Onboarding:**
9. Build checkout page integrating Stripe Checkout
10. Build DNS wizard UI: registrar detection, step-by-step instructions, live propagation status
11. Build "Buy a domain" guidance page for SMBs without a domain

**Dashboard:**
12. Build SMB login page (Auth.js)
13. Build dashboard layout with navigation
14. Build analytics overview: visits, leads, conversions, trend charts
15. Build blog post list page (status, scheduled, published)
16. Build change request list + detail pages
17. Build "Request Change" form with file upload
18. Build change request preview + "Approve & Publish" flow
19. Build subscription management page (link to Stripe Billing Portal)

**Shared Components:**
20. Build loading states, error boundaries, toast notifications
21. Responsive design across all pages (mobile-first)

### API Routes Owned

None — Frontend consumes API routes owned by other agents.

### Inputs

| From | What |
|------|------|
| Lead | Auth config, shared types, PostHog client |
| Audit | SSE stream for progress, AuditResult for display |
| AI Gen | SSE stream for generation progress, SiteVersion preview URLs |
| Billing | Stripe Checkout session URL, subscription status |
| Content | BlogPost list data |
| Analytics | PostHog dashboard data, report data |

### Outputs

| Output | Consumed By |
|--------|-------------|
| User interactions (clicks, form submissions) | Triggers API calls to other agents' routes |
| PostHog pageview/event tracking on platform app | Analytics (platform usage metrics) |

### Acceptance Criteria

- [ ] Onboarding page loads and begins audit within 2 seconds of visit
- [ ] Progress bar shows 4 distinct stages with descriptive labels (never a spinner)
- [ ] Version switcher: tabs on desktop, swipe carousel on mobile
- [ ] 60-second fallback email capture appears if generation still running
- [ ] Dashboard loads in <3 seconds
- [ ] All pages responsive and functional on mobile
- [ ] DNS wizard shows registrar-specific instructions and polls propagation status
- [ ] Change request form supports file uploads

---

## Agent 4: Billing & Lifecycle

**Owner of:** Phase 3 (Checkout & Go-Live), Phase 7 (Subscription Management)
**PRD Sections:** 4.4, 3.4, 3.5

### Responsibilities

**Checkout:**
1. Create Stripe Product + Price ($99.95/month recurring)
2. Build Stripe Checkout session creation (`/api/billing/checkout`)
3. Build Stripe Billing Portal session creation (`/api/billing/portal`)
4. Handle `checkout.session.completed` webhook → trigger site deployment + analytics setup + content schedule

**Subscription Lifecycle:**
5. Handle `invoice.payment_failed` → send grace period email via Resend
6. Implement 7-day grace period logic → set site to `paused` + show landing page
7. Implement 30-day archive logic → archive site, release domain
8. Handle `customer.subscription.deleted` → keep site live through billing period, then pause
9. Handle `customer.subscription.updated` → reactivation restores last deployed version
10. Send email notifications at each lifecycle stage (failure, grace, paused, archive warning, archived)

**Domain Management:**
11. Attach custom domain to Vercel project via API (`POST /v10/projects/{id}/domains`)
12. Implement DNS propagation polling (`/api/dns/verify`)
13. Send DNS reminder email if propagation >24 hours

**Onboarding Emails:**
14. Send Day 0 welcome email (dashboard link, DNS instructions, support contact)
15. Queue Day 3 email ("first blog post live") — send only after Content Engine active
16. Queue Day 7 email ("first analytics summary") — send only after Analytics active

### API Routes Owned

| Route | Method | Notes |
|-------|--------|-------|
| `/api/billing/checkout` | POST | Create Stripe Checkout session |
| `/api/billing/webhook` | POST | Handle all Stripe webhook events |
| `/api/billing/portal` | POST | Create Stripe Billing Portal link |
| `/api/dns/verify` | POST | Poll DNS propagation, return status |
| `/api/sites/[tenantId]/domain` | POST | Attach custom domain via Vercel API |

### Inputs

| From | What |
|------|------|
| Lead | Stripe client, Resend client, DB schema (`Subscription`, `Tenant`) |
| AI Gen | Vercel project ID (to attach domain to), deployment trigger function |
| Frontend | Checkout initiation (user clicks "Pick this one" → checkout) |

### Outputs

| Output | Consumed By |
|--------|-------------|
| `Subscription` record with status | Frontend (dashboard), Content (schedule blogs), Analytics (schedule reports) |
| Domain attachment confirmation | Frontend (DNS wizard status) |
| Lifecycle status changes (`paused`, `archived`) | Content (pause blog schedule), AI Gen (pause site) |

### Acceptance Criteria (from PRD 4.4, 3.4, 3.5)

- [ ] Successful checkout triggers site deployment automatically
- [ ] Failed payment → grace period email sent within 1 hour
- [ ] After 7-day grace period, site status set to `paused` with landing page
- [ ] 30 days after pause, site archived and domain released
- [ ] Cancellation keeps site live through end of billing period
- [ ] Reactivation within 90 days restores last deployed version
- [ ] Stripe webhooks handle: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`
- [ ] DNS wizard detects registrar via WHOIS and shows registrar-specific instructions
- [ ] DNS propagation polled automatically; user sees live status updates
- [ ] Custom domain + SSL provisioned in <5 minutes after DNS propagation

---

## Agent 5: Content & Email Processing

**Owner of:** Phase 5 (Content Engine), Phase 6 (Change Requests)
**PRD Sections:** 4.5, 4.7, 3.3

### Responsibilities

**Blog Content Engine:**
1. Build blog topic generation pipeline (AI generates topic list per client profile)
2. Build blog post generation pipeline (AI writes 600–1,200 word posts)
3. Set up Vercel Cron jobs for 2x/week scheduling per client
4. Implement blog page routes in generated SMB sites (or deploy blog posts as new pages)
5. Implement publish failure retry (up to 3 times, 1-hour intervals)
6. Ensure content uniqueness — no duplicate posts across clients in same industry/location
7. Use Inngest for complex orchestration (generate → review → deploy)

**Change Request Pipeline:**
8. Set up SendGrid Inbound Parse for receiving emails at `updates@platform.com`
9. Build email sender verification against tenant's registered email
10. Build AI interpretation pipeline: classify request type, draft changes
11. Handle edge cases: ambiguous requests (ask clarification), out-of-scope (polite boundary), multi-request emails (split into separate requests)
12. Generate preview of changes, store preview URL with 14-day expiry
13. Build approval workflow: user approves → deploy changes to live site
14. Enforce limits: max 3 revisions per request, 5 requests/month, upsell on overage
15. Handle `verification_hold` status for unrecognized senders

### API Routes Owned

| Route | Method | Notes |
|-------|--------|-------|
| `/api/sites/[tenantId]/blog` | GET | List blog posts with status and schedule |
| `/api/sites/[tenantId]/blog` | POST | Trigger manual blog post generation |
| `/api/sites/[tenantId]/changes` | GET | List change requests for tenant |
| `/api/sites/[tenantId]/changes` | POST | Create change request (from dashboard) |
| `/api/sites/[tenantId]/changes/[id]/approve` | POST | Approve change and trigger deploy |
| `/api/sites/[tenantId]/changes/[id]/revise` | POST | Request revision on preview |
| `/api/email/inbound` | POST | Receive inbound email from SendGrid |

### Inputs

| From | What |
|------|------|
| Lead | DB schema (`BlogPost`, `ChangeRequest`), AI SDK config, Resend client |
| Billing | Subscription status (active = generate content, paused/canceled = stop) |
| AI Gen | Vercel project ID + deployment function (to deploy blog updates and changes) |

### Outputs

| Output | Consumed By |
|--------|-------------|
| `BlogPost` records | Frontend (blog list in dashboard) |
| `ChangeRequest` records with preview URLs | Frontend (change request list + approval UI) |
| Deployed blog content on SMB sites | Analytics (page views on new posts) |

### Acceptance Criteria (from PRD 4.5, 4.7)

- [ ] 2 posts/week generated and published on schedule per client
- [ ] Each post is 600–1,200 words, unique, and industry-relevant
- [ ] Posts auto-published via Vercel Cron; on failure, retry up to 3 times
- [ ] On-schedule posting rate >95%
- [ ] Inbound email creates change request within 5 minutes
- [ ] AI-generated preview ready within 30 minutes of request
- [ ] Approved changes deployed to live site within 5 minutes
- [ ] Max 3 revision rounds enforced per change request
- [ ] 5 requests/month limit enforced; overage triggers upsell
- [ ] Unrecognized sender emails held for verification

---

## Agent 6: Analytics & Reporting

**Owner of:** Phase 4 (Analytics), Phase 7 (Reports)
**PRD Sections:** 4.6, 3.5 (Day 7 email)

### Responsibilities

**Tracking Setup:**
1. Build PostHog snippet injection into all deployed SMB sites
   - Snippet must include `tenant_id` property on all events
   - Track: page views, phone clicks, email clicks, form submissions, CTA clicks
2. Define PostHog event schema for each tracked event type

**Dashboard API:**
3. Build `/api/analytics/[tenantId]` endpoint querying PostHog API
   - Filter by `tenant_id`, date range, event type
   - Return: total visits, leads by type, top pages, trend data
4. Ensure dashboard data loads in <3 seconds

**Reports:**
5. Build weekly report generation (every Monday 9:00 AM, client timezone)
6. Build monthly report generation (1st of each month)
7. Report contents: traffic summary, leads/conversions, blog posts published, notable changes
8. Build report email templates (Resend)
9. Store report data in `EmailReport` records
10. Handle timezone-aware scheduling using tenant's `timezone` field

### API Routes Owned

| Route | Method | Notes |
|-------|--------|-------|
| `/api/analytics/[tenantId]` | GET | Fetch analytics data from PostHog |
| `/api/analytics/[tenantId]/report` | POST | Generate and send email report |

### Inputs

| From | What |
|------|------|
| Lead | DB schema (`EmailReport`), PostHog client, Resend client |
| Billing | Subscription status (only report for active subscriptions), Tenant timezone |
| Content | Blog post publish events (for "posts published this period" in reports) |
| AI Gen | Vercel project ID (to know which site to inject PostHog into) |

### Outputs

| Output | Consumed By |
|--------|-------------|
| Analytics data (JSON) | Frontend (dashboard charts) |
| `EmailReport` records | Frontend (report history in dashboard) |
| PostHog events from SMB sites | Internal (all reporting uses this data) |

### Acceptance Criteria (from PRD 4.6)

- [ ] PostHog snippet auto-injected into all deployed SMB sites
- [ ] Page views, phone clicks, email clicks, form submissions, CTA clicks tracked as distinct events
- [ ] All events include `tenant_id` for multi-tenancy filtering
- [ ] Dashboard API returns data in <3 seconds
- [ ] Weekly report delivered every Monday at 9:00 AM (client timezone)
- [ ] Monthly report delivered on the 1st of each month

---

## Build Order & Parallelization

```
Week 1–2:   [Agent 0: Lead] ─────────────────────────────────►
                Foundation, schema, stubs, config

Week 3–4:   [Agent 1: Audit] ────────────►
                Crawler, analysis, SSE

Week 5–8:   [Agent 2: AI Gen] ───────────────────────►
                Prompts, pipeline, Vercel deploy
            [Agent 3: Frontend] ──────────────────────────────────────────────►
                Onboarding UI, then dashboard, then all remaining pages
                (runs continuously through Week 16)

Week 9–10:  [Agent 4: Billing] ──────────►
                Checkout, webhooks, DNS, onboarding emails

Week 11–12: [Agent 6: Analytics] ────────►
                PostHog setup, dashboard API

Week 13–16: [Agent 5: Content] ──────────────────────►
                Blog engine (13–14), Change requests (15–16)

Week 17–18: [Agent 4: Billing] ──────────►  (Phase 7 — subscription lifecycle)
            [Agent 6: Analytics] ────────►  (Phase 7 — email reports)
```

### Parallelization Opportunities

| Window | Agents That Can Run in Parallel | Why |
|--------|--------------------------------|-----|
| Weeks 3–4 | Audit + Frontend (onboarding shell) | Frontend can build UI scaffolding with mock data while Audit builds the real data pipeline |
| Weeks 5–8 | AI Gen + Frontend (version switcher) | Frontend builds the version carousel/tabs with mock previews while AI Gen builds the real pipeline |
| Weeks 9–12 | Billing + Analytics + Frontend (dashboard) | No dependencies between checkout flow, PostHog setup, and dashboard layout |
| Weeks 13–16 | Content + Frontend (blog/change pages) | Content builds pipelines while Frontend builds the dashboard views for them |

### Critical Path

```
Lead (0) → Audit (1) → AI Gen (2) → Billing (3) → first paying customer possible
```

Everything after Billing (Phase 3) enables value-adds but is not required for the first end-to-end sale. The critical path to first revenue is **10 weeks**.

---

## Inter-Agent Contracts

Each agent must respect these shared conventions established by the Lead:

1. **Database access:** All agents use Drizzle queries through `src/lib/db.ts`. No raw SQL.
2. **API responses:** Consistent JSON envelope: `{ data, error, meta }`.
3. **Error handling:** Throw typed errors from `src/lib/errors.ts`. API routes catch and return appropriate HTTP status.
4. **AI calls:** All AI invocations go through `src/lib/ai.ts` (Vercel AI SDK). No direct API calls to Anthropic/OpenAI.
5. **Email sending:** All outbound email through `src/lib/email.ts` (Resend). No direct SMTP.
6. **Vercel API:** All Vercel REST API calls through `src/lib/vercel.ts`. Shared auth token.
7. **Environment variables:** All secrets in `.env.local`, documented in `.env.example`.
8. **Types:** Shared types live in `src/types/`. Agent-specific types live in their feature directory.

### File Structure Convention

```
src/
├── app/
│   ├── api/                    # API routes (owned by respective agents)
│   ├── demo/[token]/           # Onboarding pages (Frontend)
│   ├── dashboard/              # SMB dashboard (Frontend)
│   └── layout.tsx              # Root layout (Lead)
├── components/                 # Shared UI components (Frontend)
├── db/
│   └── schema.ts               # Drizzle schema (Lead)
├── features/
│   ├── audit/                  # Audit Engine agent's code
│   ├── generation/             # AI Generation agent's code
│   ├── billing/                # Billing agent's code
│   ├── content/                # Content & Email agent's code
│   └── analytics/              # Analytics agent's code
├── lib/                        # Shared utilities (Lead)
│   ├── ai.ts
│   ├── auth.ts
│   ├── db.ts
│   ├── email.ts
│   ├── errors.ts
│   ├── posthog.ts
│   ├── stripe.ts
│   └── vercel.ts
└── types/                      # Shared TypeScript types (Lead)

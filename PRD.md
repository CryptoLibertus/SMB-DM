## Product Requirements Document (PRD)
**Project:** SMB-DM Website Refresh & Growth Platform
**Owner:** Cryptolibertus
**Date:** Feb 6, 2026
**Version:** v1.0 (Engineering-Ready)

---

## 1. Overview

### 1.1 Problem Statement
Small businesses often have outdated, low-converting websites, poor SEO, and no easy way to understand or improve performance. They rarely log into analytics tools and lack technical expertise to set up tracking, content, or experiments.

### 1.2 Product Vision
Provide a self-serve "Done-for-You + AI" platform that:

- Audits an existing website in real time
- Generates 3 optimized website versions with AI
- Allows the business owner to pick a version and go live
- Continuously publishes SEO content and tracks performance
- Surfaces key metrics in a simple dashboard + email reports

All for a flat **$99.95/month** subscription.

### 1.3 Primary Users

1. **Small Business Owners (SMBs)**
   - Non-technical
   - Already have a basic website and domain
   - Want more leads/calls/form submissions

2. **Sales Presenter / Reseller (e.g., Chris)**
   - Uses live demos at events (30–50 SMB owners)
   - Needs a simple, impressive "type URL → see audit → see new site → subscribe" flow

---

## 2. Goals & Non‑Goals

### 2.1 Goals (MVP)

1. Run an automated website audit from a given URL.
2. Generate **3 alternative website versions** optimized for:
   - Conversions
   - Readability
   - SEO / crawler friendliness
3. Host the selected website version via Vercel.
4. Handle **domain/DNS** for existing domains (DNS switch via Vercel-native domain management).
5. Provide:
   - 2× weekly auto-generated blog posts (niche/industry-specific)
   - Basic analytics tracking via PostHog (traffic, conversions, key events)
   - Simple analytics dashboard
   - Weekly and monthly summary email reports
6. Provide a simple **update workflow** for SMBs to request changes/new pages (5/month included).
7. Provide a **checkout flow** with Stripe subscription at **$99.95/month**.

### 2.2 Non‑Goals (Phase 1)

- Deep marketing automation/CRM.
- Complex A/B testing framework (beyond selecting between 3 AI-generated versions).
- Full-featured social media management (not in MVP; only as future module).
- Custom, per-business AI chat agents (future upsell).
- Advanced call tracking platform (future upsell).
- In-app domain registration (guide SMBs to buy externally for MVP).

---

## 3. Key User Flows

### 3.1 Cold Outreach → Onboarding (Async)

**Happy Path:**

1. System sends cold outreach:
   - Message: "We made your website better – click to see."
   - Link points to a personalized onboarding page (e.g., `platform.com/demo/{token}`).
2. User clicks link and lands on onboarding page.
3. **On-demand generation pipeline begins:**
   - Audit starts immediately on page load.
   - Progress streamed via SSE — multi-stage progress bar (not a spinner):
     - Stage 1: "Analyzing your website…" (crawl + SEO scan)
     - Stage 2: "Checking mobile experience…"
     - Stage 3: "Evaluating calls-to-action…"
     - Stage 4: "Generating your new websites…"
   - Audit results shown inline as each stage completes (user sees value immediately).
   - Versions appear incrementally as each completes (version 1 first, then 2, then 3).
4. User sees:
   - Their current site audit summary ("Before" profile)
   - 3 improved versions (swipe carousel on mobile, tab selector on desktop)
5. User:
   - Navigates between the 3 versions via a top header selector.
   - Clicks **"Pick this one"** on desired version (persistent/hovering CTA).
6. User goes to checkout:
   - Enters business details, payment info (Stripe).
   - If existing domain: Guided DNS switch instructions.
   - If no domain: Guide to purchase externally + point to Vercel.
7. On success:
   - Subscription is created.
   - Selected version is deployed as live site.
   - Analytics tracking is attached.
   - Blog schedule (2x/week) is created.
   - Onboarding email sequence begins.

**Loading UX Spec:**

- Multi-stage progress bar with descriptive labels (never a generic spinner).
- Audit results appear inline as they complete — user reads results while generation runs.
- **60-second fallback:** If generation is still running at 60s, show email capture: "Want us to email you when your new sites are ready?" Capture email, continue processing in background.
- Versions appear one at a time as each completes. User can browse version 1 while versions 2 and 3 generate.

**Error States & Edge Cases:**

- **URL unreachable** (blocked, 404, timeout): Show manual business info form fallback — collect business name, industry, services, location. Generate versions from manual input instead of audit data.
- **Partial generation failure** (1 of 3 versions fails): Show completed versions immediately, queue background retry for the failed one. Display: "2 of 3 versions ready — third generating…"
- **All generation fails**: Show error message with retry button. If retry fails, offer email capture for manual follow-up.
- **Link expiry**: Demo links expire after 90 days. Expired links show: "This demo has expired. Enter your URL to generate a fresh one."
- **Re-audit**: If the SMB's site has changed since the outreach was sent, audit runs on the current version (no stale data).
- **Mobile UX**: Swipe carousel for version switching (not tabs). Persistent floating "Pick this one" CTA at bottom of viewport.

### 3.2 Live Demo Flow (Presenter at Event)

**Happy Path:**

1. Presenter opens demo domain on screen.
2. Prompt: "Enter your website URL."
3. SMB owner (or presenter) types URL.
4. System:
   - Runs real-time audit on the entered URL.
   - Displays results via same multi-stage progress bar as 3.1.
5. User can:
   - Edit audit assumptions (e.g., business category, target city, services).
   - Upload/add images and links to use as content context.
6. User clicks "Next":
   - AI generates 3 website versions.
7. User and presenter:
   - Click through the versions (top header navigation).
   - Discuss benefits (on-screen).
8. Presenter directs user to:
   - Click "Pick this one."
   - Proceed to checkout flow, or:
   - Scan QR code on screen to continue on their phone.
   - Enter email/phone to receive follow-up link.

**Failure Modes:**

- **Invalid URL**: Inline validation with suggestions (e.g., "Did you mean example.com?"). Accept URLs with or without `https://` prefix.
- **Slow generation** (>3 min): Show "Skip to pre-built demo" escape hatch using a generic industry template. Presenter can switch back when real versions complete.
- **Connectivity drop**: Fall back to a pre-loaded demo dataset so the presenter can continue the pitch. Real generation resumes when connection restores.

**Audience Handoff:**

- QR code displayed on screen linking to the specific demo session.
- SMS or email capture field for follow-up link.
- Demo persisted for 7 days — audience members can revisit, browse versions, and check out at their own pace.

### 3.3 Ongoing Use: Updates & Maintenance

**Email-based updates:**

1. SMB emails a designated address (e.g., `updates@platform.com`) with a change request.
2. AI agent parses email, classifies request, drafts changes/pages.
3. User receives preview link via email.
4. On approval (click "Approve" in email or dashboard), changes are deployed.

**Dashboard-based updates:**

1. SMB logs into dashboard.
2. Clicks "Request Change / New Page."
3. Fills simple form (description, images, priorities).
4. AI drafts page or revisions.
5. User reviews and approves → deploy to live site.

**Edge Cases:**

- **Unrecognized email sender**: Email not from the tenant's registered contact email → place request in verification hold. Send confirmation to registered email: "Did you send this request?"
- **Ambiguous request**: AI cannot determine what to change → reply asking for clarification with specific questions (e.g., "Which page should we update? What should the new text say?").
- **Out-of-scope request**: Request exceeds what the platform can do (e.g., "build me a booking system") → polite boundary response explaining what's included, suggest alternatives.
- **Multi-request email**: Single email contains multiple distinct changes → split into separate change requests, each with its own preview and approval.
- **Preview link expiry**: Preview links expire after 14 days. After expiry, user must re-request.
- **Revision limits**: Max 3 revision rounds per change request. After 3 rounds, request is closed and a new one must be opened.

### 3.4 Subscription Management

**Failed Payment:**

1. Payment fails → Stripe retries per its retry schedule.
2. After all retries fail → 7-day grace period begins. Email sent: "Your payment failed — update your card to keep your site live."
3. Grace period expires → site status set to `paused`. Landing page displayed: "This site is temporarily unavailable. Business owner: log in to reactivate."
4. 30 days after pause → site archived. Domain released. Data retained for 90 days.
5. Email notifications at each stage: payment failure, grace period start, site paused, archive warning (day 25), archived.

**Cancellation:**

- Self-serve cancellation via Stripe Billing Portal (linked from dashboard).
- Site remains live until end of current billing period.
- After billing period ends → site status set to `paused`, then archived after 30 days.
- Data retained for 90 days after cancellation.
- Cancellation confirmation email with end-of-service date.

**Reactivation:**

- Resubscribe within 90 days → restores last deployed version. No re-generation needed.
- Resubscribe after 90 days → data deleted, must start fresh (new audit + generation).

### 3.5 Post-Checkout Onboarding

**DNS Wizard:**

1. Detect registrar via WHOIS lookup on the SMB's domain.
2. Show registrar-specific instructions (e.g., "Log in to GoDaddy → DNS Settings → Change these records:").
3. Provide exact DNS records to add/change (A record or CNAME pointing to Vercel).
4. Poll for DNS propagation automatically — show status: "Waiting for DNS…" → "DNS verified! Your site is live."
5. If propagation takes >24 hours, send reminder email with instructions.

**New Domain (no existing domain):**

- Guide user to purchase a domain externally (link to common registrars: Namecheap, GoDaddy, Google Domains).
- After purchase, return to DNS wizard to point domain to Vercel.
- No in-app domain registration for MVP.

**Onboarding Email Sequence:**

| Day | Email | Content |
|-----|-------|---------|
| 0 | Welcome | Dashboard link, DNS setup instructions (if not complete), support contact |
| 3 | First blog notification | "Your first blog post is live!" with link and explanation of the content engine |
| 7 | First analytics summary | Traffic snapshot for the first week, explanation of the dashboard |

---

## 4. Functional Requirements

### 4.1 Website Audit Engine

**Inputs:**

- Target website URL.

**Audit must detect and/or analyze:**

1. **SEO & Meta**
   - Presence and quality of:
     - `<title>` tag
     - Meta description
     - H1/H2 structure
     - Keywords in key sections
     - Robots meta tags
   - Presence and content of `robots.txt`.

2. **Device Compatibility**
   - Mobile vs desktop layout (basic checks):
     - Responsive meta viewport tags
     - Use of responsive styles
     - Basic mobile lighthouse-like signals (if possible).

3. **Analytics / Tags**
   - Detection of:
     - GA4 script code
     - Google Tag Manager (GTM) snippet
     - Any other analytics tags where reasonably detectable

4. **Calls-To-Action (CTAs)**
   - Phone numbers (with/without click-to-call)
   - `tel:` links
   - Contact forms (HTML forms, embedded forms)
   - Email links (`mailto:`)
   - Other lead forms (buttons "Contact Us", "Get Quote", etc.)

5. **Domain & Hosting**
   - Domain's DNS provider or basic inferred hosting (to plan DNS switch).
   - High-level check that DNS is switchable (e.g., not on hard-locked systems).

**Outputs:**

- Structured JSON audit result:
  - `seoScore` (0–100)
  - `mobileScore` (0–100)
  - `ctaElements[]` (list of detected CTAs with type and location)
  - `metaTags{}` (title, description, h1s, robots)
  - `analyticsPresence{}` (ga4: bool, gtm: bool, other: string[])
  - `dnsInfo{}` (registrar, nameservers, switchable: bool)
  - `screenshots{}` (desktop and mobile captures)
- This data is used as baseline for later reporting, generation input, and the "Before" profile display.

**Acceptance Criteria:**

- [ ] Audit completes in <60 seconds for reachable URLs.
- [ ] Produces structured JSON matching the schema above.
- [ ] Graceful fallback for blocked/unreachable URLs (returns partial results + flags what failed).
- [ ] Results streamed via SSE as each analysis stage completes.
- [ ] Screenshots captured for both desktop and mobile viewports.

---

### 4.2 AI Website Generation (3 Versions)

**Inputs:**

- Audit data (structured JSON from 4.1).
- Business info inferred from site:
  - Business name, address, phone.
  - Services/products.
  - Location(s) served.
- Optional user-supplied context during demo:
  - Updated business description.
  - Additional cities/areas.
  - Uploaded images.
  - Links for reference.

**Requirements:**

1. Generate **3 distinct full-site concepts** (at least multi-section home page; optionally more pages depending on feasibility).
2. Each version must have a visually distinct design (different layout, color palette, typography).
3. Optimize for:
   - Conversion (clear value proposition, strong CTAs).
   - Readability (scannable headers, bullet points, clear copy).
   - SEO (keywords, structured headings, internal linking basics).
4. Implement:
   - Clean, modern templates, responsive design.
   - Standard sections (hero, services, testimonials, contact, etc.).
5. Each version is a deployable Next.js application.
6. Render as live, navigable sites:
   - Each version accessible under a unique preview URL.
   - Common top header on the demo view allowing:
     - "Version 1 / Version 2 / Version 3" switching.
   - Persistent "Pick this one" CTA.

**Acceptance Criteria:**

- [ ] Exactly 3 distinct versions generated per audit.
- [ ] Each version is a deployable Next.js app with responsive design.
- [ ] Each version has a visually distinct design (layout, colors, typography).
- [ ] Total generation time <5 minutes for all 3 versions.
- [ ] Partial delivery: if 1 version fails, the other 2 are still shown. Failed version retried in background.
- [ ] Generated code stored in Vercel Blob Storage for re-deployment without re-generation.

---

### 4.3 Hosting & Deployment

**Platform:** Vercel (primary and only host for MVP).

**Requirements:**

- Each SMB site is a separate Vercel project (created via Vercel REST API).
- Automated deployment of chosen version to production.
- Environment supports static or serverless-rendered pages as needed.
- DNS integration:
  - Custom domain attached via Vercel API (`POST /v10/projects/{id}/domains`).
  - Vercel handles SSL certificate provisioning and renewal automatically.
  - Show registrar-specific instructions for DNS record changes.
- Rollback: ability to revert to prior deployed version via Vercel deployment API.

**Acceptance Criteria:**

- [ ] Deploy a selected version to a new Vercel project in <3 minutes.
- [ ] Attach custom domain + SSL provisioned in <5 minutes (after DNS propagation).
- [ ] DNS wizard detects registrar via WHOIS and shows registrar-specific instructions.
- [ ] DNS propagation polled automatically; user sees live status updates.
- [ ] Rollback to previous deployment in <2 minutes.
- [ ] Lighthouse performance score 80+ on deployed sites.
- [ ] Generated code stored in Vercel Blob Storage — re-deploy without re-generate.

---

### 4.4 Subscription & Billing (Stripe)

**Requirements:**

- Plan: **$99.95/month** subscription.
- Included in plan:
  - Live hosted website.
  - 2× weekly blog posts.
  - Analytics tracking and dashboard.
  - Email summary reports.
  - 5 change requests/month via email or dashboard.

**Checkout Flow:**

- Stripe Checkout (hosted) for payment collection.
- Stripe Billing Portal for self-serve subscription management.
- Collect:
  - Business name, contact email, billing details.
  - Domain (existing or instructions to purchase).
- On success:
  - Trigger site deployment.
  - Configure analytics (inject PostHog snippet).
  - Set up content schedule (2x/week blog).
  - Begin onboarding email sequence.

**Acceptance Criteria:**

- [ ] Successful checkout triggers site deployment automatically.
- [ ] Failed payment → grace period email sent within 1 hour (via Stripe webhook).
- [ ] After 7-day grace period, site status set to `paused` with landing page.
- [ ] 30 days after pause, site archived and domain released.
- [ ] Cancellation keeps site live through the end of the current billing period.
- [ ] Reactivation within 90 days restores last deployed version without re-generation.
- [ ] Stripe webhook handles: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`.

---

### 4.5 Content Engine (Blogs)

**Requirements:**

- Frequency: **2 blog posts per week** per client.
- Content:
  - 600–1,200 words per post.
  - Industry and service/niche-specific.
  - Target local SEO where applicable (city names, service combos).
  - Unique content (no duplicate posts across clients in the same industry/location).
- Process:
  - Maintain a profile per client: industry, services, locations, target keywords.
  - Auto-generate topic list and posts via AI.
  - Publish posts to client site blog section on schedule.
  - On publish failure, retry up to 3 times with 1-hour intervals.

**Acceptance Criteria:**

- [ ] 2 posts/week generated and published on schedule per client.
- [ ] Each post is 600–1,200 words.
- [ ] Content is unique and industry-relevant (no cross-client duplication).
- [ ] Posts auto-published on schedule via Vercel Cron.
- [ ] On failure, system retries up to 3 times. If all retries fail, alert is logged.
- [ ] On-schedule posting rate >95%.

---

### 4.6 Analytics & Reporting

**Tracking Layer: PostHog**

- PostHog JavaScript snippet auto-injected into every deployed SMB site.
- Multi-tenancy via `tenant_id` property on all events.
- Platform dashboard queries PostHog API filtered by `tenant_id`.

**Events to Track:**

- Page views.
- Clicks on:
  - Phone links.
  - Email links.
  - Contact form submissions.
  - Key CTAs (e.g., "Get Quote," "Book Now").
- Conversions (form submissions, calls, lead events).

**Dashboard:**

- Simple, readable UI for:
  - Total visits (by period).
  - Leads/conversions (by type).
  - Top pages.
  - Trend lines (week/month).

**Reports:**

- Weekly summary email: sent every Monday at 9:00 AM (client timezone).
- Monthly summary email: sent on the 1st of each month.
- Contents:
  - Traffic summary.
  - Leads/conversions summary.
  - Blog posts published that period.
  - Notable changes (e.g., traffic spikes, new pages).

**Phase 2 Add-on:** Optionally inject GA4 alongside PostHog for SMBs who want it.

**Acceptance Criteria:**

- [ ] PostHog snippet auto-injected into all deployed SMB sites.
- [ ] Page views, phone link clicks, email link clicks, form submissions, and CTA clicks all tracked as distinct PostHog events.
- [ ] Dashboard loads in <3 seconds.
- [ ] Weekly report delivered every Monday at 9:00 AM (client timezone).
- [ ] Monthly report delivered on the 1st of each month.
- [ ] All tracked events include `tenant_id` for multi-tenancy filtering.

---

### 4.7 Website Update & Change Requests

**Email Interface:**

- Dedicated email address (e.g., `updates@platform.com`).
- Inbound email processing via SendGrid Inbound Parse.
- AI reads incoming email:
  - Verifies sender against tenant's registered email.
  - Classifies request (copy change, new page, image swap, contact info update).
  - Drafts updated content and layout.
  - Sends preview link to user.

**Dashboard Interface:**

- "Request Change" form:
  - Type: New page / Edit existing page / Other.
  - Description field.
  - File uploads (images, PDFs, etc.).
- Workflow:
  - AI drafts change.
  - Preview accessible in dashboard (and via emailed link).
  - User clicks "Approve & Publish" to go live.

**Scope (included in subscription):**

- 5 change requests per month.
- Allowed request types: copy edits, image swaps, new service/location pages, contact info updates.
- Max per request: 1 new page or edits to 2 existing pages.
- Over 5/month → upsell prompt: "Need more updates? Upgrade to our Pro plan."

**Acceptance Criteria:**

- [ ] Inbound email creates a change request in the system within 5 minutes.
- [ ] AI-generated preview ready within 30 minutes of request.
- [ ] Approved changes deployed to live site within 5 minutes.
- [ ] Max 3 revision rounds per change request.
- [ ] 5 requests/month limit enforced; overage triggers upsell prompt.
- [ ] Unrecognized sender emails held for verification.

---

## 5. Non‑Functional Requirements

### 5.1 Performance

- Audit & generation during live demo:
  - Initial audit: ≤ 60 seconds.
  - Site versions generation: ≤ 5 minutes for all 3 versions.
- Dashboard load time: < 3 seconds for main metrics view.
- Deployed SMB sites: Lighthouse performance score 80+.

### 5.2 Reliability

- Hosted sites: ≥ 99.9% uptime (leveraging Vercel SLA).
- Rollback capability:
  - Ability to revert to prior deployed version within 2 minutes.
- Blog engine: >95% on-schedule posting rate.

### 5.3 Security & Compliance

- Use HTTPS across all properties (Vercel handles SSL).
- Secure payments (Stripe handles PCI).
- Data privacy:
  - Store minimal PII.
  - Data retention: 90 days after subscription ends, then hard delete.
- Email sender verification for change requests.

---

## 6. Resolved Technical Decisions

### 6.1 Analytics: PostHog (not GA4)

**Decision:** Use PostHog as the primary analytics platform.

**Rationale:**
- Own the data — no dependency on Google's data policies or API changes.
- Simple API for building a custom dashboard with multi-tenancy (filter by `tenant_id`).
- Free tier covers ~1M events/month (200 clients × 5K events each).
- GA4 multi-tenancy is complex (separate properties per client or complex filtering) and the reporting API is harder to query programmatically.

**Phase 2 add-on:** Inject GA4 alongside PostHog for SMBs who request it.

### 6.2 AI Models: Multi-Model Strategy

**Decision:** Use different models for different tasks based on cost/quality tradeoffs.

| Task | Model | Est. Cost per Unit |
|------|-------|--------------------|
| Audit analysis | Claude Haiku 4.5 / GPT-4o-mini | ~$0.02/audit |
| Site generation (×3) | Claude Opus / GPT-4o | ~$1.50–6.00 total |
| Blog content | Claude Sonnet 4.5 / GPT-4o-mini | ~$0.03/post |
| Change interpretation | Claude Sonnet 4.5 | ~$0.10/request |

- **One-time onboarding cost:** ~$4.50/client (audit + 3 versions).
- **Monthly ongoing cost:** ~$0.50/client (blog posts + occasional change requests). This is ~0.5% of the $99.95 revenue.
- Use **Vercel AI SDK** for provider abstraction — swap models without code changes.

### 6.3 DNS: Vercel-Native (not Cloudflare)

**Decision:** Use Vercel's built-in domain management.

**Rationale:**
- Vercel handles custom domains, SSL provisioning, and certificate renewal via API.
- Adding Cloudflare as a separate layer introduces complexity with no benefit at MVP scale.
- No in-app domain registration for MVP. Guide SMBs to buy domains externally and point them to Vercel.

### 6.4 Demo vs Production: Single System, Status-Based

**Decision:** Demo and production sites run on the same infrastructure, differentiated by status.

- Same Vercel project infrastructure for both.
- `Site.status` field controls behavior:
  - `demo` → preview URL under platform domain (e.g., `preview.platform.com/{id}`)
  - `live` → custom domain attached
- **Promotion = status change + domain attachment.** Zero re-generation required.
- Cron job archives demo sites older than 30 days. Data retained for 90 days.

### 6.5 Change Request Scope: 5/Month Included

**Decision:** 5 change requests per month included in the $99.95 subscription.

**Included request types:**
- Copy edits (text changes on existing pages)
- Image swaps
- New service or location pages
- Contact info updates

**Limits per request:**
- Max: 1 new page or edits to 2 existing pages.
- Max: 3 revision rounds per request.

**Overage:** Requests beyond 5/month trigger an upsell prompt.

---

## 7. Success Metrics (MVP)

| Metric | Target |
|--------|--------|
| Demo completion rate (URL entry → see 3 versions) | >80% |
| Demo-to-paid conversion rate | >15% |
| Time to first value (URL entry → versions ready) | <5 minutes |
| Blog post on-schedule rate | >95% |
| Site uptime | >99.9% |
| Dashboard load time | <3 seconds |
| Active subscribers (6-month target) | 50+ |
| Change request turnaround (request → preview ready) | <30 minutes |

---

## 8. Technical Architecture

### 8.1 System Components

```
┌─────────────────────────────────────────────────────────┐
│                    Platform App                          │
│            (Next.js App Router on Vercel)                │
│   ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│   │Onboarding│ │Dashboard │ │ API      │ │  Admin   │  │
│   │  Pages   │ │  (SMB)   │ │ Routes   │ │  Panel   │  │
│   └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
└─────────┬───────────┬───────────┬───────────┬───────────┘
          │           │           │           │
    ┌─────▼─────┐ ┌───▼───┐ ┌───▼────┐ ┌───▼────┐
    │  Audit    │ │  AI   │ │Content │ │ Email  │
    │  Engine   │ │ Gen   │ │ Engine │ │Process │
    │(Puppeteer)│ │Pipeline│ │(Cron)  │ │(Inbound│
    └─────┬─────┘ └───┬───┘ └───┬────┘ └───┬────┘
          │           │         │           │
    ┌─────▼───────────▼─────────▼───────────▼─────┐
    │              Vercel Postgres (Neon)           │
    └──────────────────────┬───────────────────────┘
                           │
    ┌──────────────────────▼───────────────────────┐
    │         External Services                     │
    │  ┌────────┐ ┌────────┐ ┌────────┐ ┌───────┐  │
    │  │ Stripe │ │PostHog │ │ Resend │ │Vercel │  │
    │  │Billing │ │Analytics│ │ Email  │ │API    │  │
    │  └────────┘ └────────┘ └────────┘ └───────┘  │
    └───────────────────────────────────────────────┘
```

1. **Platform App** (Next.js App Router on Vercel) — onboarding flows, SMB dashboard, API routes, admin panel
2. **Audit Engine** — serverless function running Puppeteer for crawling + PageSpeed Insights API for Lighthouse scores
3. **AI Generation Pipeline** — orchestrated via Vercel AI SDK, generates 3 Next.js site versions per audit
4. **Site Hosting** — individual Vercel projects per SMB, created and managed via Vercel REST API
5. **Content Engine** — Vercel Cron jobs trigger blog post generation and publishing on schedule
6. **Email Processing** — SendGrid Inbound Parse receives change request emails, routes to AI interpretation pipeline
7. **Billing** — Stripe Checkout for payment, Billing Portal for self-serve management, webhooks for lifecycle events
8. **Analytics** — PostHog JavaScript snippet injected into SMB sites, queried via PostHog API for dashboard and reports

### 8.2 Technology Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14+ (App Router) |
| Database | Vercel Postgres (Neon) |
| ORM | Drizzle |
| Auth | Auth.js |
| Payments | Stripe (Checkout + Billing Portal + Webhooks) |
| Email (outbound) | Resend |
| Email (inbound) | SendGrid Inbound Parse |
| Jobs / Scheduling | Vercel Cron + Inngest (for complex workflows) |
| AI | Vercel AI SDK (Anthropic + OpenAI providers) |
| Analytics | PostHog |
| File Storage | Vercel Blob Storage (generated site code) |
| Crawler | Puppeteer (serverless via `@sparticuz/chromium`) |

### 8.3 Vercel Multi-Project Architecture

Each SMB = a separate Vercel project. This enables:
- Independent deployments (one client's deploy doesn't affect others)
- Per-project custom domains
- Independent build logs and rollback

**API operations:**
- Create project: `POST /v9/projects`
- Deploy site: `POST /v13/deployments`
- Attach domain: `POST /v10/projects/{id}/domains`
- Rollback: re-deploy a previous deployment ID

**Cost model at scale (200 clients):**
- Vercel Pro plan: $20/month (unlimited projects)
- ~800 builds/month (200 clients × ~4 deploys each: initial + blogs + changes)
- ~8,000 build minutes/month → ~$20 overage at Pro tier pricing
- **Total hosting cost: ~$40/month** for 200 clients

**Generated code storage:**
- Site source code stored in Vercel Blob Storage after generation.
- Re-deploys pull from blob storage — no need to re-run AI generation.
- Blob storage cost: negligible at this scale (~$0.15/GB/month).

### 8.4 API Routes

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/audit` | POST | Run website audit on a given URL |
| `/api/audit/[id]/status` | GET | SSE stream for audit progress |
| `/api/generate` | POST | Start 3-version generation pipeline |
| `/api/generate/[id]/status` | GET | SSE stream for generation progress |
| `/api/sites/[tenantId]/select-version` | POST | Record which version the user picked |
| `/api/sites/[tenantId]/deploy` | POST | Deploy selected version to production |
| `/api/sites/[tenantId]/rollback` | POST | Rollback to previous deployment |
| `/api/sites/[tenantId]/domain` | POST | Attach custom domain to Vercel project |
| `/api/sites/[tenantId]/blog` | GET | List blog posts (status, schedule) |
| `/api/sites/[tenantId]/blog` | POST | Trigger blog post generation |
| `/api/sites/[tenantId]/changes` | GET | List change requests for tenant |
| `/api/sites/[tenantId]/changes` | POST | Create change request |
| `/api/sites/[tenantId]/changes/[id]/approve` | POST | Approve and deploy a change |
| `/api/sites/[tenantId]/changes/[id]/revise` | POST | Request revision on a change preview |
| `/api/billing/checkout` | POST | Create Stripe Checkout session |
| `/api/billing/webhook` | POST | Handle Stripe webhook events |
| `/api/billing/portal` | POST | Create Stripe Billing Portal session |
| `/api/analytics/[tenantId]` | GET | Fetch analytics data from PostHog |
| `/api/analytics/[tenantId]/report` | POST | Generate and send email report |
| `/api/email/inbound` | POST | Receive inbound email from SendGrid |
| `/api/dns/verify` | POST | Check DNS propagation status |
| `/api/onboarding/[token]` | GET | Load personalized demo/onboarding page |
| `/api/onboarding/[token]/email-capture` | POST | Capture email for async notification (60s fallback) |
| `/api/demo/[token]/handoff` | POST | Send follow-up link via SMS or email |

---

## 9. Data Model

### 9.1 Entity Relationship Overview

```
Tenant 1──1 Subscription
Tenant 1──1 Site
Site   1──N SiteVersion
Site   1──N Deployment
Site   1──N BlogPost
Site   1──N ChangeRequest
Tenant 1──N AuditResult
Tenant 1──N EmailReport
DemoSession 1──1 AuditResult
DemoSession 0──1 Tenant  (linked on conversion)
```

### 9.2 Entities

**Tenant**
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| businessName | text | |
| contactEmail | text | Primary contact, used for email verification |
| phone | text | nullable |
| industry | text | |
| services | text[] | Array of services offered |
| locations | text[] | Array of cities/areas served |
| targetKeywords | text[] | SEO keywords, nullable |
| timezone | text | IANA timezone (e.g., `America/New_York`), used for report scheduling |
| status | enum | `active`, `paused`, `archived` |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**Subscription**
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| tenantId | uuid | FK → Tenant |
| stripeCustomerId | text | |
| stripeSubscriptionId | text | |
| status | enum | `active`, `past_due`, `canceled`, `paused` |
| currentPeriodEnd | timestamp | |
| canceledAt | timestamp | nullable |
| createdAt | timestamp | |

**Site**
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| tenantId | uuid | FK → Tenant |
| vercelProjectId | text | Vercel project ID |
| primaryDomain | text | nullable (null until DNS configured) |
| previewDomain | text | Platform-managed preview URL |
| status | enum | `demo`, `provisioning`, `live`, `paused`, `archived` |
| selectedVersionId | uuid | FK → SiteVersion, nullable |
| currentDeploymentId | uuid | FK → Deployment, nullable |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**SiteVersion**
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| siteId | uuid | FK → Site |
| versionNumber | int | 1, 2, or 3 |
| generatedCodeRef | text | Vercel Blob Storage URL |
| previewUrl | text | |
| designMeta | jsonb | Color palette, layout type, typography choices |
| status | enum | `generating`, `ready`, `failed` |
| createdAt | timestamp | |

**Deployment**
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| siteId | uuid | FK → Site |
| vercelDeploymentId | text | |
| vercelDeploymentUrl | text | |
| status | enum | `building`, `ready`, `error` |
| isProduction | boolean | |
| triggeredBy | enum | `initial`, `blog`, `change`, `rollback` |
| createdAt | timestamp | |

**AuditResult**
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| tenantId | uuid | FK → Tenant, nullable (null for anonymous demo) |
| targetUrl | text | |
| seoScore | int | 0–100 |
| mobileScore | int | 0–100 |
| ctaAnalysis | jsonb | `{elements: [{type, text, location}]}` |
| metaTags | jsonb | `{title, description, h1s[], robots}` |
| analyticsDetected | jsonb | `{ga4: bool, gtm: bool, other: []}` |
| dnsInfo | jsonb | `{registrar, nameservers[], switchable: bool}` |
| screenshotDesktop | text | URL to stored screenshot |
| screenshotMobile | text | URL to stored screenshot |
| createdAt | timestamp | |

**BlogPost**
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| siteId | uuid | FK → Site |
| title | text | |
| slug | text | URL-safe slug |
| content | text | Full HTML/MDX content |
| targetKeywords | text[] | |
| wordCount | int | |
| status | enum | `draft`, `scheduled`, `published`, `failed` |
| scheduledFor | timestamp | |
| publishedAt | timestamp | nullable |
| retryCount | int | default 0, max 3 |
| createdAt | timestamp | |

**ChangeRequest**
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| siteId | uuid | FK → Site |
| source | enum | `email`, `dashboard` |
| requestType | enum | `copy_edit`, `image_swap`, `new_page`, `contact_update`, `other` |
| description | text | Raw request text |
| attachments | text[] | URLs to uploaded files |
| status | enum | `received`, `verification_hold`, `processing`, `preview_ready`, `approved`, `deployed`, `rejected` |
| previewUrl | text | nullable |
| previewExpiresAt | timestamp | nullable, 14 days from creation |
| revisionCount | int | default 0, max 3 |
| monthlyRequestNumber | int | 1–5+ (for tracking against monthly limit) |
| createdAt | timestamp | |
| updatedAt | timestamp | |

**EmailReport**
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| tenantId | uuid | FK → Tenant |
| reportType | enum | `weekly`, `monthly` |
| periodStart | timestamp | |
| periodEnd | timestamp | |
| content | jsonb | Report data (traffic, leads, blog posts) |
| sentAt | timestamp | nullable |
| createdAt | timestamp | |

**DemoSession**
| Field | Type | Notes |
|-------|------|-------|
| id | uuid | PK |
| token | text | Unique token for demo URL (`/demo/{token}`) |
| auditResultId | uuid | FK → AuditResult |
| tenantId | uuid | FK → Tenant, nullable (linked on conversion) |
| sourceType | enum | `cold_outreach`, `live_demo` |
| contactEmail | text | nullable, captured via email fallback |
| expiresAt | timestamp | 90 days for cold outreach, 7 days for live demo |
| status | enum | `active`, `converted`, `expired` |
| createdAt | timestamp | |

---

## 10. MVP Phasing & Build Order

| Phase | Scope | Weeks | Milestone |
|-------|-------|-------|-----------|
| **0 — Foundation** | Next.js setup, DB schema (Drizzle + Vercel Postgres), Stripe test mode integration, PostHog setup, Vercel AI SDK config, CI/CD pipeline | 1–2 | Dev environment running, schema migrated, Stripe test webhooks working |
| **1 — Audit Engine** | Puppeteer crawler (serverless), SEO/mobile/CTA analysis, PageSpeed Insights API integration, audit results UI with SSE progress streaming | 3–4 | Enter URL → see structured audit results in <60s |
| **2 — AI Generation** | Prompt architecture for 3 distinct versions, generation pipeline with Vercel AI SDK, preview UI with version switcher, Vercel project creation + deploy automation, Blob Storage for generated code | 5–8 | Enter URL → see 3 live preview sites in <5 min |
| **3 — Checkout & Go-Live** | Stripe Checkout integration, webhook handler for subscription lifecycle, DNS wizard UI, domain attachment via Vercel API, onboarding email sequence (Resend) | 9–10 | End-to-end: audit → generate → pick → pay → site live on custom domain |
| **4 — Dashboard & Analytics** | SMB login (Auth.js), dashboard UI, PostHog snippet injection into SMB sites, analytics API queries, chart components | 11–12 | SMB logs in → sees traffic, leads, top pages |
| **5 — Content Engine** | Blog post generation pipeline (AI), Vercel Cron scheduling, blog page routes on SMB sites, topic list management | 13–14 | 2 posts/week auto-published to live SMB sites |
| **6 — Change Requests** | Dashboard change request form, SendGrid Inbound Parse setup, AI interpretation pipeline, preview generation, approval + deploy workflow | 15–16 | SMB emails or submits change → preview in <30 min → approve → live |
| **7 — Reports & Polish** | Weekly/monthly email reports, subscription management (failed payment flow, cancellation, reactivation), cold outreach system (send outreach, generate personalized demo links, track clicks), error handling hardening, load testing | 17–18 | Full system operational, email reports flowing, outreach pipeline live, edge cases handled |

**Cross-phase dependencies:**
- Onboarding email sequence (Phase 3) sends Day 0 (welcome + DNS) immediately. Day 3 ("first blog post") and Day 7 ("analytics summary") emails are queued but only sent once Phases 4 and 5 are complete. Until then, those emails are skipped silently.
- Subscription lifecycle edge cases (failed payments, cancellation, reactivation) are not automated until Phase 7. During Phases 3–6, failed payments are handled manually via Stripe dashboard.

---

## 11. AI Cost Model

### 11.1 Per-Task Model Selection

| Task | Preferred Model | Fallback Model | Est. Cost | Volume |
|------|----------------|----------------|-----------|--------|
| Audit analysis | Claude Haiku 4.5 | GPT-4o-mini | ~$0.02/audit | 1 per client onboarding |
| Site generation (×3 versions) | Claude Opus | GPT-4o | ~$1.50–6.00/client | 1 per client onboarding |
| Blog content (per post) | Claude Sonnet 4.5 | GPT-4o-mini | ~$0.03/post | 8/month per client |
| Change request interpretation | Claude Sonnet 4.5 | GPT-4o-mini | ~$0.10/request | ~3/month per client |

### 11.2 Cost Per Client

| Cost Type | Amount | Notes |
|-----------|--------|-------|
| One-time onboarding | ~$4.50 | Audit ($0.02) + generation ($4.50 avg) |
| Monthly ongoing | ~$0.54 | Blog ($0.24) + changes ($0.30) |
| **Monthly total (steady state)** | **~$0.54/client** | **0.5% of $99.95 revenue** |

### 11.3 Cost at Scale (200 clients)

| Line Item | Monthly Cost |
|-----------|-------------|
| AI (ongoing) | ~$108 |
| Vercel hosting | ~$40 |
| PostHog | Free tier (1M events) |
| Resend email | ~$20 (Pro plan) |
| SendGrid inbound | Free tier |
| Stripe fees (2.9% + $0.30) | ~$600 |
| **Total platform cost** | **~$768/month** |
| **Revenue (200 × $99.95)** | **~$19,990/month** |
| **Gross margin** | **~96%** |

### 11.4 Implementation

- Use **Vercel AI SDK** for all AI calls — provides a unified interface across Anthropic and OpenAI.
- Model selection is per-task (configured in code), not per-client.
- Fallback: if the preferred model is unavailable or rate-limited, automatically switch to the fallback model.
- All AI costs logged per tenant for monitoring and alerting on anomalies.
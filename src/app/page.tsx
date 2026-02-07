"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const FEATURES = [
  {
    title: "Professional Redesign",
    description: "Turn visitors into customers with a conversion-optimized site built for your industry — delivered in minutes, not weeks.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
    featured: true,
  },
  {
    title: "Fresh Blog Content",
    description: "Rank higher on Google with 2 SEO-optimized posts per week — written and published automatically, zero effort required.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
      </svg>
    ),
    featured: true,
  },
  {
    title: "Know Your Numbers",
    description: "See exactly who visits, where they come from, and which pages convert — all in one simple dashboard.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
    featured: false,
  },
  {
    title: "Weekly Performance Reports",
    description: "Stay informed without logging in — traffic, leads, and top pages delivered to your inbox every week.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
    featured: false,
  },
  {
    title: "On-Demand Updates",
    description: "Need a change? Email us or use the dashboard. 5 requests per month included — no extra charge.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
    featured: false,
  },
  {
    title: "Custom Domain + SSL",
    description: "Your site, your domain. Free SSL certificate included and auto-renewed. Live in minutes.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
    featured: false,
  },
];

const STEPS = [
  {
    number: "01",
    title: "Enter your email",
    description: "Drop your email to unlock a free website audit \u2014 takes 60 seconds.",
  },
  {
    number: "02",
    title: "Review your new site",
    description: "Get a custom site built for your industry and audience \u2014 not a template.",
  },
  {
    number: "03",
    title: "Go live in minutes",
    description: "Go live with hosting, blog content, and analytics included \u2014 all for one monthly price.",
  },
];

const PLAN_FEATURES = [
  "AI-powered website redesign",
  "Custom domain with free SSL",
  "2 SEO blog posts per week",
  "Analytics dashboard",
  "Weekly & monthly email reports",
  "5 change requests per month",
  "99.9% uptime guarantee",
  "30-day money-back guarantee",
  "Cancel anytime",
];

const TRUST_SIGNALS = [
  "Enterprise-grade hosting",
  "Built on Next.js",
  "SEO-first architecture",
  "Cancel anytime",
];

const TESTIMONIALS = [
  {
    quote: "We went from a dated WordPress site to a modern, conversion-optimized page in under 10 minutes. Our form submissions doubled in the first month.",
    name: "Sarah Chen",
    role: "Owner",
    business: "Bright Path Dental",
    industry: "Healthcare",
  },
  {
    quote: "The AI audit found issues our old agency missed for years. The blog content alone has boosted our organic traffic by 40%.",
    name: "Marcus Rivera",
    role: "Founder",
    business: "Rivera Roofing Co.",
    industry: "Home Services",
  },
  {
    quote: "For $99/month I get a professional site, weekly blog posts, and analytics. My last agency charged $2K/month for less.",
    name: "Jenny Park",
    role: "Managing Partner",
    business: "Park & Associates Law",
    industry: "Legal",
  },
];

export default function Home() {
  const [email, setEmail] = useState("");
  const [url, setUrl] = useState("");
  const [demoSessionId, setDemoSessionId] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const router = useRouter();

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/demo/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Invalid email address");
        return;
      }

      setDemoSessionId(data.data.demoSessionId);
      setStep(2);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = url.trim();
    if (!raw || submitting) return;

    // Auto-prepend https:// if no protocol
    const normalizedUrl = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/audit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalizedUrl, demoSessionId }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Failed to start audit");
        return;
      }

      router.push(`/demo/${data.data.auditId}`);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-x-hidden">
      {/* ─── HERO ─── */}
      <section className="relative bg-surface-dark text-white">
        {/* Grid background */}
        <div className="grid-bg pointer-events-none absolute inset-0" />

        {/* Subtle radial glow behind the input */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/4 h-[600px] w-[800px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(ellipse, rgba(59,91,254,0.3) 0%, transparent 70%)",
          }}
        />

        {/* Nav */}
        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <span className="text-lg font-bold tracking-tight">
            SMB<span className="text-accent">-DM</span>
          </span>
          <Link
            href="/login"
            className="text-sm font-medium text-text-light transition-colors hover:text-white"
          >
            Sign in
          </Link>
        </nav>

        {/* Hero content */}
        <div className="relative z-10 mx-auto max-w-3xl px-6 pb-28 pt-20 text-center sm:pt-28 sm:pb-36">
          <p className="animate-float-up mb-5 inline-block rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium tracking-wide text-text-light uppercase">
            AI-Powered Website Platform
          </p>

          <h1 className="animate-float-up-delay-1 text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">
            Websites that convert.
            <br />
            <span className="text-accent">Built in minutes,</span> not months.
          </h1>

          <p className="animate-float-up-delay-2 mx-auto mt-6 max-w-xl text-lg font-light leading-relaxed text-text-light sm:text-xl">
            {step === 1
              ? "Enter your email to start your free website audit."
              : "Now enter your website URL and we\u2019ll run the audit."}
          </p>

          {/* Step 1: Email Input */}
          {step === 1 && (
            <form
              onSubmit={handleEmailSubmit}
              className="animate-float-up-delay-3 mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row sm:gap-0"
            >
              <div className="animate-pulse-glow relative flex-1 rounded-xl sm:rounded-r-none">
                <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                </div>
                <input
                  id="hero-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@business.com"
                  required
                  className="h-14 w-full rounded-xl border border-white/10 bg-surface-dark-secondary pl-12 pr-4 text-base font-medium text-white placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:h-16 sm:rounded-r-none sm:text-lg"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="h-14 shrink-0 rounded-xl bg-accent px-8 text-base font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed sm:h-16 sm:rounded-l-none sm:text-lg"
              >
                {submitting ? "Starting..." : "Get Started"}
              </button>
            </form>
          )}

          {/* Step 2: URL Input (with email badge) */}
          {step === 2 && (
            <div className="animate-float-up-delay-3 mx-auto mt-10 max-w-xl">
              <div className="mb-3 flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => { setStep(1); setError(null); }}
                  className="group inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm text-text-light transition-colors hover:bg-white/15"
                  title="Change email"
                >
                  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-green-400" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  {email}
                  <svg viewBox="0 0 24 24" fill="none" className="h-3.5 w-3.5 text-text-muted transition-colors group-hover:text-white" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
              </div>
              <form
                onSubmit={handleUrlSubmit}
                className="flex flex-col gap-3 sm:flex-row sm:gap-0"
              >
                <div className="animate-pulse-glow relative flex-1 rounded-xl sm:rounded-r-none">
                  <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                    </svg>
                  </div>
                  <input
                    id="hero-url-input"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="yourbusiness.com"
                    required
                    autoFocus
                    className="h-14 w-full rounded-xl border border-white/10 bg-surface-dark-secondary pl-12 pr-4 text-base font-medium text-white placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:h-16 sm:rounded-r-none sm:text-lg"
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-14 shrink-0 rounded-xl bg-accent px-8 text-base font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed sm:h-16 sm:rounded-l-none sm:text-lg"
                >
                  {submitting ? "Starting audit..." : "Audit My Website Free"}
                </button>
              </form>
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm text-red-400">{error}</p>
          )}

          <p className="animate-float-up-delay-4 mt-4 text-xs text-text-muted">
            Free audit in 60 seconds &middot; No credit card &middot; Your data stays private
          </p>

          <a
            href="#how-it-works"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("how-it-works")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="animate-float-up-delay-4 mt-6 inline-block text-sm font-medium text-text-light transition-colors hover:text-white"
          >
            See how it works &darr;
          </a>
        </div>
      </section>

      {/* ─── TRUST SIGNALS BAR ─── */}
      <section className="border-b border-border-subtle bg-white py-6">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-3 px-6">
          {TRUST_SIGNALS.map((signal) => (
            <div key={signal} className="flex items-center gap-2">
              <svg
                className="h-4 w-4 shrink-0 text-green-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
              <span className="text-sm font-medium text-gray-600">
                {signal}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── TESTIMONIALS ─── */}
      <section className="border-b border-border-subtle bg-background py-20">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
              Real results
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Trusted by small businesses
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="flex flex-col rounded-xl border border-border-subtle bg-white p-6"
              >
                {/* Stars */}
                <div className="mb-3 flex gap-0.5 text-yellow-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg key={i} className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                <p className="mb-4 flex-1 text-sm leading-relaxed text-foreground">
                  &ldquo;{t.quote}&rdquo;
                </p>

                <div className="border-t border-border-subtle pt-4">
                  <p className="text-sm font-semibold text-foreground">{t.name}</p>
                  <p className="text-xs text-text-muted">
                    {t.role}, {t.business}
                  </p>
                  <span className="mt-1 inline-block rounded-full bg-accent/10 px-2 py-0.5 text-[11px] font-medium text-accent">
                    {t.industry}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section id="how-it-works" className="bg-white py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
              How it works
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Three steps to a better website
            </h2>
          </div>

          <div className="grid gap-8 sm:grid-cols-3 sm:gap-12">
            {STEPS.map((step) => (
              <div key={step.number} className="relative">
                <span className="mb-4 block font-mono text-5xl font-black text-accent/10">
                  {step.number}
                </span>
                <h3 className="mb-2 text-lg font-bold text-foreground">
                  {step.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-muted">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─── */}
      <section className="border-t border-border-subtle bg-background py-24">
        <div className="mx-auto max-w-5xl px-6">
          <div className="mb-16 text-center">
            <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
              Everything included
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              One subscription. Zero hassle.
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className={`group rounded-xl border bg-white p-6 transition-all hover:shadow-md hover:shadow-accent/5 ${
                  feature.featured
                    ? "border-accent/30 ring-1 ring-accent/10 hover:border-accent/40"
                    : "border-border-subtle hover:border-accent/20"
                }`}
              >
                {feature.featured && (
                  <span className="mb-3 inline-block rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-semibold text-accent uppercase tracking-wide">
                    Most popular
                  </span>
                )}
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-accent/5 text-accent transition-colors group-hover:bg-accent/10">
                  {feature.icon}
                </div>
                <h3 className="mb-1.5 text-base font-bold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-sm leading-relaxed text-text-muted">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING ─── */}
      <section className="border-t border-border-subtle bg-white py-24">
        <div className="mx-auto max-w-xl px-6">
          <div className="mb-12 text-center">
            <p className="mb-3 text-sm font-semibold tracking-wide text-accent uppercase">
              Simple pricing
            </p>
            <h2 className="text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl">
              Everything you need to grow
            </h2>
            <p className="mt-3 text-sm text-text-muted">
              Compare: Freelancer $5K+ &middot; Agency $2K/mo+ &middot; SMB-DM $99.95/mo
            </p>
          </div>

          <div className="rounded-2xl border-2 border-accent/20 bg-white p-8 shadow-lg shadow-accent/5 sm:p-10">
            <div className="mb-6 flex items-baseline gap-2">
              <span className="text-5xl font-extrabold tracking-tight text-foreground">
                $99
              </span>
              <span className="text-2xl font-bold text-foreground">.95</span>
              <span className="ml-1 text-base font-medium text-text-muted">/month</span>
            </div>

            <ul className="mb-8 space-y-3">
              {PLAN_FEATURES.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <svg
                    className="mt-0.5 h-5 w-5 shrink-0 text-accent"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M4.5 12.75l6 6 9-13.5"
                    />
                  </svg>
                  <span className="text-sm leading-relaxed text-foreground">
                    {feature}
                  </span>
                </li>
              ))}
            </ul>

            {/* Money-back guarantee callout */}
            <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center">
              <p className="text-sm font-semibold text-green-800">
                30-day money-back guarantee &mdash; no questions asked
              </p>
            </div>

            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                setTimeout(() => {
                  const input = document.getElementById(step === 1 ? "hero-email-input" : "hero-url-input");
                  if (input) (input as HTMLInputElement).focus();
                }, 400);
              }}
              className="w-full rounded-xl bg-accent py-4 text-base font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98]"
            >
              Start My Free Audit
            </button>

            <p className="mt-4 text-center text-xs text-text-muted">
              No credit card required to see your redesign.
            </p>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border-subtle bg-background py-12">
        <div className="mx-auto max-w-5xl px-6">
          <div className="grid gap-8 sm:grid-cols-3">
            {/* Product */}
            <div>
              <h4 className="mb-3 text-sm font-bold text-foreground">Product</h4>
              <ul className="space-y-2 text-sm text-text-muted">
                <li>
                  <a href="#how-it-works" className="transition-colors hover:text-foreground">How It Works</a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-foreground">Pricing</a>
                </li>
                <li>
                  <Link href="/login" className="transition-colors hover:text-foreground">Sign In</Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="mb-3 text-sm font-bold text-foreground">Company</h4>
              <ul className="space-y-2 text-sm text-text-muted">
                <li>
                  <a href="#" className="transition-colors hover:text-foreground">About</a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-foreground">Terms of Service</a>
                </li>
                <li>
                  <a href="#" className="transition-colors hover:text-foreground">Privacy Policy</a>
                </li>
              </ul>
            </div>

            {/* Support */}
            <div>
              <h4 className="mb-3 text-sm font-bold text-foreground">Support</h4>
              <ul className="space-y-2 text-sm text-text-muted">
                <li>
                  <a href="mailto:support@smb-dm.com" className="transition-colors hover:text-foreground">support@smb-dm.com</a>
                </li>
              </ul>
            </div>
          </div>

          {/* Final CTA row */}
          <div className="mt-10 border-t border-border-subtle pt-8 text-center">
            <p className="mb-4 text-sm font-medium text-foreground">
              Ready to grow? Start your free audit.
            </p>
            <button
              onClick={() => {
                window.scrollTo({ top: 0, behavior: "smooth" });
                setTimeout(() => {
                  const input = document.getElementById(step === 1 ? "hero-email-input" : "hero-url-input");
                  if (input) (input as HTMLInputElement).focus();
                }, 400);
              }}
              className="rounded-xl bg-accent px-8 py-3 text-sm font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98]"
            >
              Audit My Website Free
            </button>
          </div>

          <div className="mt-8 text-center">
            <span className="text-sm font-bold tracking-tight text-foreground">
              SMB<span className="text-accent">-DM</span>
            </span>
            <p className="mt-2 text-xs text-text-muted">
              &copy; {new Date().getFullYear()} SMB-DM. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

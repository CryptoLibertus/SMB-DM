"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const FEATURES = [
  {
    title: "AI-Powered Redesign",
    description: "3 unique, conversion-optimized versions of your website generated in minutes.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456z" />
      </svg>
    ),
  },
  {
    title: "SEO Blog Content",
    description: "2 industry-relevant blog posts per week, automatically published to your site.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V18a2.25 2.25 0 002.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
      </svg>
    ),
  },
  {
    title: "Analytics Dashboard",
    description: "See traffic, leads, and top pages at a glance. No setup required.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    title: "Email Reports",
    description: "Weekly and monthly performance summaries delivered to your inbox.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
      </svg>
    ),
  },
  {
    title: "Change Requests",
    description: "Need an update? Email us or use the dashboard. 5 requests included monthly.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
      </svg>
    ),
  },
  {
    title: "Custom Domain + SSL",
    description: "Your site, your domain. Free SSL certificate included and auto-renewed.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    number: "01",
    title: "Enter your URL",
    description: "We crawl your current site, analyze SEO, mobile experience, and conversion potential.",
  },
  {
    number: "02",
    title: "Pick your favorite",
    description: "Review 3 AI-generated redesigns. Each one is unique, responsive, and optimized.",
  },
  {
    number: "03",
    title: "Go live in minutes",
    description: "Subscribe, point your domain, and your new site is live. We handle everything else.",
  },
];

const PLAN_FEATURES = [
  "AI-powered website redesign (3 versions)",
  "Custom domain with free SSL",
  "2 SEO blog posts per week",
  "Analytics dashboard",
  "Weekly & monthly email reports",
  "5 change requests per month",
  "99.9% uptime guarantee",
  "Cancel anytime",
];

export default function Home() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    const encoded = encodeURIComponent(url.trim());
    router.push(`/demo/preview?url=${encoded}`);
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
            Your website is losing
            <br />
            you customers.{" "}
            <span className="text-accent">We&apos;ll fix it.</span>
          </h1>

          <p className="animate-float-up-delay-2 mx-auto mt-6 max-w-xl text-lg font-light leading-relaxed text-text-light sm:text-xl">
            Enter your URL. Get 3 AI-generated redesigns in under 5 minutes.
            Go live with better SEO, fresh content, and real analytics.
          </p>

          {/* URL Input — the centerpiece */}
          <form
            onSubmit={handleSubmit}
            className="animate-float-up-delay-3 mx-auto mt-10 flex max-w-xl flex-col gap-3 sm:flex-row sm:gap-0"
          >
            <div className="animate-pulse-glow relative flex-1 rounded-xl sm:rounded-r-none">
              <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-muted">
                <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                </svg>
              </div>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter your website URL..."
                required
                className="h-14 w-full rounded-xl border border-white/10 bg-surface-dark-secondary pl-12 pr-4 text-base font-medium text-white placeholder:text-text-muted focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent sm:h-16 sm:rounded-r-none sm:text-lg"
              />
            </div>
            <button
              type="submit"
              className="h-14 shrink-0 rounded-xl bg-accent px-8 text-base font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98] sm:h-16 sm:rounded-l-none sm:text-lg"
            >
              See Your Free Redesign
            </button>
          </form>

          <p className="animate-float-up-delay-4 mt-4 text-xs text-text-muted">
            No credit card required. Results in under 5 minutes.
          </p>
        </div>
      </section>

      {/* ─── SOCIAL PROOF BAR ─── */}
      <section className="border-b border-border-subtle bg-white py-8">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-6 sm:flex-row sm:justify-center sm:gap-6">
          <p className="text-sm font-medium tracking-wide text-text-muted uppercase">
            Trusted by 200+ small businesses
          </p>
          <div className="flex -space-x-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-white text-xs font-bold"
                style={{
                  backgroundColor: [
                    "#3B5BFE", "#10B981", "#F59E0B", "#EF4444",
                    "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16",
                  ][i],
                  color: "white",
                }}
              >
                {["JM", "SK", "AL", "RB", "TP", "DC", "WH", "NV"][i]}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="bg-white py-24">
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
                className="group rounded-xl border border-border-subtle bg-white p-6 transition-all hover:border-accent/20 hover:shadow-md hover:shadow-accent/5"
              >
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

            <button
              onClick={() => {
                const hero = document.querySelector("input[type=url]");
                if (hero) (hero as HTMLInputElement).focus();
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="w-full rounded-xl bg-accent py-4 text-base font-semibold text-white transition-all hover:bg-accent-hover hover:shadow-lg hover:shadow-accent/25 active:scale-[0.98]"
            >
              Get Started Free
            </button>

            <p className="mt-4 text-center text-xs text-text-muted">
              No credit card required to see your redesign.
            </p>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-border-subtle bg-background py-10">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <span className="text-sm font-bold tracking-tight text-foreground">
            SMB<span className="text-accent">-DM</span>
          </span>
          <p className="mt-2 text-xs text-text-muted">
            &copy; {new Date().getFullYear()} SMB-DM. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

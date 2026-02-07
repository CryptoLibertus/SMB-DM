"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function FAQItem({
  question,
  answer,
  isOpen,
  onToggle,
}: {
  question: string;
  answer: string;
  isOpen: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-border-subtle last:border-b-0">
      <button
        onClick={onToggle}
        className="flex w-full items-center justify-between py-3 text-left text-sm font-medium text-foreground"
      >
        {question}
        <svg
          className={`h-4 w-4 shrink-0 text-text-muted transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <p className="pb-3 text-sm text-text-muted">{answer}</p>
      )}
    </div>
  );
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const auditId = searchParams.get("auditId");
  const versionId = searchParams.get("version");
  const canceled = searchParams.get("canceled") === "true";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: auditId, // For MVP, the auditId maps to tenant via generation pipeline
          successUrl: `${window.location.origin}/success`,
          cancelUrl: `${window.location.origin}/checkout?auditId=${auditId}&version=${versionId}&canceled=true`,
        }),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        setError(data.error || "Failed to create checkout session");
        return;
      }

      // Redirect to Stripe Checkout
      window.location.href = data.data.url;
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const faqs = [
    {
      question: "What happens after I pay?",
      answer:
        "Your site deploys in about 2 minutes. You\u2019ll get a welcome email with dashboard login credentials.",
    },
    {
      question: "Can I cancel?",
      answer:
        "Yes, anytime from your dashboard. We offer a full 30-day money-back guarantee.",
    },
    {
      question: "Do I need my own domain?",
      answer:
        "It\u2019s optional. We provide a preview domain immediately. You can connect your own domain anytime from the dashboard.",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border-subtle bg-white">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-bold tracking-tight text-foreground">
            SMB<span className="text-accent">-DM</span>
          </Link>
          <Link href="/login" className="text-sm font-medium text-text-muted transition-colors hover:text-foreground">
            Sign in
          </Link>
        </div>
      </header>

      <div className="flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Back link */}
        {auditId && (
          <Link
            href={`/demo/${auditId}`}
            className="mb-4 inline-flex items-center gap-1 text-sm text-text-muted hover:text-foreground"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to preview
          </Link>
        )}

        {/* Canceled banner */}
        {canceled && (
          <div className="mb-4 rounded-lg border border-accent/30 bg-accent/5 p-4">
            <p className="font-medium text-foreground">Changed your mind?</p>
            <p className="mt-1 text-sm text-text-muted">
              No worries — your redesign is still saved. When you&apos;re ready,
              just hit the button below to continue. Remember, there&apos;s a
              30-day money-back guarantee.
            </p>
          </div>
        )}

        <div className="rounded-lg border border-border-subtle bg-white p-6 shadow-sm">
          <h1 className="mb-1 text-xl font-bold text-foreground">
            Complete Your Subscription
          </h1>
          <p className="mb-6 text-sm text-text-muted">
            Get your new website live with everything included.
          </p>

          {/* Plan summary */}
          <div className="mb-6 rounded-lg bg-background p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">
                  Website Refresh & Growth
                </p>
                <p className="text-sm text-text-muted">Monthly subscription</p>
              </div>
              <p className="text-xl font-bold text-foreground">$99.95/mo</p>
            </div>
          </div>

          {/* Features */}
          <ul className="mb-4 space-y-2">
            {[
              "Live hosted website on your domain",
              "2 blog posts per week (auto-generated)",
              "Analytics dashboard & email reports",
              "5 change requests per month",
              "SSL certificate included",
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-accent"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                {feature}
              </li>
            ))}
          </ul>

          {/* Version label */}
          {versionId && (
            <p className="mb-4 text-xs text-text-light">
              Your custom website
            </p>
          )}

          {/* Trust badges */}
          <div className="mb-4 flex items-center justify-center gap-4 text-xs text-text-muted">
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Stripe Secured
            </span>
            <span className="text-border-subtle">|</span>
            <span className="flex items-center gap-1">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              256-bit SSL
            </span>
            <span className="text-border-subtle">|</span>
            <span>Cancel Anytime</span>
          </div>

          {/* Money-back guarantee */}
          <div className="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-center">
            <p className="text-sm font-medium text-green-800">
              30-Day Money-Back Guarantee
            </p>
            <p className="mt-0.5 text-xs text-green-600">
              Not satisfied? Get a full refund, no questions asked.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Redirecting to payment..." : canceled ? "Continue to Payment" : "Proceed to Payment"}
          </button>

          <p className="mt-3 text-center text-xs text-text-light">
            Secure payment powered by Stripe. Cancel anytime.
          </p>

          {/* Social proof */}
          <p className="mt-4 text-center text-xs text-text-light">
            Join businesses already growing with SMB-DM
          </p>
        </div>

        {/* FAQ section */}
        <div className="mt-6 rounded-lg border border-border-subtle bg-white p-6 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold text-foreground">
            Frequently Asked Questions
          </h2>
          <div>
            {faqs.map((faq, i) => (
              <FAQItem
                key={i}
                question={faq.question}
                answer={faq.answer}
                isOpen={openFaq === i}
                onToggle={() => setOpenFaq(openFaq === i ? null : i)}
              />
            ))}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-text-muted">Loading...</p>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

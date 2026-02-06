"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const auditId = searchParams.get("auditId");
  const versionId = searchParams.get("version");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: auditId, // For MVP, the auditId maps to tenant via generation pipeline
          successUrl: `${window.location.origin}/dashboard?checkout=success`,
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h1 className="mb-1 text-xl font-bold text-gray-900">
            Complete Your Subscription
          </h1>
          <p className="mb-6 text-sm text-gray-500">
            Get your new website live with everything included.
          </p>

          {/* Plan summary */}
          <div className="mb-6 rounded-lg bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">
                  Website Refresh & Growth
                </p>
                <p className="text-sm text-gray-500">Monthly subscription</p>
              </div>
              <p className="text-xl font-bold text-gray-900">$99.95/mo</p>
            </div>
          </div>

          {/* Features */}
          <ul className="mb-6 space-y-2">
            {[
              "Live hosted website on your domain",
              "2 blog posts per week (auto-generated)",
              "Analytics dashboard & email reports",
              "5 change requests per month",
              "SSL certificate included",
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-2 text-sm text-gray-700">
                <svg
                  className="mt-0.5 h-4 w-4 shrink-0 text-blue-600"
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

          {/* Version info */}
          {versionId && (
            <p className="mb-4 text-xs text-gray-400">
              Selected: {versionId}
            </p>
          )}

          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <button
            onClick={handleCheckout}
            disabled={loading}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Redirecting to payment..." : "Proceed to Payment"}
          </button>

          <p className="mt-3 text-center text-xs text-gray-400">
            Secure payment powered by Stripe. Cancel anytime.
          </p>
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
          <p className="text-gray-500">Loading...</p>
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  );
}

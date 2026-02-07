"use client";

export default function SettingsPage() {
  const handleManageSubscription = async () => {
    // Would POST to /api/billing/portal to get Stripe Billing Portal URL
    // then redirect
    window.alert("Would redirect to Stripe Billing Portal");
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Settings</h1>

      {/* Subscription */}
      <div className="max-w-2xl rounded-lg border border-border-subtle bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">Subscription</h2>
        <p className="mt-1 text-sm text-text-muted">
          Manage your plan and billing details
        </p>

        <div className="mt-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border-subtle pb-4">
            <div>
              <p className="text-sm font-medium text-foreground">Plan</p>
              <p className="text-sm text-text-muted">Website Refresh & Growth</p>
            </div>
            <p className="text-lg font-bold text-foreground">$99.95/mo</p>
          </div>

          <div className="flex items-center justify-between border-b border-border-subtle pb-4">
            <div>
              <p className="text-sm font-medium text-foreground">Status</p>
            </div>
            <span className="inline-flex rounded-full bg-green-50 px-2.5 py-0.5 text-xs font-medium text-green-700">
              Active
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-border-subtle pb-4">
            <div>
              <p className="text-sm font-medium text-foreground">Next billing date</p>
            </div>
            <p className="text-sm text-text-muted">Mar 6, 2026</p>
          </div>

          <div className="flex items-center justify-between pb-2">
            <div>
              <p className="text-sm font-medium text-foreground">
                Change requests this month
              </p>
            </div>
            <p className="text-sm text-text-muted">3 of 5 used</p>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={handleManageSubscription}
            className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Manage Subscription
          </button>
        </div>

        <p className="mt-4 text-xs text-text-light">
          Subscription management is handled through Stripe&apos;s secure billing
          portal.
        </p>
      </div>

      {/* Included features */}
      <div className="mt-6 max-w-2xl rounded-lg border border-border-subtle bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-foreground">
          What&apos;s Included
        </h2>
        <ul className="mt-4 space-y-3">
          {[
            "Live hosted website with custom domain",
            "2 auto-generated blog posts per week",
            "Analytics tracking and dashboard",
            "Weekly and monthly email reports",
            "5 change requests per month",
          ].map((feature) => (
            <li key={feature} className="flex items-start gap-2 text-sm text-foreground">
              <svg
                className="mt-0.5 h-4 w-4 shrink-0 text-green-500"
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
      </div>
    </div>
  );
}

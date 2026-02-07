import OnboardingChecklist from "@/components/OnboardingChecklist";

export default function DashboardOverviewPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Overview</h1>

      <OnboardingChecklist />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Visits This Week */}
        <div className="rounded-lg border border-border-subtle bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-text-muted">Visits This Week</h3>
          <p className="mt-2 text-3xl font-bold text-foreground">--</p>
          <p className="mt-1 text-sm text-text-light">Collecting data...</p>
          <div className="mt-4 flex h-24 items-center justify-center rounded bg-background">
            <p className="px-4 text-center text-xs text-text-light">
              Traffic data will appear here once your site starts receiving visitors.
            </p>
          </div>
        </div>

        {/* Leads */}
        <div className="rounded-lg border border-border-subtle bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-text-muted">Leads</h3>
          <p className="mt-2 text-3xl font-bold text-foreground">0</p>
          <p className="mt-1 text-sm text-text-light">This month</p>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-light">Phone calls</span>
              <span className="font-medium text-text-light">--</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-light">Form submissions</span>
              <span className="font-medium text-text-light">--</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-light">Email clicks</span>
              <span className="font-medium text-text-light">--</span>
            </div>
          </div>
        </div>

        {/* Top Pages */}
        <div className="rounded-lg border border-border-subtle bg-white p-6 shadow-sm">
          <h3 className="text-sm font-medium text-text-muted">Top Pages</h3>
          <div className="mt-6 flex flex-col items-center justify-center py-4 text-center">
            <svg className="h-8 w-8 text-text-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
            <p className="mt-2 text-xs text-text-light">
              Page analytics will populate as visitors browse your site.
            </p>
          </div>
        </div>
      </div>

      {/* Weekly trend — empty state */}
      <div className="mt-6 rounded-lg border border-border-subtle bg-white p-6 shadow-sm">
        <h3 className="text-sm font-medium text-text-muted">Traffic Trend</h3>
        <div className="mt-4 flex h-48 flex-col items-center justify-center rounded bg-background text-center">
          <svg className="h-10 w-10 text-text-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.306a11.95 11.95 0 015.814-5.518l2.74-1.22m0 0l-5.94-2.281m5.94 2.28l-2.28 5.941" />
          </svg>
          <p className="mt-2 text-sm font-medium text-text-muted">No traffic data yet</p>
          <p className="mt-1 max-w-sm text-xs text-text-light">
            Your site was just launched! Traffic trends will appear here within a few days as visitors discover your site.
          </p>
        </div>
      </div>
    </div>
  );
}

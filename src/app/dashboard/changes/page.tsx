import Link from "next/link";

export default function ChangesPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Change Requests</h1>
        <Link
          href="/dashboard/changes/new"
          className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
        >
          Request Change
        </Link>
      </div>

      <p className="mb-4 text-sm text-text-muted">
        0 of 5 requests used this month
      </p>

      <div className="rounded-lg border border-border-subtle bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <svg className="h-12 w-12 text-text-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-foreground">No change requests yet</h2>
          <p className="mt-2 max-w-md text-sm text-text-muted">
            Need to update your phone number, swap an image, or add a new page? Submit a change request and we&apos;ll handle it. You get 5 requests per month included in your plan.
          </p>
          <Link
            href="/dashboard/changes/new"
            className="mt-6 inline-flex rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
          >
            Submit Your First Request
          </Link>
        </div>
      </div>
    </div>
  );
}

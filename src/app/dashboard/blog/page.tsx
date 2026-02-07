export default function BlogPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Blog Posts</h1>
        <span className="text-sm text-text-muted">2 posts/week auto-generated</span>
      </div>

      <div className="rounded-lg border border-border-subtle bg-white p-8 shadow-sm">
        <div className="flex flex-col items-center text-center">
          <svg className="h-12 w-12 text-text-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 7.5h1.5m-1.5 3h1.5m-7.5 3h7.5m-7.5 3h7.5m3-9h3.375c.621 0 1.125.504 1.125 1.125V18a2.25 2.25 0 01-2.25 2.25M16.5 7.5V4.875c0-.621-.504-1.125-1.125-1.125H4.125C3.504 3.75 3 4.254 3 4.875V18a2.25 2.25 0 002.25 2.25h13.5M6 7.5h3v3H6v-3z" />
          </svg>
          <h2 className="mt-4 text-lg font-semibold text-foreground">No blog posts yet</h2>
          <p className="mt-2 max-w-md text-sm text-text-muted">
            Your first AI-generated blog posts will appear here once your site is live. We publish 2 SEO-optimized posts per week, tailored to your industry and target keywords.
          </p>
          <div className="mt-6 rounded-lg border border-border-subtle bg-background px-4 py-3">
            <p className="text-xs text-text-muted">
              First posts are typically published within 48 hours of going live.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

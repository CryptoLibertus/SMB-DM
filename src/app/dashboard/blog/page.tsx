const MOCK_POSTS = [
  {
    id: "1",
    title: "5 Signs Your Home Plumbing Needs Professional Attention",
    status: "published" as const,
    scheduledFor: "2026-02-03T09:00:00Z",
    publishedAt: "2026-02-03T09:01:23Z",
  },
  {
    id: "2",
    title: "How to Prepare Your Pipes for Winter in Austin",
    status: "published" as const,
    scheduledFor: "2026-02-06T09:00:00Z",
    publishedAt: "2026-02-06T09:00:45Z",
  },
  {
    id: "3",
    title: "Water Heater Maintenance: A Complete Guide for Homeowners",
    status: "scheduled" as const,
    scheduledFor: "2026-02-10T09:00:00Z",
    publishedAt: null,
  },
  {
    id: "4",
    title: "Emergency Drain Cleaning: When to Call a Professional",
    status: "scheduled" as const,
    scheduledFor: "2026-02-13T09:00:00Z",
    publishedAt: null,
  },
  {
    id: "5",
    title: "Eco-Friendly Plumbing Solutions for Your Business",
    status: "draft" as const,
    scheduledFor: "2026-02-17T09:00:00Z",
    publishedAt: null,
  },
];

const statusColors: Record<string, string> = {
  published: "bg-green-50 text-green-700",
  scheduled: "bg-blue-50 text-blue-700",
  draft: "bg-gray-50 text-gray-700",
  failed: "bg-red-50 text-red-700",
};

function formatDate(dateStr: string | null) {
  if (!dateStr) return "--";
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function BlogPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Blog Posts</h1>
        <span className="text-sm text-gray-500">2 posts/week auto-generated</span>
      </div>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 font-medium text-gray-500">Title</th>
              <th className="hidden px-6 py-3 font-medium text-gray-500 sm:table-cell">
                Status
              </th>
              <th className="hidden px-6 py-3 font-medium text-gray-500 md:table-cell">
                Scheduled For
              </th>
              <th className="hidden px-6 py-3 font-medium text-gray-500 lg:table-cell">
                Published At
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_POSTS.map((post) => (
              <tr
                key={post.id}
                className="border-b border-gray-100 last:border-0"
              >
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{post.title}</p>
                  <div className="mt-1 flex gap-2 sm:hidden">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[post.status]}`}
                    >
                      {post.status}
                    </span>
                  </div>
                </td>
                <td className="hidden px-6 py-4 sm:table-cell">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[post.status]}`}
                  >
                    {post.status}
                  </span>
                </td>
                <td className="hidden px-6 py-4 text-gray-500 md:table-cell">
                  {formatDate(post.scheduledFor)}
                </td>
                <td className="hidden px-6 py-4 text-gray-500 lg:table-cell">
                  {formatDate(post.publishedAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

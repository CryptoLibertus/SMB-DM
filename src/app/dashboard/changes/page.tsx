import Link from "next/link";

const MOCK_CHANGES = [
  {
    id: "1",
    description: "Update phone number on contact page",
    requestType: "contact_update",
    status: "deployed",
    createdAt: "2026-01-20T14:30:00Z",
  },
  {
    id: "2",
    description: "Replace hero image with new team photo",
    requestType: "image_swap",
    status: "approved",
    createdAt: "2026-01-28T10:15:00Z",
  },
  {
    id: "3",
    description: "Add new 'Emergency Services' page for 24/7 calls",
    requestType: "new_page",
    status: "preview_ready",
    createdAt: "2026-02-01T09:00:00Z",
  },
  {
    id: "4",
    description: "Fix typo in Services section - 'plubming' to 'plumbing'",
    requestType: "copy_edit",
    status: "processing",
    createdAt: "2026-02-04T16:45:00Z",
  },
  {
    id: "5",
    description: "Update business hours for spring season",
    requestType: "copy_edit",
    status: "received",
    createdAt: "2026-02-06T08:00:00Z",
  },
];

const statusColors: Record<string, string> = {
  received: "bg-gray-50 text-gray-700",
  processing: "bg-yellow-50 text-yellow-700",
  preview_ready: "bg-blue-50 text-blue-700",
  approved: "bg-indigo-50 text-indigo-700",
  deployed: "bg-green-50 text-green-700",
  rejected: "bg-red-50 text-red-700",
  verification_hold: "bg-orange-50 text-orange-700",
};

const typeLabels: Record<string, string> = {
  copy_edit: "Copy Edit",
  image_swap: "Image Swap",
  new_page: "New Page",
  contact_update: "Contact Update",
  other: "Other",
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ChangesPage() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Change Requests</h1>
        <Link
          href="/dashboard/changes/new"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Request Change
        </Link>
      </div>

      <p className="mb-4 text-sm text-gray-500">
        3 of 5 requests used this month
      </p>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="px-6 py-3 font-medium text-gray-500">Description</th>
              <th className="hidden px-6 py-3 font-medium text-gray-500 sm:table-cell">
                Type
              </th>
              <th className="hidden px-6 py-3 font-medium text-gray-500 md:table-cell">
                Status
              </th>
              <th className="hidden px-6 py-3 font-medium text-gray-500 lg:table-cell">
                Created
              </th>
            </tr>
          </thead>
          <tbody>
            {MOCK_CHANGES.map((change) => (
              <tr
                key={change.id}
                className="border-b border-gray-100 last:border-0"
              >
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{change.description}</p>
                  <div className="mt-1 flex gap-2 sm:hidden">
                    <span className="text-xs text-gray-500">
                      {typeLabels[change.requestType]}
                    </span>
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[change.status]}`}
                    >
                      {change.status.replace("_", " ")}
                    </span>
                  </div>
                </td>
                <td className="hidden px-6 py-4 text-gray-500 sm:table-cell">
                  {typeLabels[change.requestType]}
                </td>
                <td className="hidden px-6 py-4 md:table-cell">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[change.status]}`}
                  >
                    {change.status.replace("_", " ")}
                  </span>
                </td>
                <td className="hidden px-6 py-4 text-gray-500 lg:table-cell">
                  {formatDate(change.createdAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

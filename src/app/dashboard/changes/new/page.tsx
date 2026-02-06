"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const REQUEST_TYPES = [
  { value: "copy_edit", label: "Copy Edit" },
  { value: "image_swap", label: "Image Swap" },
  { value: "new_page", label: "New Page" },
  { value: "contact_update", label: "Contact Update" },
];

export default function NewChangeRequestPage() {
  const router = useRouter();
  const [requestType, setRequestType] = useState("copy_edit");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Would POST to /api/sites/[tenantId]/changes
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push("/dashboard/changes");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Request a Change</h1>

      <div className="max-w-2xl rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label
              htmlFor="requestType"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Change Type
            </label>
            <select
              id="requestType"
              value={requestType}
              onChange={(e) => setRequestType(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {REQUEST_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="description"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={5}
              placeholder="Describe what you'd like changed. Be specific about which page, what text, or what should be added..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="files"
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Attachments (optional)
            </label>
            <input
              id="files"
              type="file"
              multiple
              onChange={(e) => setFiles(e.target.files)}
              className="w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100"
            />
            <p className="mt-1 text-xs text-gray-400">
              Upload images, PDFs, or other reference files
            </p>
            {files && files.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">
                {files.length} file(s) selected
              </p>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Request"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

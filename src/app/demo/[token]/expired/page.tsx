"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ExpiredDemoPage() {
  const [url, setUrl] = useState("");
  const router = useRouter();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    // In production, this would call /api/audit to start a new audit
    // and redirect to the new demo session
    const newToken = "fresh-" + Date.now();
    router.push(`/demo/${newToken}`);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <div className="w-full max-w-md text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-8 w-8 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        <h1 className="mb-2 text-2xl font-bold text-gray-900">
          This demo has expired
        </h1>
        <p className="mb-8 text-gray-500">
          No worries — enter your URL to generate a fresh one.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-website.com"
            required
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            Generate fresh
          </button>
        </form>
      </div>
    </div>
  );
}

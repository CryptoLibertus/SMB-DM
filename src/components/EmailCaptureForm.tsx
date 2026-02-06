"use client";

import { useState } from "react";

interface EmailCaptureFormProps {
  onSubmit: (email: string) => void;
  message?: string;
}

export default function EmailCaptureForm({
  onSubmit,
  message = "Want us to email you when your new sites are ready?",
}: EmailCaptureFormProps) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    onSubmit(email);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-center">
        <p className="text-sm font-medium text-green-800">
          We&apos;ll send you an email when your sites are ready.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="mb-3 text-sm text-gray-700">{message}</p>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Notify me
        </button>
      </form>
    </div>
  );
}

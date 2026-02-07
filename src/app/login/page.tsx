"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      // In production, this calls NextAuth signIn("email", { email })
      // For now, simulate and redirect
      await new Promise((resolve) => setTimeout(resolve, 1000));
      router.push("/check-email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        <div className="rounded-lg border border-border-subtle bg-white p-6 shadow-sm">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold text-foreground">Sign in</h1>
            <p className="mt-1 text-sm text-text-muted">
              Enter your email to receive a magic link
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-sm font-medium text-foreground"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@business.com"
                required
                autoFocus
                className="w-full rounded-lg border border-border-subtle px-3 py-2.5 text-sm focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending link..." : "Sign in with email"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";

// Mock DNS data
const MOCK_DNS = {
  domain: "example-plumbing.com",
  registrar: "GoDaddy",
  records: [
    {
      type: "A",
      name: "@",
      value: "76.76.21.21",
      current: "192.168.1.1",
    },
    {
      type: "CNAME",
      name: "www",
      value: "cname.vercel-dns.com",
      current: "www.old-host.com",
    },
  ],
};

type DnsStatus = "pending" | "verifying" | "verified";

export default function DnsWizardPage() {
  const [status, setStatus] = useState<DnsStatus>("pending");
  const [step, setStep] = useState(1);

  useEffect(() => {
    if (status === "verifying") {
      // Simulate polling for DNS propagation
      const timer = setTimeout(() => {
        setStatus("verified");
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  return (
    <div className="min-h-screen bg-background px-4 py-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-2 text-2xl font-bold text-foreground">
          DNS Setup Wizard
        </h1>
        <p className="mb-8 text-text-muted">
          Point your domain to your new website in a few steps.
        </p>

        {/* Step 1: Detected registrar */}
        <div className="mb-4 rounded-lg border border-border-subtle bg-white p-6 shadow-sm">
          <div className="flex items-start gap-3">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                step > 1
                  ? "bg-accent text-white"
                  : step === 1
                    ? "border-2 border-accent text-accent"
                    : "border-2 border-border-subtle text-text-light"
              }`}
            >
              {step > 1 ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                "1"
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-foreground">
                Registrar Detected
              </h3>
              <p className="mt-1 text-sm text-text-muted">
                Your domain <span className="font-medium text-foreground">{MOCK_DNS.domain}</span> is
                registered with{" "}
                <span className="font-medium text-foreground">{MOCK_DNS.registrar}</span>.
              </p>
              {step === 1 && (
                <button
                  onClick={() => setStep(2)}
                  className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Step 2: DNS records to change */}
        <div
          className={`mb-4 rounded-lg border bg-white p-6 shadow-sm ${
            step >= 2 ? "border-border-subtle" : "border-border-subtle opacity-50"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                step > 2
                  ? "bg-accent text-white"
                  : step === 2
                    ? "border-2 border-accent text-accent"
                    : "border-2 border-border-subtle text-text-light"
              }`}
            >
              {step > 2 ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                "2"
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-foreground">
                Update DNS Records
              </h3>
              {step >= 2 && (
                <>
                  <p className="mt-1 text-sm text-text-muted">
                    Log in to {MOCK_DNS.registrar} and update the following DNS
                    records:
                  </p>

                  <div className="mt-4 overflow-hidden rounded-lg border border-border-subtle">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="bg-background">
                          <th className="px-4 py-2 font-medium text-text-muted">Type</th>
                          <th className="px-4 py-2 font-medium text-text-muted">Name</th>
                          <th className="px-4 py-2 font-medium text-text-muted">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {MOCK_DNS.records.map((record, i) => (
                          <tr key={i} className="border-t border-border-subtle">
                            <td className="px-4 py-2 font-mono text-xs text-foreground">
                              {record.type}
                            </td>
                            <td className="px-4 py-2 font-mono text-xs text-foreground">
                              {record.name}
                            </td>
                            <td className="px-4 py-2 font-mono text-xs text-accent">
                              {record.value}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-3 rounded-lg bg-yellow-50 p-3 text-xs text-yellow-800">
                    Replace the current values. DNS changes can take up to 48
                    hours to propagate, but usually complete within 30 minutes.
                  </div>

                  {step === 2 && (
                    <button
                      onClick={() => {
                        setStep(3);
                        setStatus("verifying");
                      }}
                      className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                    >
                      I&apos;ve updated my records
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Step 3: Verification status */}
        <div
          className={`rounded-lg border bg-white p-6 shadow-sm ${
            step >= 3 ? "border-border-subtle" : "border-border-subtle opacity-50"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                status === "verified"
                  ? "bg-green-600 text-white"
                  : step === 3
                    ? "border-2 border-accent text-accent"
                    : "border-2 border-border-subtle text-text-light"
              }`}
            >
              {status === "verified" ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                "3"
              )}
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-foreground">
                DNS Verification
              </h3>
              {step >= 3 && (
                <div className="mt-2">
                  {status === "verifying" && (
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                      <span className="text-sm text-text-muted">
                        Waiting for DNS propagation...
                      </span>
                    </div>
                  )}
                  {status === "verified" && (
                    <div>
                      <div className="flex items-center gap-2 text-green-600">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-sm font-medium">
                          DNS Verified! Your site is live.
                        </span>
                      </div>
                      <a
                        href="/dashboard"
                        className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-hover"
                      >
                        Go to Dashboard
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

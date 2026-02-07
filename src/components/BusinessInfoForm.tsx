"use client";

import { useState } from "react";

interface BusinessInfo {
  businessName: string;
  industry: string;
  services: string;
  locations: string;
  contactEmail: string;
}

interface BusinessInfoFormProps {
  onSubmit: (info: BusinessInfo) => void;
}

export default function BusinessInfoForm({ onSubmit }: BusinessInfoFormProps) {
  const [form, setForm] = useState<BusinessInfo>({
    businessName: "",
    industry: "",
    services: "",
    locations: "",
    contactEmail: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    onSubmit(form);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-1 text-lg font-semibold text-gray-900">
        Customize Your New Website
      </h3>
      <p className="mb-4 text-sm text-gray-500">
        Takes about 30 seconds. We&apos;ll build a site matched to your brand.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="businessName" className="mb-1 block text-sm font-medium text-gray-700">
              Business Name
            </label>
            <input
              id="businessName"
              type="text"
              required
              value={form.businessName}
              onChange={(e) => setForm({ ...form, businessName: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Acme Plumbing"
            />
          </div>

          <div>
            <label htmlFor="industry" className="mb-1 block text-sm font-medium text-gray-700">
              Industry
            </label>
            <input
              id="industry"
              type="text"
              required
              value={form.industry}
              onChange={(e) => setForm({ ...form, industry: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Plumbing & HVAC"
            />
          </div>
        </div>

        <div>
          <label htmlFor="contactEmail" className="mb-1 block text-sm font-medium text-gray-700">
            Contact Email
          </label>
          <input
            id="contactEmail"
            type="email"
            required
            value={form.contactEmail}
            onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="you@business.com"
          />
          <p className="mt-1 text-xs text-gray-400">
            We&apos;ll send your preview here. No spam, ever.
          </p>
        </div>

        <div>
          <label htmlFor="services" className="mb-1 block text-sm font-medium text-gray-700">
            Services (comma-separated)
          </label>
          <input
            id="services"
            type="text"
            required
            value={form.services}
            onChange={(e) => setForm({ ...form, services: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Drain cleaning, Water heater repair, Pipe fitting"
          />
        </div>

        <div>
          <label htmlFor="locations" className="mb-1 block text-sm font-medium text-gray-700">
            Locations Served (comma-separated)
          </label>
          <input
            id="locations"
            type="text"
            required
            value={form.locations}
            onChange={(e) => setForm({ ...form, locations: e.target.value })}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="Austin, Round Rock, Cedar Park"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Starting generation..." : "Generate My Website \u2192"}
        </button>
      </form>
    </div>
  );
}

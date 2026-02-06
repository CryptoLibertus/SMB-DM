"use client";

import { useState } from "react";

interface BusinessInfo {
  businessName: string;
  industry: string;
  services: string;
  locations: string;
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
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h3 className="mb-1 text-lg font-semibold text-gray-900">
        Tell us about your business
      </h3>
      <p className="mb-4 text-sm text-gray-500">
        We couldn&apos;t reach your website. Please provide some details so we can
        generate your new site.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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
          className="mt-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700"
        >
          Generate My Website
        </button>
      </form>
    </div>
  );
}

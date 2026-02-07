"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const INDUSTRIES = [
  "Plumbing & HVAC",
  "Electrical",
  "Roofing",
  "Landscaping",
  "Auto Repair",
  "Dental",
  "Medical / Healthcare",
  "Legal",
  "Accounting / Tax",
  "Real Estate",
  "Restaurant / Food Service",
  "Beauty / Salon",
  "Fitness / Gym",
  "Cleaning Services",
  "Construction",
  "Pet Services",
  "Photography",
  "Marketing / Agency",
  "IT Services / Tech",
  "Retail",
];

interface BusinessInfo {
  businessName: string;
  industry: string;
  services: string[];
  locations: string[];
  contactEmail: string;
}

interface Prefill {
  businessName?: string;
  industry?: string;
  services?: string[];
  locations?: string[];
}

interface BusinessInfoFormProps {
  onSubmit: (info: BusinessInfo) => void;
  prefill?: Prefill;
  initialEmail?: string;
  disabled?: boolean;
  disabledReason?: string;
}

function fuzzyMatchIndustry(detected: string): string {
  const lower = detected.toLowerCase();
  for (const ind of INDUSTRIES) {
    if (ind.toLowerCase() === lower) return ind;
  }
  for (const ind of INDUSTRIES) {
    if (
      ind.toLowerCase().includes(lower) ||
      lower.includes(ind.toLowerCase())
    )
      return ind;
  }
  // Check word overlap
  const detectedWords = lower.split(/[\s/&,]+/).filter(Boolean);
  for (const ind of INDUSTRIES) {
    const indWords = ind.toLowerCase().split(/[\s/&,]+/).filter(Boolean);
    if (detectedWords.some((w) => indWords.some((iw) => iw.includes(w) || w.includes(iw)))) {
      return ind;
    }
  }
  return "Other";
}

function TagInput({
  id,
  tags,
  onChange,
  placeholder,
}: {
  id: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  placeholder: string;
}) {
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const addTag = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onChange([...tags, trimmed]);
      }
      setInputValue("");
    },
    [tags, onChange]
  );

  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  return (
    <div
      className="flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-lg border border-gray-300 px-2 py-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500"
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag, i) => (
        <span
          key={i}
          className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-0.5 text-sm text-blue-700"
        >
          {tag}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              removeTag(i);
            }}
            className="ml-0.5 text-blue-400 hover:text-blue-600"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          if (inputValue.trim()) addTag(inputValue);
        }}
        className="min-w-[120px] flex-1 border-none bg-transparent py-0.5 text-sm outline-none placeholder:text-gray-400"
        placeholder={tags.length === 0 ? placeholder : "Type + Enter"}
      />
    </div>
  );
}

export default function BusinessInfoForm({
  onSubmit,
  prefill,
  initialEmail,
  disabled,
  disabledReason,
}: BusinessInfoFormProps) {
  const [businessName, setBusinessName] = useState("");
  const [industry, setIndustry] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");
  const [services, setServices] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);
  const [contactEmail, setContactEmail] = useState(initialEmail ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [prefilled, setPrefilled] = useState(false);

  // Sync initialEmail when it arrives after initial render
  useEffect(() => {
    if (initialEmail && !contactEmail) {
      setContactEmail(initialEmail);
    }
  }, [initialEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  // Apply prefill when it arrives
  useEffect(() => {
    if (!prefill || prefilled) return;

    if (prefill.businessName && !businessName) {
      setBusinessName(prefill.businessName);
    }
    if (prefill.industry) {
      const matched = fuzzyMatchIndustry(prefill.industry);
      if (matched === "Other") {
        setIndustry("Other");
        setCustomIndustry(prefill.industry);
      } else {
        setIndustry(matched);
      }
    }
    if (prefill.services && prefill.services.length > 0 && services.length === 0) {
      setServices(prefill.services);
    }
    if (prefill.locations && prefill.locations.length > 0 && locations.length === 0) {
      setLocations(prefill.locations);
    }

    setPrefilled(true);
  }, [prefill, prefilled, businessName, services.length, locations.length]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (disabled) return;
    setSubmitting(true);
    const resolvedIndustry = industry === "Other" ? customIndustry : industry;
    onSubmit({
      businessName,
      industry: resolvedIndustry,
      services,
      locations,
      contactEmail,
    });
  };

  const isDisabled = disabled || submitting;

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
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Acme Plumbing"
            />
          </div>

          <div>
            <label htmlFor="industry" className="mb-1 block text-sm font-medium text-gray-700">
              Industry
            </label>
            <select
              id="industry"
              required
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select industry...</option>
              {INDUSTRIES.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
            {industry === "Other" && (
              <input
                type="text"
                required
                value={customIndustry}
                onChange={(e) => setCustomIndustry(e.target.value)}
                className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Enter your industry"
              />
            )}
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
            value={contactEmail}
            onChange={(e) => !initialEmail && setContactEmail(e.target.value)}
            readOnly={!!initialEmail}
            className={`w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ${initialEmail ? "bg-gray-100 text-gray-500 cursor-not-allowed" : ""}`}
            placeholder="you@business.com"
          />
          <p className="mt-1 text-xs text-gray-400">
            {initialEmail ? "Email captured from your audit session." : "We\u2019ll send your preview here. No spam, ever."}
          </p>
        </div>

        <div>
          <label htmlFor="services" className="mb-1 block text-sm font-medium text-gray-700">
            Services
          </label>
          <TagInput
            id="services"
            tags={services}
            onChange={setServices}
            placeholder="Type a service and press Enter"
          />
        </div>

        <div>
          <label htmlFor="locations" className="mb-1 block text-sm font-medium text-gray-700">
            Locations Served
          </label>
          <TagInput
            id="locations"
            tags={locations}
            onChange={setLocations}
            placeholder="Type a location and press Enter"
          />
        </div>

        <button
          type="submit"
          disabled={isDisabled}
          className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {disabled && disabledReason ? (
            <>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              {disabledReason}
            </>
          ) : submitting ? (
            "Starting generation..."
          ) : (
            "Generate My Website \u2192"
          )}
        </button>
      </form>
    </div>
  );
}

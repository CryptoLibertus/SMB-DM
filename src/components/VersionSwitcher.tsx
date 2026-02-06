"use client";

import { useState, useRef, useEffect } from "react";

interface DesignMeta {
  colorPalette: string[];
  layoutType: string;
  typography: string;
}

interface Version {
  id: string;
  versionNumber: number;
  previewUrl: string;
  designMeta: DesignMeta;
  status: "generating" | "ready" | "failed";
}

interface VersionSwitcherProps {
  versions: Version[];
  selectedVersion: string | null;
  onSelect: (versionId: string) => void;
}

export default function VersionSwitcher({
  versions,
  selectedVersion,
  onSelect,
}: VersionSwitcherProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const carouselRef = useRef<HTMLDivElement>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const readyVersions = versions.filter((v) => v.status === "ready");

  useEffect(() => {
    if (selectedVersion) {
      const idx = readyVersions.findIndex((v) => v.id === selectedVersion);
      if (idx >= 0) setActiveIndex(idx);
    }
  }, [selectedVersion, readyVersions]);

  const scrollToIndex = (index: number) => {
    setActiveIndex(index);
    if (carouselRef.current) {
      const child = carouselRef.current.children[index] as HTMLElement;
      if (child) {
        child.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
      }
    }
  };

  if (readyVersions.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
        <p className="text-gray-500">Generating your website versions...</p>
      </div>
    );
  }

  // Desktop: tabs
  if (!isMobile) {
    return (
      <div>
        <div className="flex border-b border-gray-200">
          {readyVersions.map((version, index) => (
            <button
              key={version.id}
              onClick={() => {
                setActiveIndex(index);
                onSelect(version.id);
              }}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                activeIndex === index
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <span>Version {version.versionNumber}</span>
              <span className="ml-2 text-xs text-gray-400">
                {version.designMeta.layoutType}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-4">
          {readyVersions[activeIndex] && (
            <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
              <div className="bg-gray-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    {readyVersions[activeIndex].designMeta.colorPalette.map(
                      (color, i) => (
                        <div
                          key={i}
                          className="h-4 w-4 rounded-full border border-gray-200"
                          style={{ backgroundColor: color }}
                        />
                      )
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {readyVersions[activeIndex].designMeta.typography} &middot;{" "}
                    {readyVersions[activeIndex].designMeta.layoutType}
                  </span>
                </div>
              </div>
              <div className="relative aspect-[16/10] bg-white">
                <iframe
                  src={readyVersions[activeIndex].previewUrl}
                  className="h-full w-full border-0"
                  title={`Version ${readyVersions[activeIndex].versionNumber} preview`}
                />
              </div>
            </div>
          )}
        </div>

        {versions.some((v) => v.status === "generating") && (
          <p className="mt-3 text-center text-sm text-gray-500">
            {versions.filter((v) => v.status === "generating").length} more
            version(s) generating...
          </p>
        )}
      </div>
    );
  }

  // Mobile: swipe carousel
  return (
    <div>
      <div className="flex items-center justify-center gap-2 py-2">
        {readyVersions.map((_, index) => (
          <button
            key={index}
            onClick={() => scrollToIndex(index)}
            className={`h-2 rounded-full transition-all ${
              activeIndex === index ? "w-6 bg-blue-600" : "w-2 bg-gray-300"
            }`}
          />
        ))}
      </div>

      <div
        ref={carouselRef}
        className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-4"
        onScroll={(e) => {
          const el = e.currentTarget;
          const scrollLeft = el.scrollLeft;
          const width = el.clientWidth;
          const newIndex = Math.round(scrollLeft / width);
          if (newIndex !== activeIndex && newIndex >= 0 && newIndex < readyVersions.length) {
            setActiveIndex(newIndex);
          }
        }}
      >
        {readyVersions.map((version) => (
          <div
            key={version.id}
            className="w-full flex-none snap-center"
          >
            <div className="overflow-hidden rounded-lg border border-gray-200 shadow-sm">
              <div className="bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">
                    Version {version.versionNumber}
                  </span>
                  <div className="flex gap-1">
                    {version.designMeta.colorPalette.map((color, i) => (
                      <div
                        key={i}
                        className="h-3 w-3 rounded-full border border-gray-200"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="relative aspect-[9/16] bg-white sm:aspect-[16/10]">
                <iframe
                  src={version.previewUrl}
                  className="h-full w-full border-0"
                  title={`Version ${version.versionNumber} preview`}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {versions.some((v) => v.status === "generating") && (
        <p className="mt-2 text-center text-sm text-gray-500">
          {versions.filter((v) => v.status === "generating").length} more
          version(s) generating...
        </p>
      )}
    </div>
  );
}

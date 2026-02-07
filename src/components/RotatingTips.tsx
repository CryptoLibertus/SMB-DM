"use client";

import { useState, useEffect } from "react";

interface RotatingTipsProps {
  tips: string[];
  intervalMs?: number;
}

export default function RotatingTips({ tips, intervalMs = 4000 }: RotatingTipsProps) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisible(false);
      // After fade out, change tip and fade in
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % tips.length);
        setVisible(true);
      }, 300);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [tips.length, intervalMs]);

  return (
    <div className="flex min-h-[3rem] items-center justify-center">
      <p
        className={`text-center text-sm text-text-muted transition-opacity duration-300 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      >
        {tips[index]}
      </p>
    </div>
  );
}

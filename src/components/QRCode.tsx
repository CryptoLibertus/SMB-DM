"use client";

import { useMemo } from "react";

interface QRCodeProps {
  url: string;
  size?: number;
}

// Simple QR code generator using SVG-based rendering
// Generates a basic QR-like code pattern (visual placeholder)
export default function QRCode({ url, size = 200 }: QRCodeProps) {
  const modules = useMemo(() => {
    // Simple hash-based pattern generation from URL
    const grid = 25;
    const cells: boolean[][] = Array.from({ length: grid }, () =>
      Array.from({ length: grid }, () => false)
    );

    // Fixed position patterns (corners)
    const setFinderPattern = (row: number, col: number) => {
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < 7; c++) {
          if (
            r === 0 || r === 6 || c === 0 || c === 6 ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            cells[row + r][col + c] = true;
          }
        }
      }
    };

    setFinderPattern(0, 0);
    setFinderPattern(0, grid - 7);
    setFinderPattern(grid - 7, 0);

    // Generate pseudo-random data pattern from URL hash
    let hash = 0;
    for (let i = 0; i < url.length; i++) {
      hash = ((hash << 5) - hash + url.charCodeAt(i)) | 0;
    }

    for (let r = 0; r < grid; r++) {
      for (let c = 0; c < grid; c++) {
        // Skip finder pattern areas
        if (
          (r < 8 && c < 8) ||
          (r < 8 && c >= grid - 8) ||
          (r >= grid - 8 && c < 8)
        ) {
          continue;
        }
        hash = ((hash << 5) - hash + r * grid + c) | 0;
        cells[r][c] = (Math.abs(hash) % 3) === 0;
      }
    }

    return cells;
  }, [url]);

  const cellSize = size / modules.length;

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="rounded-lg border border-gray-200 bg-white p-2"
      >
        {modules.map((row, r) =>
          row.map(
            (cell, c) =>
              cell && (
                <rect
                  key={`${r}-${c}`}
                  x={c * cellSize}
                  y={r * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill="#000"
                />
              )
          )
        )}
      </svg>
      <p className="max-w-[200px] truncate text-xs text-gray-500">{url}</p>
    </div>
  );
}

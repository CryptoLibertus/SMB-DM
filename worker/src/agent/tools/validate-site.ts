import { tool } from "@anthropic-ai/claude-code";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";

export const validateSiteTool = tool(
  "validate_site",
  "Validate that the generated Next.js site in the workspace has all required files and correct structure. Returns a list of issues found, or confirms the site is valid.",
  {
    workspacePath: z
      .string()
      .describe("Absolute path to the workspace directory"),
  },
  async (args) => {
    const issues: string[] = [];

    const requiredFiles = [
      "app/page.tsx",
      "app/layout.tsx",
      "app/globals.css",
      "package.json",
      "next.config.ts",
      "tsconfig.json",
      "postcss.config.mjs",
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(args.workspacePath, file);
      try {
        await fs.access(filePath);
      } catch {
        issues.push(`Missing required file: ${file}`);
      }
    }

    // Check package.json has required dependencies
    try {
      const pkgRaw = await fs.readFile(
        path.join(args.workspacePath, "package.json"),
        "utf-8"
      );
      const pkg = JSON.parse(pkgRaw);
      const requiredDeps = ["next", "react", "react-dom"];
      for (const dep of requiredDeps) {
        if (!pkg.dependencies?.[dep]) {
          issues.push(`package.json missing dependency: ${dep}`);
        }
      }
    } catch {
      issues.push("Could not read/parse package.json");
    }

    // Check layout.tsx has html and body tags
    try {
      const layoutContent = await fs.readFile(
        path.join(args.workspacePath, "app/layout.tsx"),
        "utf-8"
      );
      if (!layoutContent.includes("<html")) {
        issues.push("app/layout.tsx missing <html> tag");
      }
      if (!layoutContent.includes("<body")) {
        issues.push("app/layout.tsx missing <body> tag");
      }
    } catch {
      // Already caught by required files check
    }

    // Check page.tsx is not empty
    try {
      const pageContent = await fs.readFile(
        path.join(args.workspacePath, "app/page.tsx"),
        "utf-8"
      );
      if (pageContent.trim().length < 50) {
        issues.push("app/page.tsx appears to be a stub or empty");
      }
    } catch {
      // Already caught by required files check
    }

    if (issues.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "VALID: All required files present and package.json is correct.",
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "text" as const,
          text: `ISSUES FOUND (${issues.length}):\n${issues.map((i) => `- ${i}`).join("\n")}\n\nPlease fix these issues before storing the version.`,
        },
      ],
    };
  }
);

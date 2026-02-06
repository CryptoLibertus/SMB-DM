# Fly.io Worker Architecture — AI Generation Pipeline

**Status:** Proposed
**Date:** Feb 6, 2026
**Replaces:** Vercel serverless generation in `src/features/generation/pipeline.ts`

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [API Contract](#2-api-contract)
3. [Worker Project Structure](#3-worker-project-structure)
4. [Agent SDK Design](#4-agent-sdk-design)
5. [Tool Definitions](#5-tool-definitions)
6. [Prompt Architecture](#6-prompt-architecture)
7. [Design Directive System](#7-design-directive-system)
8. [Progress Tracking](#8-progress-tracking)
9. [Deployment Config](#9-deployment-config)
10. [Environment Variables](#10-environment-variables)

---

## 1. System Overview

### Problem

The current generation pipeline runs inside a Vercel serverless function (`src/app/api/generate/route.ts`) using `after()` to keep the function alive. This has critical limitations:

- **300s max execution time** — not enough for 3 full site generations with Claude Opus
- **No iterative tool use** — `generateText()` from Vercel AI SDK makes a single-shot call; the model cannot read what it wrote, validate output, or iterate
- **Fire-and-forget failure** — if the `after()` callback crashes, there is no retry, no status update, and no way to recover
- **No real agent loop** — the model generates a JSON blob of files in one pass; it cannot use tools to write files, check syntax, or adjust its work

### Solution

Move the generation pipeline to a **Fly.io worker machine** running the **Claude Agent SDK** (`@anthropic-ai/claude-agent-sdk`). The Agent SDK gives us:

- **No timeout** — long-running process, not serverless
- **Agentic tool loop** — Claude can write files, validate them, check its own output, and iterate
- **Built-in tools** — Read, Write, Edit, Bash, Glob, Grep all work out of the box
- **Custom tools via MCP** — we define `update_progress` and `store_version` as in-process MCP tools
- **Session management** — context maintained across the full generation

### Architecture Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    Vercel App (Next.js)                    │
│                                                            │
│  POST /api/generate                                        │
│    1. Validate request                                     │
│    2. Create Site + 3 SiteVersion records (generating)     │
│    3. POST to Fly.io worker with generation payload        │
│    4. Return 202 { generationId } to client immediately    │
│                                                            │
│  GET /api/generate/[id]/status                             │
│    Poll siteVersions table for status updates              │
└────────────────────────┬─────────────────────────────────┘
                         │ HTTPS POST
                         ▼
┌──────────────────────────────────────────────────────────┐
│                  Fly.io Worker Machine                     │
│                                                            │
│  Express server on port 8080                               │
│                                                            │
│  POST /generate                                            │
│    1. Authenticate via shared secret                       │
│    2. Spawn 3 Agent SDK sessions (one per version)         │
│    3. Each agent: writes files to /tmp workspace           │
│    4. Agent validates output, iterates if needed           │
│    5. Store completed files → Vercel Blob Storage          │
│    6. Update siteVersions row → status: "ready"            │
│    7. Return completion summary                            │
│                                                            │
│  GET /health                                               │
│    Returns { status: "ok" }                                │
└──────────────────────────┬─────────────────────────────────┘
                           │
                           ▼
              ┌─────────────────────────┐
              │   Supabase / Neon DB    │
              │   (Vercel Postgres)     │
              │                         │
              │  sites                  │
              │  site_versions          │
              │  audit_results          │
              │  tenants                │
              └─────────────────────────┘
```

### Communication Flow

1. **Vercel app** receives user request at `POST /api/generate`
2. Vercel creates DB records (Site, 3 SiteVersions with status `"generating"`)
3. Vercel sends HTTPS POST to `https://smb-dm-worker.fly.dev/generate` with the full payload
4. Vercel returns `202 Accepted` to the client with `generationId`
5. **Fly.io worker** processes the request asynchronously:
   - Runs 3 Agent SDK sessions (sequentially or with limited parallelism)
   - Each agent writes a complete Next.js app to a temp workspace
   - Agent validates its own output (checks required files, syntax)
   - On success: stores files in Vercel Blob, updates DB row to `"ready"`
   - On failure: updates DB row to `"failed"`
6. **Client** polls `GET /api/generate/[id]/status` which reads from DB
7. Worker returns a completion summary to the original HTTP request (or times out gracefully on the Vercel side — the DB is the source of truth)

---

## 2. API Contract

### POST /generate (Worker endpoint)

**Authentication:** Bearer token via `Authorization` header. The token is a shared secret (`WORKER_AUTH_SECRET`) known to both Vercel and Fly.io.

**Request:**

```typescript
// POST https://smb-dm-worker.fly.dev/generate
// Headers: { Authorization: "Bearer <WORKER_AUTH_SECRET>" }

interface GenerateRequest {
  generationId: string;          // UUID created by Vercel
  siteId: string;                // UUID of the Site record
  versions: {
    siteVersionId: string;       // UUID of each SiteVersion record
    versionNumber: 1 | 2 | 3;
    directive: DesignDirective;  // Full directive object (name, description, colors, etc.)
  }[];
  businessContext: BusinessContext;
  auditData: AuditPipelineResult | null;
}
```

**Response (synchronous, returned when all 3 are done or timed out):**

```typescript
interface GenerateResponse {
  generationId: string;
  results: {
    versionNumber: 1 | 2 | 3;
    status: "ready" | "failed";
    previewUrl?: string;
    blobUrl?: string;
    error?: string;
    durationMs: number;
  }[];
  totalDurationMs: number;
}
```

**Note:** The Vercel app does NOT wait for this response to complete. It fires the request and returns `202` to the user immediately. The Vercel request uses a generous timeout (e.g. 600s) or fires without waiting for the response body (using `fetch` without `.await`). The worker updates the DB directly as each version completes, so the client sees progress via polling regardless of whether the HTTP response completes.

### GET /health (Worker endpoint)

**No auth required.**

```typescript
// GET https://smb-dm-worker.fly.dev/health
// Response: { status: "ok", uptime: 12345 }
```

---

## 3. Worker Project Structure

```
worker/
├── ARCHITECTURE.md            # This document
├── Dockerfile                 # Multi-stage Node.js build
├── fly.toml                   # Fly.io machine config
├── package.json               # Worker-specific dependencies
├── tsconfig.json              # TypeScript config
├── .env.example               # Required environment variables
│
├── src/
│   ├── index.ts               # Express server entry point
│   ├── routes/
│   │   ├── generate.ts        # POST /generate handler
│   │   └── health.ts          # GET /health handler
│   │
│   ├── agent/
│   │   ├── run-generation.ts  # Orchestrates 3 agent sessions
│   │   ├── agent-config.ts    # Agent SDK options, tools, prompt builder
│   │   ├── system-prompt.ts   # Master system prompt with frontend-design skill
│   │   └── tools/
│   │       ├── index.ts       # createSdkMcpServer with all custom tools
│   │       ├── update-progress.ts   # Tool: update DB progress
│   │       ├── store-version.ts     # Tool: store files to Blob + update DB
│   │       └── validate-site.ts     # Tool: validate generated site structure
│   │
│   ├── db/
│   │   ├── client.ts          # postgres + drizzle connection
│   │   └── schema.ts          # Re-export or copy of main app schema
│   │
│   ├── lib/
│   │   ├── blob-storage.ts    # Vercel Blob upload helper
│   │   └── auth.ts            # Bearer token verification middleware
│   │
│   └── types/
│       ├── api.ts             # Request/response types
│       ├── generation.ts      # BusinessContext, DesignDirective, etc.
│       └── audit.ts           # AuditPipelineResult type
│
└── workspaces/                # Ephemeral — agent writes files here at runtime
    └── .gitkeep
```

### Key Design Decisions

- **Separate `package.json`**: The worker has its own dependencies (`@anthropic-ai/claude-agent-sdk`, `express`, `postgres`, `drizzle-orm`, `@vercel/blob`, `zod`). It does NOT depend on Next.js or the main app.
- **Shared schema**: The DB schema types are duplicated (or symlinked) from the main app's `src/db/schema.ts`. This avoids importing the entire Next.js app. In practice, we copy the relevant table definitions.
- **Workspace isolation**: Each generation gets a temp directory under `/tmp/gen-<generationId>/v<N>/`. The agent writes files there, then the `store_version` tool uploads them to Blob.
- **No Vercel AI SDK**: The worker uses the Claude Agent SDK directly, NOT the Vercel AI SDK (`ai` package). The Agent SDK provides a complete agentic loop with built-in tools.

---

## 4. Agent SDK Design

### Overview

Each of the 3 site versions is generated by a separate Agent SDK `query()` call. The agent receives a comprehensive system prompt (containing the frontend-design skill patterns) and a user prompt (containing business context, audit data, and the version-specific design directive).

The agent has access to:
- **Built-in tools**: `Write`, `Read`, `Edit`, `Bash`, `Glob` (for writing and validating files in the workspace)
- **Custom MCP tools**: `update_progress`, `store_version`, `validate_site` (for interacting with our infrastructure)

### Agent Session Setup

```typescript
import { query, tool, createSdkMcpServer } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

// Create custom tools MCP server (see Section 5 for tool details)
const workerTools = createSdkMcpServer({
  name: "worker-tools",
  version: "1.0.0",
  tools: [updateProgressTool, storeVersionTool, validateSiteTool]
});

async function generateVersion(
  siteId: string,
  siteVersionId: string,
  versionNumber: number,
  directive: DesignDirective,
  businessContext: BusinessContext,
  auditData: AuditPipelineResult | null
): Promise<{ status: "ready" | "failed"; error?: string }> {

  const workspacePath = `/tmp/gen-${siteId}/v${versionNumber}`;
  await fs.mkdir(workspacePath, { recursive: true });

  const systemPrompt = buildSystemPrompt(directive, versionNumber);
  const userPrompt = buildUserPrompt(directive, businessContext, auditData, workspacePath);

  try {
    for await (const message of query({
      prompt: userPrompt,
      options: {
        systemPrompt,
        model: "claude-opus-4-6",
        cwd: workspacePath,
        allowedTools: [
          "Write", "Read", "Edit", "Bash", "Glob",
          "mcp__worker-tools__update_progress",
          "mcp__worker-tools__store_version",
          "mcp__worker-tools__validate_site",
        ],
        mcpServers: {
          "worker-tools": workerTools,
        },
        permissionMode: "bypassPermissions",
        allowDangerouslySkipPermissions: true,
        maxTurns: 40,
        maxBudgetUsd: 8.00, // Safety cap per version
      }
    })) {
      // Stream processing for logging/monitoring
      if (message.type === "result") {
        if (message.subtype === "success") {
          return { status: "ready" };
        } else {
          return { status: "failed", error: message.errors?.join(", ") };
        }
      }
    }

    return { status: "ready" };
  } catch (err) {
    return { status: "failed", error: err instanceof Error ? err.message : "Unknown error" };
  }
}
```

### Orchestration: 3 Versions

The three versions are generated sequentially by default (to avoid overloading API rate limits and to keep memory manageable on a single Fly machine). If performance is critical, we can use limited parallelism (2 at a time).

```typescript
// src/agent/run-generation.ts

export async function runGeneration(req: GenerateRequest): Promise<GenerateResponse> {
  const startTime = Date.now();
  const results = [];

  for (const version of req.versions) {
    const versionStart = Date.now();

    // Update DB: mark this version as actively generating
    await updateSiteVersionStatus(version.siteVersionId, "generating");

    const result = await generateVersion(
      req.siteId,
      version.siteVersionId,
      version.versionNumber,
      version.directive,
      req.businessContext,
      req.auditData
    );

    results.push({
      versionNumber: version.versionNumber,
      status: result.status,
      previewUrl: result.previewUrl,
      blobUrl: result.blobUrl,
      error: result.error,
      durationMs: Date.now() - versionStart,
    });
  }

  return {
    generationId: req.generationId,
    results,
    totalDurationMs: Date.now() - startTime,
  };
}
```

### Why Sequential, Not Parallel

- **API rate limits**: Claude Opus has per-account rate limits. Running 3 agents in parallel triples the token throughput demand.
- **Memory**: Each Agent SDK session maintains context. 3 simultaneous sessions could consume 3-4 GiB RAM.
- **User experience**: Versions appear one-at-a-time in the UI as each completes. The first version is visible to the user while versions 2 and 3 generate. This is a better UX than all-or-nothing.
- **Future optimization**: If rate limits allow, switch to `Promise.allSettled()` with 2-3 parallel sessions.

---

## 5. Tool Definitions

The agent has both built-in tools (from the Agent SDK) and custom tools (defined via `createSdkMcpServer`).

### Built-in Tools (from Agent SDK)

| Tool | Purpose in Generation |
|------|----------------------|
| **Write** | Write generated source files (`app/page.tsx`, `app/layout.tsx`, etc.) to the workspace |
| **Read** | Read back files to verify content, check for errors |
| **Edit** | Fix issues in already-written files (e.g., fix import paths, typos) |
| **Bash** | Run `npx tsc --noEmit` to type-check, or `node -e "..."` to validate JSON |
| **Glob** | List files in the workspace to verify completeness |

### Custom MCP Tools

#### `update_progress`

Updates the generation progress in the database so the frontend can show real-time status.

```typescript
// src/agent/tools/update-progress.ts
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";

export const updateProgressTool = tool(
  "update_progress",
  "Update the generation progress for this site version. Call this after completing major milestones: initial file generation, validation pass, fixes applied.",
  {
    siteVersionId: z.string().uuid().describe("The site version ID being generated"),
    stage: z.enum([
      "generating_files",
      "validating",
      "fixing_issues",
      "storing",
      "complete",
      "failed"
    ]).describe("Current generation stage"),
    message: z.string().describe("Human-readable progress message"),
  },
  async (args) => {
    await db
      .update(siteVersions)
      .set({
        // We store progress in the designMeta JSONB field as a sub-key
        // OR we add a progress_stage column. For now, use console + DB status.
      })
      .where(eq(siteVersions.id, args.siteVersionId));

    console.log(`[v${args.siteVersionId}] ${args.stage}: ${args.message}`);

    return {
      content: [{ type: "text", text: `Progress updated: ${args.stage}` }]
    };
  }
);
```

#### `validate_site`

Validates that the generated site has all required files and correct structure.

```typescript
// src/agent/tools/validate-site.ts
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";

export const validateSiteTool = tool(
  "validate_site",
  "Validate that the generated Next.js site in the workspace has all required files and correct structure. Returns a list of issues found, or confirms the site is valid.",
  {
    workspacePath: z.string().describe("Absolute path to the workspace directory"),
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
        path.join(args.workspacePath, "package.json"), "utf-8"
      );
      const pkg = JSON.parse(pkgRaw);
      const requiredDeps = ["next", "react", "react-dom"];
      for (const dep of requiredDeps) {
        if (!pkg.dependencies?.[dep]) {
          issues.push(`package.json missing dependency: ${dep}`);
        }
      }
    } catch (e) {
      issues.push("Could not read/parse package.json");
    }

    if (issues.length === 0) {
      return {
        content: [{ type: "text", text: "VALID: All required files present and package.json is correct." }]
      };
    }

    return {
      content: [{
        type: "text",
        text: `ISSUES FOUND (${issues.length}):\n${issues.map(i => `- ${i}`).join("\n")}\n\nPlease fix these issues before storing the version.`
      }]
    };
  }
);
```

#### `store_version`

Uploads the completed site files to Vercel Blob Storage and updates the database.

```typescript
// src/agent/tools/store-version.ts
import { tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import * as fs from "fs/promises";
import * as path from "path";
import { put } from "@vercel/blob";

export const storeVersionTool = tool(
  "store_version",
  "Store the completed site version. Reads all files from the workspace, uploads them to Vercel Blob Storage as a JSON bundle, and updates the database record to 'ready'. Call this only AFTER validate_site returns VALID.",
  {
    workspacePath: z.string().describe("Absolute path to the workspace directory"),
    siteId: z.string().uuid().describe("The site ID"),
    siteVersionId: z.string().uuid().describe("The site version ID"),
    versionNumber: z.number().min(1).max(3).describe("Version number (1, 2, or 3)"),
  },
  async (args) => {
    // Recursively read all files in workspace into a flat map
    const files: Record<string, string> = {};
    await collectFiles(args.workspacePath, args.workspacePath, files);

    // Upload to Vercel Blob
    const payload = JSON.stringify(files);
    const blobPath = `sites/${args.siteId}/v${args.versionNumber}/source.json`;
    const blob = await put(blobPath, payload, {
      access: "public",
      contentType: "application/json",
    });

    // Update DB: mark version as ready
    const previewUrl = `https://preview-${args.siteId.slice(0, 8)}-v${args.versionNumber}.vercel.app`;
    await db
      .update(siteVersions)
      .set({
        generatedCodeRef: blob.url,
        previewUrl,
        status: "ready",
      })
      .where(eq(siteVersions.id, args.siteVersionId));

    return {
      content: [{
        type: "text",
        text: `Version ${args.versionNumber} stored successfully.\nBlob URL: ${blob.url}\nPreview URL: ${previewUrl}\nFiles stored: ${Object.keys(files).length}`
      }]
    };
  }
);

async function collectFiles(
  basePath: string,
  currentPath: string,
  files: Record<string, string>
) {
  const entries = await fs.readdir(currentPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name);
    if (entry.isDirectory()) {
      // Skip node_modules and .next
      if (entry.name === "node_modules" || entry.name === ".next") continue;
      await collectFiles(basePath, fullPath, files);
    } else {
      const relativePath = path.relative(basePath, fullPath);
      files[relativePath] = await fs.readFile(fullPath, "utf-8");
    }
  }
}
```

---

## 6. Prompt Architecture

### Why Prompts Matter Here

The current pipeline (`src/features/generation/prompts.ts`) uses a single-shot prompt that asks Claude to output a massive JSON object containing all file contents. This approach:

- Produces generic output (no iteration, no self-review)
- Fails often because the JSON is malformed or missing files
- Cannot adapt — if one file has an issue, the whole generation fails

The Agent SDK approach lets Claude work like a developer:

1. Plan the site structure
2. Write files one at a time
3. Read back files to check them
4. Run validation
5. Fix issues
6. Store the final result

### System Prompt Structure

The system prompt is the cornerstone. It combines:

1. **Role and task definition** — what the agent is doing
2. **Frontend-design skill patterns** — detailed guidance on producing high-quality, distinctive designs
3. **Technical constraints** — Next.js App Router, Tailwind v4, TypeScript
4. **Tool usage instructions** — when to use each tool
5. **Quality standards** — Lighthouse 80+, responsive, accessible

```typescript
// src/agent/system-prompt.ts

export function buildSystemPrompt(
  directive: DesignDirective,
  versionNumber: number
): string {
  return `You are an expert frontend developer building a complete, production-quality Next.js website for a small business. You write files directly to the workspace using the Write tool, then validate and store the result.

## Your Task

Generate a complete, deployable Next.js application for a small business website. This is version ${versionNumber} of 3 — each version must have a GENUINELY DIFFERENT visual design. Your design directive is "${directive.name}".

## Technical Stack

- Next.js 15+ with App Router (app/ directory)
- TypeScript for all files
- Tailwind CSS v4 for all styling
- No external image URLs — use colored div placeholders, SVG shapes, or CSS gradients
- No packages beyond: next, react, react-dom, tailwindcss, @tailwindcss/postcss, postcss

## Required Files

You MUST create all of these files:
- app/page.tsx — Homepage with hero, services, testimonials, contact, footer
- app/layout.tsx — Root layout with <html>, <head>, metadata, font imports
- app/globals.css — Tailwind directives and custom styles
- package.json — Dependencies (next, react, react-dom, tailwindcss, etc.)
- next.config.ts — Next.js config
- tsconfig.json — TypeScript config
- postcss.config.mjs — PostCSS config for Tailwind
- tailwind.config.ts — Tailwind theme with custom colors, fonts, spacing

Optional but encouraged:
- app/about/page.tsx — About page
- app/services/page.tsx — Services detail page
- app/contact/page.tsx — Contact page with form
- components/ — Reusable UI components (Header, Footer, Hero, etc.)

## Frontend Design Skill — CRITICAL

You must apply these principles to produce a professional, distinctive design:

### Layout & Visual Hierarchy
- Use whitespace deliberately — generous padding and margins create a premium feel
- Establish clear visual hierarchy with type scale (display, heading, body, caption sizes)
- Use a consistent spacing scale (e.g., 4px base: 4, 8, 12, 16, 24, 32, 48, 64, 96)
- Break sections with visual rhythm — alternate backgrounds, border treatments, or layout shifts
- Anchor the page with a strong hero (full-width, above the fold, single clear CTA)

### Color & Typography
- Stick to the directive color palette — use the primary color for CTAs and key accents only
- Use neutral tones (grays, off-whites) for most of the page — let the brand color pop through contrast
- Choose ONE display/heading font and ONE body font maximum
- Set line-height for readability: 1.5-1.7 for body, 1.1-1.3 for headings
- Use font-weight to create emphasis, not just color or size

### Components & Patterns
- Hero section: bold headline (5-8 words), 1-line subtext, primary CTA button, visual element
- Services section: 3-4 cards with icon/illustration, title, short description
- Social proof: testimonials with name and role, or trust badges/logos
- Contact section: phone (tel: link), email (mailto: link), address, optional form
- Footer: business name, nav links, phone, email, copyright
- Use hover/focus states on all interactive elements
- Use subtle transitions (150-200ms) for hover effects

### Responsive Design
- Mobile-first approach — design for 320px-428px first, then scale up
- Stack layouts vertically on mobile, use grid/flex on desktop
- Hamburger menu on mobile, horizontal nav on desktop
- Touch-friendly tap targets (minimum 44x44px)
- Test that text is readable without zooming on mobile

### Performance
- No external images — use CSS gradients, SVG, or colored divs as placeholders
- Minimize JavaScript — prefer server components, use 'use client' only when needed
- Proper semantic HTML (<main>, <section>, <nav>, <header>, <footer>, <article>)
- Include alt text on all images/icons (even placeholder ones)

### What Makes Each Version DIFFERENT
This is version ${versionNumber}: "${directive.name}"
${directive.description}

You must make this version visually DISTINCT from the others:
- Different layout structure (grid vs. single-column vs. asymmetric)
- Different color application (dark hero vs. light hero vs. warm tones)
- Different spacing rhythm (tight and dense vs. airy and spacious)
- Different component shapes (sharp corners vs. rounded vs. mixed)
- Different typography weight distribution (heavy headlines vs. elegant thin)

## Workflow

Follow this exact workflow:

1. **Plan**: Think about the site structure, sections, and how the design directive shapes the visual output
2. **Write files**: Use the Write tool to create each file. Start with package.json and config files, then layout, then pages.
3. **Validate**: Call the validate_site tool to check all required files are present
4. **Fix**: If validation finds issues, use Edit to fix them
5. **Store**: Once valid, call store_version to upload to Blob Storage and mark as ready
6. **Report**: Call update_progress at each major milestone

## Important Rules

- Write REAL, production-quality code — not placeholder stubs
- Every component must be responsive (works on 320px mobile to 1440px desktop)
- Phone numbers must use tel: links
- Email addresses must use mailto: links
- Include proper SEO metadata in layout.tsx (title, description, Open Graph)
- Include clear, visible CTAs (call to action buttons)
- DO NOT use any external image URLs or CDN links for images
- DO NOT use any npm packages not listed in your package.json
- DO NOT create node_modules or .next directories
- Write complete file contents — no "..." or "// rest of code here" shortcuts`;
}
```

### User Prompt

The user prompt provides the business-specific context:

```typescript
// Inside agent-config.ts

export function buildUserPrompt(
  directive: DesignDirective,
  businessContext: BusinessContext,
  auditData: AuditPipelineResult | null,
  workspacePath: string
): string {
  let prompt = `Generate a complete Next.js website for this business.

## Business Information
- Business Name: ${businessContext.businessName}
- Industry: ${businessContext.industry}
- Services: ${businessContext.services.join(", ") || "General services"}
- Locations: ${businessContext.locations.join(", ") || "Local area"}
- Phone: ${businessContext.phone || "Not provided"}
- Email: ${businessContext.contactEmail}
- Target Keywords: ${businessContext.targetKeywords.join(", ") || "None specified"}

## Design Directive: "${directive.name}"
${directive.description}

Color Palette: ${directive.colorPalette.join(", ")}
Layout Type: ${directive.layoutType}
Typography: ${directive.typography}`;

  if (auditData) {
    prompt += `

## Current Website Audit Data
- SEO Score: ${auditData.seoScore}/100
- Mobile Score: ${auditData.mobileScore}/100
- Current Title: ${auditData.metaTags.title || "None"}
- Current Description: ${auditData.metaTags.description || "None"}
- Current H1s: ${auditData.metaTags.h1s.join(", ") || "None"}
- Detected CTAs: ${auditData.ctaAnalysis.elements.map(e => `${e.type}: "${e.text}"`).join(", ") || "None"}
- Analytics: GA4=${auditData.analyticsDetected.ga4}, GTM=${auditData.analyticsDetected.gtm}

Use this data to improve upon the existing site. Address the weaknesses found (missing meta tags, low SEO score, missing CTAs).`;
  }

  prompt += `

## Workspace
Write all files to the current working directory: ${workspacePath}

## Context IDs (for tool calls)
- siteVersionId: (will be provided via tool context)
- siteId: (will be provided via tool context)
- versionNumber: ${directive.versionNumber}

Begin by planning the site structure, then write all files. After writing, validate with validate_site, fix any issues, then call store_version.`;

  return prompt;
}
```

---

## 7. Design Directive System

### Current Directives (from `src/features/generation/types.ts`)

The 3 directives are designed to produce visually distinct sites:

| Version | Name | Layout | Color Strategy | Typography |
|---------|------|--------|---------------|------------|
| 1 | Modern & Bold | Full-width dark hero, bold gradients, high contrast | Dark navy (#0F172A) primary, bright blue (#3B82F6) accents, yellow (#EAB308) CTAs | Inter / bold weights |
| 2 | Clean & Professional | White-space-heavy, structured grid, corporate feel | White (#FFFFFF) background, navy (#1E3A5F) headings, sky blue (#0EA5E9) accents | Source Sans Pro / regular weights |
| 3 | Warm & Friendly | Rounded corners, soft shadows, approachable | Warm cream (#FFF7ED) base, orange (#EA580C) accents, green (#16A34A) CTAs | Nunito / medium weights |

### How Distinctiveness is Enforced

1. **System prompt per version**: Each agent session receives the specific directive embedded in its system prompt. The prompt explicitly says "make this DIFFERENT from the other versions" and describes exactly how.

2. **Structural differentiation**: The directives specify not just colors but layout approach:
   - V1: Bold hero with gradient overlays, asymmetric grid, dark sections
   - V2: Clean top-nav, card-based grid, lots of whitespace, formal tone
   - V3: Rounded everything, soft pastel sections, playful illustrations, casual tone

3. **Typography differentiation**: Each version uses a different font family with different weight distributions, creating instantly recognizable visual personality.

4. **Agent validation**: Because the agent can read its own output, it can verify it followed the directive. The system prompt instructs the agent to review the visual distinctiveness before storing.

### Extending Directives

To add industry-specific directives or allow users to customize, the `DesignDirective` interface can be extended:

```typescript
interface DesignDirective {
  versionNumber: 1 | 2 | 3;
  name: string;
  description: string;
  colorPalette: string[];
  layoutType: string;
  typography: string;
  // Future extensions:
  // industry?: string;        // Industry-specific section suggestions
  // heroStyle?: string;       // "gradient" | "image-placeholder" | "split"
  // sectionOrder?: string[];  // Custom section ordering
}
```

---

## 8. Progress Tracking

### Database as Source of Truth

The frontend polls `GET /api/generate/[id]/status` on the Vercel side. This endpoint reads from the `site_versions` table:

```sql
SELECT id, version_number, status, preview_url, design_meta
FROM site_versions
WHERE site_id = (SELECT id FROM sites WHERE generation_id = $1)
ORDER BY version_number;
```

The client receives:
- Version 1: `"generating"` / `"ready"` / `"failed"`
- Version 2: `"generating"` / `"ready"` / `"failed"`
- Version 3: `"generating"` / `"ready"` / `"failed"`

Each version transitions independently.

### Progress Flow

```
                   Time →

Version 1: [generating] ──────────────── [ready]
Version 2:              [generating] ──────────────── [ready]
Version 3:                            [generating] ──────────── [ready]

Client sees:  0/3 ready     1/3 ready     2/3 ready     3/3 ready
              (show loader)  (show V1)     (show V1+V2)  (show all)
```

### Update Mechanisms

1. **Agent calls `update_progress` tool**: The agent calls this at milestones (generating files, validating, fixing, storing). These updates are logged server-side.

2. **Agent calls `store_version` tool**: This is the definitive status change — it sets `status = "ready"` in the DB and provides the `previewUrl` and `generatedCodeRef`.

3. **On failure**: If the agent errors out (max turns, budget exceeded, unrecoverable error), the orchestrator catches the error and sets `status = "failed"`:

```typescript
// In run-generation.ts, after agent completes
if (result.status === "failed") {
  await db
    .update(siteVersions)
    .set({ status: "failed" })
    .where(eq(siteVersions.id, version.siteVersionId));
}
```

---

## 9. Deployment Config

### fly.toml

```toml
app = "smb-dm-worker"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = "stop"
  auto_start_machines = true
  min_machines_running = 0
  processes = ["app"]

  [http_service.concurrency]
    type = "requests"
    hard_limit = 5
    soft_limit = 3

[[vm]]
  size = "performance-2x"
  memory = "4gb"
  cpus = 2

[checks]
  [checks.health]
    port = 8080
    type = "http"
    interval = "30s"
    timeout = "5s"
    grace_period = "10s"
    method = "GET"
    path = "/health"
```

**Key decisions:**

- **`auto_stop_machines = "stop"`**: The machine stops when idle (no active requests). This saves costs when no generation is running.
- **`auto_start_machines = true`**: When a request arrives, Fly boots the machine. Cold start is ~5-10s for a Node.js container.
- **`min_machines_running = 0`**: No machines running when idle. Cost is zero when no generation is happening.
- **`memory = "4gb"`**: Agent SDK sessions can use significant memory for context. 4 GiB handles one sequential generation safely.
- **`performance-2x`**: Dedicated CPU for consistent performance (shared CPUs can cause timeouts during I/O-heavy agent work).
- **Concurrency hard limit 5**: Prevents overload. In practice, only 1-3 generations run at a time.

### Dockerfile

```dockerfile
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci --production=false

# Copy source
COPY tsconfig.json ./
COPY src/ ./src/

# Build TypeScript
RUN npx tsc

# Production stage
FROM node:20-slim

WORKDIR /app

# Install Claude Code CLI (required by Agent SDK)
RUN npm install -g @anthropic-ai/claude-code

# Copy built output and production deps
COPY package.json package-lock.json ./
RUN npm ci --production

COPY --from=builder /app/dist/ ./dist/

# Create workspace directory
RUN mkdir -p /tmp/workspaces

EXPOSE 8080

CMD ["node", "dist/index.js"]
```

**Important**: The Agent SDK requires the Claude Code CLI to be installed globally (`npm install -g @anthropic-ai/claude-code`). The SDK spawns it as a subprocess.

### Secrets Configuration

Set secrets via `fly secrets set`:

```bash
fly secrets set \
  ANTHROPIC_API_KEY="sk-ant-..." \
  DATABASE_URL="postgres://..." \
  BLOB_READ_WRITE_TOKEN="vercel_blob_..." \
  WORKER_AUTH_SECRET="a-strong-random-secret-here"
```

---

## 10. Environment Variables

### Fly.io Worker (required)

| Variable | Source | Purpose |
|----------|--------|---------|
| `ANTHROPIC_API_KEY` | Anthropic Console | Claude API access for Agent SDK |
| `DATABASE_URL` | Vercel/Neon dashboard | Direct Postgres connection to Neon DB |
| `BLOB_READ_WRITE_TOKEN` | Vercel dashboard (Blob settings) | Upload generated files to Vercel Blob Storage |
| `WORKER_AUTH_SECRET` | Generated (shared) | Authenticate requests from Vercel app |
| `NODE_ENV` | fly.toml | Set to `production` |
| `PORT` | fly.toml | Set to `8080` |

### Vercel App (new/changed)

| Variable | Purpose |
|----------|---------|
| `WORKER_URL` | Base URL of the Fly.io worker (e.g., `https://smb-dm-worker.fly.dev`) |
| `WORKER_AUTH_SECRET` | Same shared secret as the worker, used in Authorization header |

### Variables NOT Needed on Fly.io

| Variable | Why Not |
|----------|---------|
| `VERCEL_API_TOKEN` | Worker does not deploy to Vercel — it stores files in Blob. Deployment is still triggered by the Vercel app. |
| `STRIPE_SECRET_KEY` | Billing is handled entirely by the Vercel app |
| `RESEND_API_KEY` | Email is handled by the Vercel app |
| `POSTHOG_API_KEY` | Analytics is handled by the Vercel app |

---

## Appendix A: Migration Path

### Changes to Vercel App

1. **`src/app/api/generate/route.ts`**: Replace the `after()` fire-and-forget pattern with an HTTPS POST to the worker. The route still creates DB records, but delegates the actual generation to Fly.io.

2. **`src/features/generation/pipeline.ts`**: This file becomes obsolete for the primary flow. Keep it as a fallback or remove it.

3. **`src/features/generation/prompts.ts`**: The prompt logic moves to the worker's `system-prompt.ts`. The Vercel-side file can be removed or kept for reference.

4. **`src/lib/ai.ts`**: The `generation` model config is no longer used on the Vercel side. The worker uses the Agent SDK directly with `claude-opus-4-6`.

5. **New file: `src/features/generation/worker-client.ts`**: A thin client that POSTs to the worker:

```typescript
export async function triggerWorkerGeneration(payload: GenerateRequest): Promise<void> {
  const res = await fetch(`${process.env.WORKER_URL}/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.WORKER_AUTH_SECRET}`,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    throw new Error(`Worker returned ${res.status}: ${await res.text()}`);
  }

  // We don't await the response body — the DB is the source of truth
}
```

### Rollback Plan

If the Fly.io worker fails or is unavailable:
- The Vercel `POST /api/generate` endpoint can fall back to the existing `runGenerationPipeline()` (the current serverless approach)
- This is degraded (no agent loop, 300s limit) but functional for simple sites
- Feature flag: `USE_WORKER=true` in Vercel env vars controls which path is used

---

## Appendix B: Cost Estimates

### Fly.io Costs

| Component | Cost |
|-----------|------|
| Machine (performance-2x, 4GB) per hour | ~$0.06/hr |
| Average generation time (3 versions, sequential) | ~10-15 minutes |
| Cost per generation | ~$0.01-0.02 |
| 200 clients onboarded/month | ~$2-4/month |

Machines auto-stop when idle, so cost is purely usage-based.

### Claude API Costs (per generation, 3 versions)

| Component | Estimate |
|-----------|----------|
| Input tokens (system prompt + context) per version | ~8K tokens |
| Output tokens (file generation) per version | ~15K tokens |
| Agent loop overhead (validation, fixes) per version | ~5K tokens |
| Total per version (Opus 4.6 pricing) | ~$1.50-2.50 |
| **Total per generation (3 versions)** | **~$4.50-7.50** |

This aligns with the PRD estimate of $1.50-6.00 per client onboarding.

---

## Appendix C: Security Considerations

1. **Auth**: Worker only accepts requests with a valid `WORKER_AUTH_SECRET` bearer token. No public endpoints except `/health`.

2. **DB access**: Worker connects to the same Neon Postgres instance as the Vercel app. It only writes to `site_versions` (status updates). It reads from `audit_results` and `tenants`.

3. **Agent sandboxing**: The Agent SDK runs with `permissionMode: "bypassPermissions"` because this is a backend service with no human in the loop. The workspace is ephemeral (`/tmp/`) and cleaned up after each generation.

4. **Blob storage**: Files uploaded via `@vercel/blob` with `access: "public"`. This is consistent with the current implementation in `src/features/generation/storage.ts`.

5. **Network**: The Fly.io machine needs outbound HTTPS to:
   - `api.anthropic.com` (Claude API)
   - Neon Postgres endpoint (DB)
   - `blob.vercel-storage.com` (Blob uploads)
   - No other outbound access required.

6. **Budget caps**: Each agent session has `maxBudgetUsd: 8.00` to prevent runaway costs from infinite loops.

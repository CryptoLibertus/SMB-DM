import type { AuditStageEvent } from "./types";

/**
 * In-memory store for audit stage events.
 * Used to bridge between the pipeline (which emits events) and the SSE endpoint (which streams them).
 *
 * For production at scale, this would be replaced with Redis pub/sub.
 * For MVP on a single Vercel serverless instance, this works because the POST handler
 * starts the pipeline and the SSE handler polls in the same process.
 */

interface AuditProgress {
  events: AuditStageEvent[];
  isComplete: boolean;
}

const store = new Map<string, AuditProgress>();

export function pushEvent(auditId: string, event: AuditStageEvent): void {
  let progress = store.get(auditId);
  if (!progress) {
    progress = { events: [], isComplete: false };
    store.set(auditId, progress);
  }
  progress.events.push(event);
  if (event.stageName === "complete" || event.stageName === "error") {
    progress.isComplete = true;
  }
}

export function getEvents(
  auditId: string,
  afterIndex: number
): { events: AuditStageEvent[]; isComplete: boolean } {
  const progress = store.get(auditId);
  if (!progress) return { events: [], isComplete: false };
  return {
    events: progress.events.slice(afterIndex),
    isComplete: progress.isComplete,
  };
}

export function cleanupAudit(auditId: string): void {
  store.delete(auditId);
}

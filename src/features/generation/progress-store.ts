import type { GenerationStageEvent } from "./types";

/**
 * In-memory store for generation progress events.
 * Same pattern as audit progress-store.
 * Bridges between the pipeline (emits events) and the SSE endpoint (streams them).
 */

interface GenerationProgress {
  events: GenerationStageEvent[];
  isComplete: boolean;
}

const store = new Map<string, GenerationProgress>();

export function pushEvent(
  generationId: string,
  event: GenerationStageEvent
): void {
  let progress = store.get(generationId);
  if (!progress) {
    progress = { events: [], isComplete: false };
    store.set(generationId, progress);
  }
  progress.events.push(event);
  if (event.stage === "complete" || event.stage === "error") {
    progress.isComplete = true;
  }
}

export function getEvents(
  generationId: string,
  afterIndex: number
): { events: GenerationStageEvent[]; isComplete: boolean } {
  const progress = store.get(generationId);
  if (!progress) return { events: [], isComplete: false };
  return {
    events: progress.events.slice(afterIndex),
    isComplete: progress.isComplete,
  };
}

export function cleanup(generationId: string): void {
  store.delete(generationId);
}

import { NextRequest } from "next/server";
import {
  getEvents,
  cleanupAudit,
} from "@/features/audit/progress-store";

const POLL_INTERVAL_MS = 500;
const MAX_WAIT_MS = 90_000; // 90 second timeout for the full SSE connection

// GET /api/audit/[id]/status — SSE stream for audit progress
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      let eventIndex = 0;
      const startTime = Date.now();

      const sendEvent = (data: unknown) => {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
        );
      };

      // Poll for new events from the progress store
      while (Date.now() - startTime < MAX_WAIT_MS) {
        const { events, isComplete } = getEvents(id, eventIndex);

        for (const event of events) {
          sendEvent(event);
          eventIndex++;
        }

        if (isComplete) {
          // Cleanup the in-memory store after streaming is done
          cleanupAudit(id);
          break;
        }

        // Check if client disconnected
        if (req.signal.aborted) {
          break;
        }

        // Wait before next poll
        await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
      }

      // If we timed out, send a timeout event
      if (Date.now() - startTime >= MAX_WAIT_MS) {
        sendEvent({
          stage: 0,
          totalStages: 4,
          stageName: "error",
          message: "Audit timed out. Partial results may be available.",
          auditId: id,
        });
        cleanupAudit(id);
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

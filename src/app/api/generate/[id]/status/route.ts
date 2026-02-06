import { NextRequest } from "next/server";
import { getEvents, cleanup } from "@/features/generation/progress-store";

// GET /api/generate/[id]/status — SSE stream for generation progress
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const encoder = new TextEncoder();
  let eventIndex = 0;
  let intervalId: ReturnType<typeof setInterval>;

  const stream = new ReadableStream({
    start(controller) {
      intervalId = setInterval(() => {
        const { events, isComplete } = getEvents(id, eventIndex);

        for (const event of events) {
          const data = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(encoder.encode(data));
          eventIndex++;
        }

        if (isComplete) {
          clearInterval(intervalId);
          // Schedule cleanup after a short delay
          setTimeout(() => cleanup(id), 30_000);
          controller.close();
        }
      }, 500);
    },
    cancel() {
      clearInterval(intervalId);
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

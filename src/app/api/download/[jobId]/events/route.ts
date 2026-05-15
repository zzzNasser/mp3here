import { getJob, publicJob, subscribeToJob } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = {
  params: Promise<{ jobId: string }> | { jobId: string };
};

export async function GET(request: Request, context: RouteContext) {
  const params = await context.params;
  const job = getJob(params.jobId);

  if (!job) {
    return new Response("Job not found", { status: 404 });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      let closed = false;

      const send = () => {
        if (closed) {
          return;
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify(publicJob(job))}\n\n`));

        if (job.status === "completed" || job.status === "failed") {
          closed = true;
          cleanup();
          setTimeout(() => {
            try {
              controller.close();
            } catch {
              // The browser may already have closed the stream.
            }
          }, 300);
        }
      };

      const unsubscribe = subscribeToJob(params.jobId, send);
      const keepAlive = setInterval(send, 15000);

      const cleanup = () => {
        clearInterval(keepAlive);
        unsubscribe();
      };

      request.signal.addEventListener("abort", () => {
        closed = true;
        cleanup();
      });

      send();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

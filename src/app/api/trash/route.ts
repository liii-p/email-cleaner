import { errorMessage, errorResponse, parseQuery } from "@/lib/api";
import { gmailFor, listAllIds, trashIds } from "@/lib/gmail";

export type TrashEvent =
  | { type: "listing"; found: number }
  | { type: "progress"; done: number; total: number }
  | { type: "done"; total: number }
  | { type: "error"; message: string };

// Re-runs the query server-side so the client never has to send IDs, then
// streams newline-delimited JSON progress events.
export async function POST(req: Request) {
  let query: string;
  let gmail: Awaited<ReturnType<typeof gmailFor>>;
  try {
    query = await parseQuery(req.clone());
    gmail = await gmailFor(req);
  } catch (err) {
    return errorResponse(err);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: TrashEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      try {
        const ids = await listAllIds(gmail, query, (found) => send({ type: "listing", found }));
        send({ type: "progress", done: 0, total: ids.length });
        await trashIds(gmail, ids, (done) => send({ type: "progress", done, total: ids.length }));
        send({ type: "done", total: ids.length });
      } catch (err) {
        send({ type: "error", message: errorMessage(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "application/x-ndjson", "Cache-Control": "no-store" },
  });
}

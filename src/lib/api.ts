import "server-only";
import { z } from "zod";
import { buildQuery, EmptyQueryError, filtersSchema } from "./query";
import { UnauthorizedError } from "./gmail";

export async function parseQuery(req: Request): Promise<string> {
  return buildQuery(filtersSchema.parse(await req.json()));
}

export function errorResponse(err: unknown): Response {
  if (err instanceof UnauthorizedError) return Response.json({ error: err.message }, { status: 401 });
  if (err instanceof EmptyQueryError) return Response.json({ error: err.message }, { status: 400 });
  if (err instanceof z.ZodError) {
    return Response.json({ error: err.issues.map((i) => i.message).join("; ") }, { status: 400 });
  }
  return Response.json({ error: errorMessage(err) }, { status: 500 });
}

export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

import "server-only";
import { google, type gmail_v1 } from "googleapis";
import { getToken } from "next-auth/jwt";
import { ensureFreshToken } from "@/auth";

export class UnauthorizedError extends Error {
  constructor() {
    super("Your Google session has expired. Please sign in again.");
  }
}

export async function gmailFor(req: Request): Promise<gmail_v1.Gmail> {
  const raw = await getToken({ req, secret: process.env.AUTH_SECRET });
  if (!raw) throw new UnauthorizedError();
  const token = await ensureFreshToken(raw);
  if (token.error || !token.accessToken) throw new UnauthorizedError();

  const client = new google.auth.OAuth2();
  client.setCredentials({ access_token: token.accessToken });
  return google.gmail({ version: "v1", auth: client });
}

function isRetryable(err: unknown): boolean {
  const status = (err as { status?: number; code?: number })?.status ?? (err as { code?: number })?.code;
  return status === 429 || (typeof status === "number" && status >= 500);
}

async function withRetry<T>(fn: () => Promise<T>, attempts = 5): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn();
    } catch (err) {
      if (i >= attempts - 1 || !isRetryable(err)) throw err;
      await new Promise((r) => setTimeout(r, 2 ** i * 500 + Math.random() * 250));
    }
  }
}

export async function listAllIds(
  gmail: gmail_v1.Gmail,
  q: string,
  onPage?: (found: number) => void,
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  do {
    const res = await withRetry(() =>
      gmail.users.messages.list({ userId: "me", q, maxResults: 500, pageToken }),
    );
    for (const m of res.data.messages ?? []) if (m.id) ids.push(m.id);
    pageToken = res.data.nextPageToken ?? undefined;
    onPage?.(ids.length);
  } while (pageToken);
  return ids;
}

export type PreviewMessage = {
  id: string;
  from: string;
  subject: string;
  date: string;
  snippet: string;
};

export async function getPreview(
  gmail: gmail_v1.Gmail,
  ids: string[],
  concurrency = 10,
): Promise<PreviewMessage[]> {
  const results: PreviewMessage[] = new Array(ids.length);
  let next = 0;
  async function worker() {
    while (next < ids.length) {
      const i = next++;
      const res = await withRetry(() =>
        gmail.users.messages.get({
          userId: "me",
          id: ids[i],
          format: "metadata",
          metadataHeaders: ["From", "Subject", "Date"],
        }),
      );
      const header = (name: string) =>
        res.data.payload?.headers?.find((h) => h.name === name)?.value ?? "";
      results[i] = {
        id: ids[i],
        from: header("From"),
        subject: header("Subject"),
        date: res.data.internalDate ? new Date(Number(res.data.internalDate)).toISOString() : "",
        snippet: res.data.snippet ?? "",
      };
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, ids.length) }, worker));
  return results;
}

// Moves messages to Trash (recoverable for 30 days). batchModify accepts up to
// 1000 IDs per call.
export async function trashIds(
  gmail: gmail_v1.Gmail,
  ids: string[],
  onProgress?: (done: number) => void,
): Promise<void> {
  for (let i = 0; i < ids.length; i += 1000) {
    const chunk = ids.slice(i, i + 1000);
    await withRetry(() =>
      gmail.users.messages.batchModify({
        userId: "me",
        requestBody: { ids: chunk, addLabelIds: ["TRASH"] },
      }),
    );
    onProgress?.(i + chunk.length);
  }
}

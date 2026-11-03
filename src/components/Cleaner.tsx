"use client";

import { useMemo, useState } from "react";
import { buildQuery, filtersSchema } from "@/lib/query";
import type { PreviewMessage } from "@/lib/gmail";
import type { TrashEvent } from "@/app/api/trash/route";
import { FilterForm, initialForm, toFilters, type FormState } from "./FilterForm";
import { PreviewTable } from "./PreviewTable";
import { TrashProgress, type TrashStatus } from "./TrashProgress";

type Preview = { query: string; totalCount: number; sample: PreviewMessage[] };

const button =
  "rounded-md px-4 py-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-50";

function liveQuery(form: FormState): { query?: string; error?: string } {
  const parsed = filtersSchema.safeParse(toFilters(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  try {
    return { query: buildQuery(parsed.data) };
  } catch (err) {
    return { error: (err as Error).message };
  }
}

async function readError(res: Response): Promise<string> {
  const body = await res.json().catch(() => ({}));
  if (res.status === 401) return "Your Google session expired. Refresh the page and sign in again.";
  return body.error ?? `Request failed (${res.status})`;
}

export function Cleaner() {
  const [form, setForm] = useState<FormState>(initialForm);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [trash, setTrash] = useState<TrashStatus | null>(null);

  const { query, error: queryError } = useMemo(() => liveQuery(form), [form]);
  const trashing = trash?.phase === "listing" || trash?.phase === "trashing";
  const busy = loading || trashing;

  function updateForm(next: FormState) {
    setForm(next);
    // A preview only describes the filters it was run with.
    setPreview(null);
    setConfirming(false);
    setTrash(null);
  }

  async function runPreview() {
    setLoading(true);
    setError(null);
    setTrash(null);
    try {
      const res = await fetch("/api/preview", { method: "POST", body: JSON.stringify(toFilters(form)) });
      if (!res.ok) throw new Error(await readError(res));
      setPreview(await res.json());
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function runTrash() {
    setConfirming(false);
    setConfirmText("");
    setError(null);
    setTrash({ phase: "listing", found: 0 });
    try {
      const res = await fetch("/api/trash", { method: "POST", body: JSON.stringify(toFilters(form)) });
      if (!res.ok || !res.body) throw new Error(await readError(res));

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop()!;
        for (const line of lines.filter(Boolean)) {
          const event: TrashEvent = JSON.parse(line);
          if (event.type === "listing") setTrash({ phase: "listing", found: event.found });
          if (event.type === "progress") setTrash({ phase: "trashing", done: event.done, total: event.total });
          if (event.type === "done") setTrash({ phase: "done", total: event.total });
          if (event.type === "error") setTrash({ phase: "error", message: event.message });
        }
      }
      setPreview(null);
    } catch (err) {
      setTrash({ phase: "error", message: (err as Error).message });
    }
  }

  const expected = preview?.totalCount.toString() ?? "";

  return (
    <div className="flex flex-col gap-6">
      <FilterForm form={form} onChange={updateForm} disabled={busy} />

      <div className="flex flex-col gap-1 rounded-md bg-zinc-100 px-3 py-2 text-sm dark:bg-zinc-900">
        <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">Gmail query</span>
        {query ? <code className="break-all">{query}</code> : <span className="text-zinc-500">{queryError}</span>}
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          className={`${button} bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900`}
          onClick={runPreview}
          disabled={!query || busy}
        >
          {loading ? "Searching…" : "Preview matches"}
        </button>
        {preview && preview.totalCount > 0 && !confirming && (
          <button className={`${button} bg-red-600 text-white`} onClick={() => setConfirming(true)} disabled={busy}>
            Move {preview.totalCount.toLocaleString()} emails to Trash
          </button>
        )}
      </div>

      {confirming && preview && (
        <div className="flex flex-col gap-3 rounded-md border border-red-300 bg-red-50 p-4 text-sm dark:border-red-900 dark:bg-red-950">
          <p>
            This moves <strong>{preview.totalCount.toLocaleString()}</strong> messages matching the query above to
            Trash. You can restore them from Trash for 30 days. Type <strong>{expected}</strong> to confirm.
          </p>
          <div className="flex flex-wrap gap-3">
            <input
              autoFocus
              className="w-40 rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
            />
            <button
              className={`${button} bg-red-600 text-white`}
              onClick={runTrash}
              disabled={confirmText.replace(/,/g, "") !== expected}
            >
              Confirm
            </button>
            <button className={`${button} border border-zinc-300 dark:border-zinc-700`} onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {trash && <TrashProgress status={trash} />}
      {preview && <PreviewTable messages={preview.sample} total={preview.totalCount} />}
    </div>
  );
}

export type TrashStatus =
  | { phase: "listing"; found: number }
  | { phase: "trashing"; done: number; total: number }
  | { phase: "done"; total: number }
  | { phase: "error"; message: string };

export function TrashProgress({ status }: { status: TrashStatus }) {
  if (status.phase === "error") {
    return <p className="text-sm text-red-600">Stopped: {status.message}</p>;
  }
  if (status.phase === "done") {
    return (
      <p className="text-sm text-green-700 dark:text-green-400">
        Moved {status.total.toLocaleString()} messages to Trash.{" "}
        <a className="underline" href="https://mail.google.com/mail/u/0/#trash" target="_blank" rel="noreferrer">
          Open Gmail Trash
        </a>{" "}
        to review or restore them (kept for 30 days).
      </p>
    );
  }

  const pct = status.phase === "trashing" && status.total > 0 ? (status.done / status.total) * 100 : 0;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-zinc-500">
        {status.phase === "listing"
          ? `Finding messages… ${status.found.toLocaleString()} so far`
          : `Moving to Trash… ${status.done.toLocaleString()} / ${status.total.toLocaleString()}`}
      </p>
      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className="h-full bg-red-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

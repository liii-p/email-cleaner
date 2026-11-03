import type { PreviewMessage } from "@/lib/gmail";

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

export function PreviewTable({ messages, total }: { messages: PreviewMessage[]; total: number }) {
  if (total === 0) return <p className="text-sm text-zinc-500">No emails match these filters.</p>;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm text-zinc-500">
        Showing {messages.length} of {total.toLocaleString()} matching messages
      </p>
      <div className="overflow-x-auto rounded-md border border-zinc-200 dark:border-zinc-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-zinc-100 dark:bg-zinc-900">
            <tr>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">From</th>
              <th className="px-3 py-2 font-medium">Subject</th>
            </tr>
          </thead>
          <tbody>
            {messages.map((m) => (
              <tr key={m.id} className="border-t border-zinc-200 align-top dark:border-zinc-800">
                <td className="whitespace-nowrap px-3 py-2 text-zinc-500">
                  {m.date && dateFormat.format(new Date(m.date))}
                </td>
                <td className="max-w-[16rem] truncate px-3 py-2" title={m.from}>
                  {m.from}
                </td>
                <td className="px-3 py-2">
                  <div className="font-medium">{m.subject || "(no subject)"}</div>
                  <div className="line-clamp-1 text-zinc-500">{m.snippet}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

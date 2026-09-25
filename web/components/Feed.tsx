import type { FeedEvent } from "@/lib/types";

export function Feed({ events }: { events: FeedEvent[] }) {
  const recent = [...events].reverse();

  return (
    <div className="overflow-y-auto max-h-[600px] border rounded p-2">
      <h2 className="font-semibold mb-2">Aktivitas langsung</h2>
      {recent.length === 0 && <div className="text-sm text-gray-500">Belum ada event.</div>}
      <ul className="space-y-1 text-sm">
        {recent.map((e, i) => (
          <li key={i} className="border-b pb-1">
            <span className="font-medium">{e.subagent_type}</span>{" "}
            <span className="text-gray-500">{new Date(e.timestamp).toLocaleTimeString()}</span>
            <div>{e.summary || e.tool_name}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}

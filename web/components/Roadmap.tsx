import type { RoadmapData } from "@/lib/types";

export function Roadmap({ data }: { data: RoadmapData | null }) {
  if (!data || data.modules.length === 0) {
    return <div className="text-sm text-gray-500">Belum ada ROADMAP.md untuk project ini.</div>;
  }

  return (
    <div className="border rounded p-2">
      <h2 className="font-semibold mb-2">Roadmap</h2>
      <ul className="space-y-2">
        {data.modules.map((m) => (
          <li key={m.title}>
            <div className="flex justify-between text-sm">
              <span>{m.title}</span>
              <span>{m.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded h-2">
              <div className="bg-green-500 h-2 rounded" style={{ width: `${m.progress}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

import type { RoadmapData } from "@/lib/types";

export function Roadmap({ data }: { data: RoadmapData | null }) {
  if (!data || data.modules.length === 0) {
    return (
      <div className="flex flex-col h-full text-zinc-100">
        <div className="pb-3 border-b border-zinc-800/80 mb-4 shrink-0 flex items-center gap-2">
          <span className="text-base">🗺️</span>
          <h2 className="font-semibold text-sm tracking-wide text-zinc-200">Roadmap Proyek</h2>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-zinc-500 text-xs">
          <span className="text-2xl mb-2">📋</span>
          <p>Belum ada file <code className="text-zinc-400 font-mono">ROADMAP.md</code> di project ini.</p>
        </div>
      </div>
    );
  }

  const avgProgress = Math.round(
    data.modules.reduce((acc, m) => acc + m.progress, 0) / data.modules.length
  );

  return (
    <div className="flex flex-col h-full overflow-hidden text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-3 shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-base">🗺️</span>
          <h2 className="font-semibold text-sm tracking-wide text-zinc-200">Roadmap Proyek</h2>
        </div>
        <span className="text-[11px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-800/60">
          Avg: {avgProgress}%
        </span>
      </div>

      {/* Modules List */}
      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {data.modules.map((m) => (
          <div
            key={m.title}
            className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 space-y-2"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-zinc-200 truncate pr-2">{m.title}</span>
              <span className="font-mono text-zinc-400 shrink-0">{m.progress}%</span>
            </div>
            {/* Progress Track & Bar */}
            <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(0, m.progress))}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

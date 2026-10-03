import type { FeedEvent } from "@/lib/types";
import { ROLE_LABEL, ROLE_RING_COLOR } from "./Office3D/layout";

export function Feed({
  events,
  selectedAgent,
  onClearFilter,
}: {
  events: FeedEvent[];
  selectedAgent?: string | null;
  onClearFilter?: () => void;
}) {
  const filtered = selectedAgent
    ? events.filter((e) => e.subagent_type === selectedAgent)
    : events;

  const recent = [...filtered].reverse();

  return (
    <div className="flex flex-col h-full overflow-hidden text-zinc-100">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-800/80 mb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <h2 className="font-semibold text-sm tracking-wide text-zinc-200">Aktivitas Langsung</h2>
        </div>
        <span className="text-[10px] font-mono bg-zinc-800/90 text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-700/60">
          {events.length} logs
        </span>
      </div>

      {selectedAgent && (
        <div className="mb-2 flex items-center justify-between bg-zinc-800/60 px-2 py-1 rounded text-xs text-zinc-300 border border-zinc-700/50">
          <span>Filter: <strong className="text-zinc-100 uppercase">{selectedAgent}</strong></span>
          <button
            onClick={onClearFilter}
            className="text-[10px] text-zinc-400 hover:text-zinc-100 underline cursor-pointer"
          >
            Reset
          </button>
        </div>
      )}

      {/* Events List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
        {recent.length === 0 && (
          <div className="flex flex-col items-center justify-center h-32 text-zinc-500 text-center">
            <span className="text-2xl mb-1">📡</span>
            <span>Belum ada aktivitas terdeteksi</span>
          </div>
        )}
        {recent.map((e, i) => {
          const roleColor = ROLE_RING_COLOR[e.subagent_type] ?? "#94a3b8";
          const roleTitle = ROLE_LABEL[e.subagent_type] ?? e.subagent_type;

          return (
            <div
              key={i}
              className="group p-2 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/60 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <span
                  className="px-1.5 py-0.5 rounded font-mono text-[10px] font-semibold tracking-wider uppercase border border-opacity-30"
                  style={{
                    backgroundColor: `${roleColor}15`,
                    color: roleColor,
                    borderColor: roleColor,
                  }}
                >
                  {roleTitle}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  {new Date(e.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
              <p className="text-zinc-300 font-mono text-[11px] leading-relaxed break-words">
                {e.summary || e.tool_name}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

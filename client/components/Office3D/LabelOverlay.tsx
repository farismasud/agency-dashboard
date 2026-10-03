"use client";

import type { AgentState } from "@/lib/types";
import { ROLE_LABEL, ROLE_RING_COLOR, DEFAULT_LABEL } from "./layout";

// Plain DOM overlay outside the Canvas; CameraProjector positions each label per frame.
export function LabelOverlay({
  agents,
  labelRefs,
  onSelectAgent,
}: {
  agents: Record<string, AgentState>;
  labelRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  onSelectAgent?: (agent: AgentState) => void;
}) {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {Object.values(agents).map((agent) => {
        const working = agent.status === "working";
        const roleLabel = ROLE_LABEL[agent.subagent_type] ?? DEFAULT_LABEL;
        const ringColor = ROLE_RING_COLOR[agent.subagent_type] ?? "#38bdf8";

        return (
          <div
            key={agent.subagent_type}
            ref={(el) => {
              labelRefs.current[agent.subagent_type] = el;
            }}
            style={{ display: "none" }}
            className="group absolute top-0 left-0 flex-col items-center select-none pointer-events-auto cursor-pointer"
            onClick={() => onSelectAgent?.(agent)}
          >
            <div className="mb-1 max-w-[200px] rounded-xl bg-white/95 px-2.5 py-1 text-[11px] leading-tight text-zinc-800 shadow-lg ring-1 ring-black/5 flex items-center gap-1.5 transition-transform group-hover:scale-105">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${working ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
              <span data-bubble-text className="truncate">
                {agent.last_action || (working ? "Fokus kerja..." : "Santai sejenak ☕")}
              </span>
            </div>
            <div
              className="flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white shadow-md"
              style={{ backgroundColor: ringColor }}
            >
              <span>{agent.display_name || agent.subagent_type.toUpperCase()}</span>
              <span className="text-white/70 font-mono text-[9px] uppercase">{roleLabel}</span>
            </div>
            <span
              data-spot-text
              className="mt-0.5 hidden group-hover:block rounded bg-zinc-900/85 px-1.5 py-0.5 text-[10px] text-zinc-200"
            />
          </div>
        );
      })}
    </div>
  );
}

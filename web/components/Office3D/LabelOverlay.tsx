"use client";

import type { RefObject } from "react";
import type { AgentState } from "@/lib/types";
import { ROLE_LABEL, ROLE_RING_COLOR, DEFAULT_LABEL } from "./layout";

export function LabelOverlay({
  agents,
  labelRefs,
  onSelectAgent,
}: {
  agents: Record<string, AgentState>;
  labelRefs?: RefObject<Record<string, HTMLDivElement | null>> | React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  onSelectAgent?: (agent: AgentState) => void;
}) {
  const entries = Object.values(agents);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {entries.map((agent) => {
        const working = agent.status === "working";
        const roleLabel = ROLE_LABEL[agent.subagent_type] ?? DEFAULT_LABEL;
        const ringColor = ROLE_RING_COLOR[agent.subagent_type] ?? "#38bdf8";

        return (
          <div
            key={agent.subagent_type}
            ref={(el) => {
              if (labelRefs && labelRefs.current) {
                labelRefs.current[agent.subagent_type] = el;
              }
            }}
            className="absolute top-0 left-0 flex flex-col items-center select-none pointer-events-auto cursor-pointer transition-opacity duration-150 hover:scale-105"
            onClick={() => onSelectAgent?.(agent)}
          >
            {/* Speech Bubble / Dynamic Dialogue */}
            <div className="mb-1.5 max-w-[190px] rounded-lg bg-zinc-900/95 backdrop-blur-md px-2.5 py-1 text-[11px] text-zinc-100 shadow-xl border border-zinc-700/80 truncate flex items-center gap-1.5 transition-all">
              <span className={`w-1.5 h-1.5 rounded-full ${working ? "bg-emerald-400 animate-pulse" : "bg-amber-400"} shrink-0`} />
              <span data-bubble-text className="truncate">{agent.last_action || (working ? "Fokus kerja..." : "Santai sejenak ☕")}</span>
            </div>

            {/* Name & Role Badge */}
            <div className="flex items-center gap-1.5 rounded-md bg-zinc-950/85 backdrop-blur-md px-2 py-0.5 text-[11px] font-medium text-zinc-200 shadow-lg border border-zinc-800">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ringColor }} />
              <span>{agent.display_name || agent.subagent_type.toUpperCase()}</span>
              <span className="text-zinc-500 font-mono text-[10px]">({roleLabel})</span>
            </div>

            {/* Idle status */}
            {!working && (
              <div className="mt-0.5 text-[10px] font-medium text-amber-400/90 bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-900/50">
                ☕ Istirahat
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

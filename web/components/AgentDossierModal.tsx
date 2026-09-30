"use client";

import type { AgentState } from "@/lib/types";
import { ROLE_LABEL, ROLE_RING_COLOR } from "./Office3D/layout";

const MODEL_INFO: Record<string, { model: string; desc: string }> = {
  pm: { model: "Opus (Claude 3.5 / Gemini Pro)", desc: "Project Manager: Task breakdown & Roadmap scheduling" },
  analyst: { model: "Sonnet (Claude 3.5 / Gemini Flash)", desc: "Research & Codebase investigation" },
  dev: { model: "Sonnet (Claude 3.5 / Gemini Flash)", desc: "Feature implementation & Code editing" },
  qa: { model: "Sonnet (Claude 3.5 / Gemini Flash)", desc: "Quality assurance, Diff audit & Automated testing" },
};

export function AgentDossierModal({
  agent,
  onClose,
  onFilterFeed,
}: {
  agent: AgentState | null;
  onClose: () => void;
  onFilterFeed: (role: string) => void;
}) {
  if (!agent) return null;

  const roleTitle = ROLE_LABEL[agent.subagent_type] ?? agent.subagent_type;
  const ringColor = ROLE_RING_COLOR[agent.subagent_type] ?? "#38bdf8";
  const info = MODEL_INFO[agent.subagent_type] ?? { model: "Auto", desc: "Autonomous Subagent" };
  const working = agent.status === "working";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-700/80 shadow-2xl p-6 text-zinc-100 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold font-mono shadow-inner border border-white/10"
              style={{ backgroundColor: `${ringColor}25`, color: ringColor }}
            >
              {roleTitle}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-zinc-100">{agent.display_name}</h3>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-mono uppercase font-semibold border"
                  style={{
                    backgroundColor: `${ringColor}15`,
                    color: ringColor,
                    borderColor: `${ringColor}50`,
                  }}
                >
                  {agent.subagent_type}
                </span>
              </div>
              <p className="text-xs text-zinc-400">{info.desc}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-100 p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Status Card */}
        <div className="p-3 rounded-xl bg-zinc-950/70 border border-zinc-800/80 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-400">Status Saat Ini:</span>
            <span className="flex items-center gap-1.5 font-medium">
              <span
                className={`w-2 h-2 rounded-full ${
                  working ? "bg-emerald-500 animate-pulse" : "bg-amber-400"
                }`}
              />
              <span className={working ? "text-emerald-400" : "text-amber-400"}>
                {working ? "Sedang Bekerja" : "Istirahat / Siaga"}
              </span>
            </span>
          </div>

          <div className="text-xs">
            <span className="text-zinc-400">Aktivitas Terakhir:</span>
            <p className="mt-1 font-mono text-zinc-200 bg-zinc-900/90 p-2 rounded border border-zinc-800 break-words">
              {agent.last_action || "Tidak ada aksi tercatat"}
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-zinc-500 font-mono pt-1">
            <span>Model Engine:</span>
            <span className="text-zinc-300">{info.model}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={() => {
              onFilterFeed(agent.subagent_type);
              onClose();
            }}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors border border-zinc-700"
          >
            Filter Aktivitas Agen Ini
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-lg shadow-cyan-900/20"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { RoomSelector } from "@/components/RoomSelector";
import { Feed } from "@/components/Feed";
import { Roadmap } from "@/components/Roadmap";
import { AgentDossierModal } from "@/components/AgentDossierModal";
import { useAgencySocket } from "@/lib/useAgencySocket";
import type { AgentState } from "@/lib/types";

const Office = dynamic(() => import("@/components/Office").then((mod) => mod.Office), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex flex-col items-center justify-center text-zinc-400 text-sm bg-zinc-950 gap-3">
      <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
      <span>Memuat Ruang Kantor 3D...</span>
    </div>
  ),
});

const DEFAULT_AGENTS: Record<string, AgentState> = {
  // --- Floor 2 (Mezzanine: Strategy, Architecture, UI/UX & Security) ---
  pm: {
    subagent_type: "pm",
    display_name: "Zaki",
    status: "idle",
    last_action: "Mengkoordinasi roadmap tim...",
    last_event_at: new Date().toISOString(),
  },
  analyst: {
    subagent_type: "analyst",
    display_name: "Lulu",
    status: "idle",
    last_action: "Auditing database & schema 📊",
    last_event_at: new Date().toISOString(),
  },
  security: {
    subagent_type: "security",
    display_name: "Bagas",
    status: "working",
    last_action: "Verifying Iron Rules & Guard Checks 🛡️",
    last_event_at: new Date().toISOString(),
  },
  designer: {
    subagent_type: "designer",
    display_name: "Alya",
    status: "working",
    last_action: "Designing 3D Office & UI Prototypes 🎨",
    last_event_at: new Date().toISOString(),
  },
  // --- Floor 1 (Engineering, Infrastructure & Data Systems) ---
  dev: {
    subagent_type: "dev",
    display_name: "Pingot",
    status: "working",
    last_action: "Developing feature in VS Code 💻",
    last_event_at: new Date().toISOString(),
  },
  qa: {
    subagent_type: "qa",
    display_name: "Risko",
    status: "working",
    last_action: "Verifying test suite & diff 🧪",
    last_event_at: new Date().toISOString(),
  },
  devops: {
    subagent_type: "devops",
    display_name: "Bimo",
    status: "working",
    last_action: "Managing Docker containers & Cloudflare 🐳",
    last_event_at: new Date().toISOString(),
  },
  dba: {
    subagent_type: "dba",
    display_name: "Deni",
    status: "working",
    last_action: "Optimizing PostgreSQL indexes & WAL 🗄️",
    last_event_at: new Date().toISOString(),
  },
};

export default function KerjaPage() {
  const [project, setProject] = useState<string | null>(null);
  const [showFeed, setShowFeed] = useState(true);
  const [showRoadmap, setShowRoadmap] = useState(true);
  const [timeOfDay, setTimeOfDay] = useState<"day" | "night">("day");
  const [selectedAgent, setSelectedAgent] = useState<AgentState | null>(null);
  const [feedFilter, setFeedFilter] = useState<string | null>(null);
  const [propNotice, setPropNotice] = useState<{
    title: string;
    message: string;
    icon: string;
  } | null>(null);

  const room = useAgencySocket(project);

  // Check URL query param for initial time of day (e.g. ?time=night)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const time = params.get("time");
      if (time === "night" || time === "day") {
        setTimeOfDay(time);
      }
    }
  }, []);

  // Auto-hide prop notification after 4.5 seconds
  useEffect(() => {
    if (!propNotice) return;
    const t = setTimeout(() => setPropNotice(null), 4500);
    return () => clearTimeout(t);
  }, [propNotice]);

  const activeAgents =
    room?.agents && Object.keys(room.agents).length > 0
      ? room.agents
      : DEFAULT_AGENTS;

  return (
    <main className="h-screen w-screen overflow-hidden flex flex-col bg-zinc-950 text-zinc-100 font-sans select-none">
      {/* --- TOP BAR COMMAND CENTER --- */}
      <header className="h-14 shrink-0 px-5 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md flex items-center justify-between z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-violet-600 flex items-center justify-center font-bold text-white shadow-md">
            AG
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold tracking-tight text-zinc-100">Agency Command Center</h1>
              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-950/80 text-emerald-400 border border-emerald-800/50">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-zinc-400 font-mono">Multi-Agent 2-Floor Isometric Office</p>
          </div>
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center gap-3">
          <RoomSelector selected={project} onSelect={setProject} />

          {/* Day / Night Ambience Toggle */}
          <button
            onClick={() => setTimeOfDay((prev) => (prev === "day" ? "night" : "day"))}
            className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-2 transition-all shadow-sm ${
              timeOfDay === "day"
                ? "bg-amber-500/10 border-amber-500/40 text-amber-300 hover:bg-amber-500/20 shadow-amber-950/30"
                : "bg-indigo-950/80 border-indigo-700/60 text-indigo-300 hover:bg-indigo-900/60 shadow-indigo-950/50"
            }`}
            title={`Ganti ke waktu ${timeOfDay === "day" ? "Malam" : "Siang"}`}
          >
            <span>{timeOfDay === "day" ? "☀️" : "🌙"}</span>
            <span className="hidden sm:inline font-mono uppercase tracking-wider text-[11px]">
              {timeOfDay === "day" ? "Siang" : "Malam"}
            </span>
          </button>

          {/* Toggle Panels Buttons */}
          <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5 text-xs">
            <button
              onClick={() => setShowFeed((prev) => !prev)}
              className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5 ${
                showFeed
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Toggle Live Feed Panel"
            >
              <span>⚡</span>
              <span className="hidden sm:inline">Feed</span>
            </button>
            <button
              onClick={() => setShowRoadmap((prev) => !prev)}
              className={`px-2.5 py-1 rounded-md transition-colors font-medium flex items-center gap-1.5 ${
                showRoadmap
                  ? "bg-zinc-800 text-zinc-100 shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
              title="Toggle Roadmap Panel"
            >
              <span>🗺️</span>
              <span className="hidden sm:inline">Roadmap</span>
            </button>
          </div>
        </div>
      </header>

      {/* --- 3D VIEWPORT CONTAINER --- */}
      <div className="relative flex-1 w-full h-full overflow-hidden bg-zinc-950">
        {/* Fullsize 3D Canvas */}
        <div className="absolute inset-0 z-0">
          <Office
            agents={activeAgents}
            timeOfDay={timeOfDay}
            onSelectAgent={(agent) => setSelectedAgent(agent)}
            onInteractProp={(title, message, icon) => setPropNotice({ title, message, icon })}
          />
        </div>

        {/* Floating Prop Interaction Banner */}
        {propNotice && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3.5 px-5 py-3 rounded-2xl bg-zinc-900/90 backdrop-blur-xl border border-zinc-700/80 shadow-2xl text-zinc-100 animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-auto">
            <span className="text-2xl drop-shadow">{propNotice.icon}</span>
            <div>
              <h4 className="text-xs font-bold text-zinc-100">{propNotice.title}</h4>
              <p className="text-xs text-zinc-400 font-sans">{propNotice.message}</p>
            </div>
            <button
              onClick={() => setPropNotice(null)}
              className="ml-2 w-5 h-5 flex items-center justify-center rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 text-xs transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Floating Left Panel: Live Feed */}
        {showFeed && (
          <aside className="absolute left-4 top-4 bottom-14 w-80 max-w-[calc(50vw-24px)] z-20 bg-zinc-950/75 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl p-4 flex flex-col transition-all duration-300">
            <Feed
              events={room?.feed ?? []}
              selectedAgent={feedFilter}
              onClearFilter={() => setFeedFilter(null)}
            />
          </aside>
        )}

        {/* Floating Right Panel: Roadmap */}
        {showRoadmap && (
          <aside className="absolute right-4 top-4 bottom-14 w-80 max-w-[calc(50vw-24px)] z-20 bg-zinc-950/75 backdrop-blur-xl border border-zinc-800/80 rounded-2xl shadow-2xl p-4 flex flex-col transition-all duration-300">
            <Roadmap data={room?.roadmap ?? null} />
          </aside>
        )}

        {/* Bottom Navigation Hint Bar */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none select-none">
          <div className="text-[11px] font-mono text-zinc-400 bg-zinc-900/80 backdrop-blur-md px-4 py-1.5 rounded-full border border-zinc-800/80 shadow-lg flex items-center gap-3">
            <span>🖱️ <strong className="text-zinc-200">Kiri</strong>: Putar 360°</span>
            <span className="text-zinc-600">|</span>
            <span>🔍 <strong className="text-zinc-200">Scroll</strong>: Zoom</span>
            <span className="text-zinc-600">|</span>
            <span>✨ <strong className="text-zinc-200">Klik Agen</strong>: Fokus + Dossier</span>
            <span className="text-zinc-600">|</span>
            <span>📺 <strong className="text-zinc-200">Klik TV / Objek</strong>: Interaksi</span>
          </div>
        </div>
      </div>

      {/* Agent Detail Modal */}
      <AgentDossierModal
        agent={selectedAgent}
        onClose={() => setSelectedAgent(null)}
        onFilterFeed={(role) => setFeedFilter(role)}
      />
    </main>
  );
}

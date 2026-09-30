"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AgentState, FeedEvent, RoadmapData } from "@/lib/types";
import { Scene, VIEW_PRESETS, type CameraFocus } from "./Scene";
import { CharacterModel, type LiveAgentStatus, type ViewFloor } from "./CharacterModel";
import { LabelOverlay } from "./LabelOverlay";
import { CameraProjector } from "./CameraProjector";
import { supportsWebGL } from "./supportsWebGL";
import { Minimap } from "./Minimap";
import { setSoundEnabled, sfx } from "./sfx";
import type { DeskActivity } from "./DeskProp";
import { guestSlot, isGuest } from "./layout";
import { setGuestRoles } from "./AgentBehavior";
import { EMPTY_CURSOR, processFeed, type AgentDirective } from "./activity";


const FLOOR_BUTTONS: { value: ViewFloor; label: string; icon: string }[] = [
  { value: "all", label: "Gedung", icon: "🏢" },
  { value: 2, label: "Lantai 2", icon: "🛋️" },
  { value: 1, label: "Lantai 1", icon: "💻" },
];

const presetFor = (floor: ViewFloor): CameraFocus => ({ ...VIEW_PRESETS[floor === "all" ? "all" : floor === 1 ? "1" : "2"], key: Date.now() });

export function Office({
  agents,
  feed,
  roadmap,
  onSelectAgent,
  onInteractProp,
  timeOfDay = "day",
}: {
  agents: Record<string, AgentState>;
  feed?: FeedEvent[];
  roadmap?: RoadmapData | null;
  onSelectAgent?: (agent: AgentState) => void;
  onInteractProp?: (title: string, message: string, icon: string) => void;
  timeOfDay?: "day" | "night";
}) {
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  // ?floor=1|2 deep-links straight to a floor (client-only component, so window is safe here).
  const [viewFloor, setViewFloor] = useState<ViewFloor>(() => {
    const floor = new URLSearchParams(window.location.search).get("floor");
    return floor === "1" ? 1 : floor === "2" ? 2 : "all";
  });
  const [focus, setFocus] = useState<CameraFocus>(() => presetFor(viewFloor));
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const livePositionsRef = useRef<Record<string, LiveAgentStatus>>({});

  useEffect(() => {
    setWebglOk(supportsWebGL());
  }, []);

  // Subagent types without a fixed desk get a hot desk (stable for the session).
  const guests = Object.keys(agents).filter(isGuest);
  for (const g of guests) guestSlot(g);
  setGuestRoles(guests);

  // Last few feed lines per agent, painted onto their desk monitor.
  const deskActivity = useMemo(() => {
    const out: Record<string, DeskActivity> = {};
    for (const ev of feed ?? []) {
      const entry = (out[ev.subagent_type] ??= { lines: [], working: false });
      const time = new Date(ev.timestamp).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      entry.lines.push(`${time} ${ev.tool_name || ev.event_type}: ${ev.summary || ""}`.trim());
      if (entry.lines.length > 4) entry.lines.shift();
    }
    for (const [role, entry] of Object.entries(out)) entry.working = agents[role]?.status === "working";
    return out;
  }, [feed, agents]);

  // New feed events → per-agent directives (where to walk + what to say).
  const [directives, setDirectives] = useState<Record<string, AgentDirective>>({});
  const feedCursor = useRef(EMPTY_CURSOR);
  const directiveSeq = useRef(0);
  useEffect(() => {
    // No room (none picked / socket reconnecting): the next snapshot is history, not news.
    if (!feed) {
      feedCursor.current = EMPTY_CURSOR;
      return;
    }
    const name = (role: string) => agents[role]?.display_name || role.toUpperCase();
    const { cursor, activities } = processFeed(feedCursor.current, feed, name, new Set(Object.keys(agents)));
    feedCursor.current = cursor;
    const roles = Object.keys(activities);
    if (roles.length === 0) return;
    setDirectives((prev) => {
      const next = { ...prev };
      for (const role of roles) next[role] = { ...activities[role], key: ++directiveSeq.current };
      return next;
    });
    sfx.chime();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed]);

  const [follow, setFollow] = useState<string | null>(null);
  const [lastSelected, setLastSelected] = useState<AgentState | null>(null);
  const [showMap, setShowMap] = useState(true);
  const [soundOn, setSoundOn] = useState(false);

  // Esc stops following.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFollow(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const showFloor = (floor: ViewFloor) => {
    sfx.click();
    setFollow(null);
    setViewFloor(floor);
    setFocus(presetFor(floor));
  };

  const focusOn = (x: number, y: number, z: number) =>
    setFocus({ target: [x, y + 1, z], position: [x + 4.2, y + 4.2, z + 5.2], key: Date.now() });

  // Clicking an agent flies the camera to them (switching floors if needed) and opens the dossier.
  const selectAgent = (agent: AgentState) => {
    sfx.click();
    const live = livePositionsRef.current[agent.subagent_type];
    if (live) {
      setViewFloor(live.y > 1.8 ? 2 : 1);
      focusOn(live.x, live.y, live.z);
    }
    setLastSelected(agent);
    onSelectAgent?.(agent);
  };

  const interactProp = (title: string, message: string, icon: string) => {
    sfx.click();
    onInteractProp?.(title, message, icon);
  };

  if (webglOk === false) {
    return (
      <div className="w-full h-full flex items-center justify-center text-zinc-400 text-sm p-4 text-center bg-zinc-950">
        3D view tidak didukung di browser ini.
      </div>
    );
  }

  if (webglOk === null) {
    return <div className="w-full h-full bg-zinc-950 animate-pulse" />;
  }

  const followName = follow ? agents[follow]?.display_name || follow : "";
  const chip = "px-2.5 py-1.5 rounded-xl text-xs transition-colors";

  return (
    <div className="relative w-full h-full overflow-hidden bg-zinc-950 select-none">
      <Scene
        agents={agents}
        timeOfDay={timeOfDay}
        viewFloor={viewFloor}
        focus={focus}
        deskActivity={deskActivity}
        roadmap={roadmap}
        follow={follow}
        livePositionsRef={livePositionsRef}
        onFollowFloorChange={(upstairs) => setViewFloor(upstairs ? 2 : 1)}
        onInteractProp={interactProp}
      >
        {Object.values(agents).map((agent) => (
          <CharacterModel
            key={agent.subagent_type}
            agent={agent}
            onSelect={selectAgent}
            livePositionsRef={livePositionsRef}
            viewFloor={viewFloor}
            directive={directives[agent.subagent_type]}
          />
        ))}
        <CameraProjector agents={agents} labelRefs={labelRefs} livePositionsRef={livePositionsRef} />
      </Scene>
      <LabelOverlay agents={agents} labelRefs={labelRefs} onSelectAgent={selectAgent} />

      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
        {showMap && (
          <Minimap
            agents={agents}
            livePositionsRef={livePositionsRef}
            onPick={(floor, x, z) => {
              sfx.click();
              setFollow(null);
              setViewFloor(floor);
              focusOn(x, floor === 2 ? 3.6 : 0, z);
            }}
          />
        )}

        <div className="flex items-center gap-1 rounded-2xl bg-zinc-900/85 backdrop-blur-md border border-zinc-700/70 p-1 shadow-2xl">
          {FLOOR_BUTTONS.map((b) => (
            <button
              key={String(b.value)}
              onClick={() => showFloor(b.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewFloor === b.value && !follow ? "bg-cyan-500 text-zinc-950 shadow" : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <span>{b.icon}</span>
              <span>{b.label}</span>
            </button>
          ))}
          <span className="w-px h-5 bg-zinc-700 mx-0.5" />
          {follow ? (
            <button onClick={() => setFollow(null)} className={`${chip} bg-rose-500 text-white font-semibold`} title="Berhenti mengikuti (Esc)">
              🎥 {followName} ✕
            </button>
          ) : (
            lastSelected && (
              <button
                onClick={() => {
                  sfx.click();
                  setFollow(lastSelected.subagent_type);
                }}
                className={`${chip} text-zinc-300 hover:bg-zinc-800 hover:text-white`}
                title="Kamera mengikuti agen ini"
              >
                🎥 Ikuti {lastSelected.display_name || lastSelected.subagent_type}
              </button>
            )
          )}
          <button
            onClick={() => setShowMap((v) => !v)}
            className={`${chip} ${showMap ? "text-cyan-300" : "text-zinc-400"} hover:bg-zinc-800`}
            title="Minimap"
          >
            🗺️
          </button>
          <button
            onClick={() => {
              const next = !soundOn;
              setSoundEnabled(next);
              setSoundOn(next);
              if (next) sfx.click();
            }}
            className={`${chip} ${soundOn ? "text-cyan-300" : "text-zinc-400"} hover:bg-zinc-800`}
            title="Efek suara"
          >
            {soundOn ? "🔊" : "🔇"}
          </button>
          <button
            onClick={() => {
              setFollow(null);
              setFocus(presetFor(viewFloor));
            }}
            className={`${chip} text-zinc-400 hover:bg-zinc-800 hover:text-white`}
            title="Reset kamera"
          >
            ⟲
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentState, FeedEvent } from "@/lib/types";
import { Scene, VIEW_PRESETS, type CameraFocus } from "./Scene";
import { CharacterModel, type LiveAgentStatus, type ViewFloor } from "./CharacterModel";
import { LabelOverlay } from "./LabelOverlay";
import { CameraProjector } from "./CameraProjector";
import { supportsWebGL } from "./supportsWebGL";
import { DESK_POS_3D } from "./layout";
import { EMPTY_CURSOR, processFeed, type AgentDirective } from "./activity";

const KNOWN_ROLES = new Set(Object.keys(DESK_POS_3D));

const FLOOR_BUTTONS: { value: ViewFloor; label: string; icon: string }[] = [
  { value: "all", label: "Gedung", icon: "🏢" },
  { value: 2, label: "Lantai 2", icon: "🛋️" },
  { value: 1, label: "Lantai 1", icon: "💻" },
];

const presetFor = (floor: ViewFloor): CameraFocus => ({ ...VIEW_PRESETS[floor === "all" ? "all" : floor === 1 ? "1" : "2"], key: Date.now() });

export function Office({
  agents,
  feed,
  onSelectAgent,
  onInteractProp,
  timeOfDay = "day",
}: {
  agents: Record<string, AgentState>;
  feed?: FeedEvent[];
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
    const { cursor, activities } = processFeed(feedCursor.current, feed, name, KNOWN_ROLES);
    feedCursor.current = cursor;
    const roles = Object.keys(activities);
    if (roles.length === 0) return;
    setDirectives((prev) => {
      const next = { ...prev };
      for (const role of roles) next[role] = { ...activities[role], key: ++directiveSeq.current };
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed]);

  const showFloor = (floor: ViewFloor) => {
    setViewFloor(floor);
    setFocus(presetFor(floor));
  };

  // Clicking an agent flies the camera to them (switching floors if needed) and opens the dossier.
  const selectAgent = (agent: AgentState) => {
    const live = livePositionsRef.current[agent.subagent_type];
    if (live) {
      const upstairs = live.y > 1.8;
      setViewFloor(upstairs ? 2 : 1);
      setFocus({
        target: [live.x, live.y + 1, live.z],
        position: [live.x + 4.2, live.y + 4.2, live.z + 5.2],
        key: Date.now(),
      });
    }
    onSelectAgent?.(agent);
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

  return (
    <div className="relative w-full h-full overflow-hidden bg-zinc-950 select-none">
      <Scene agents={agents} timeOfDay={timeOfDay} viewFloor={viewFloor} focus={focus} onInteractProp={onInteractProp}>
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

      {/* Floor switcher */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 rounded-2xl bg-zinc-900/85 backdrop-blur-md border border-zinc-700/70 p-1 shadow-2xl">
        {FLOOR_BUTTONS.map((b) => (
          <button
            key={String(b.value)}
            onClick={() => showFloor(b.value)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              viewFloor === b.value ? "bg-cyan-500 text-zinc-950 shadow" : "text-zinc-300 hover:bg-zinc-800 hover:text-white"
            }`}
          >
            <span>{b.icon}</span>
            <span>{b.label}</span>
          </button>
        ))}
        <button
          onClick={() => setFocus(presetFor(viewFloor))}
          className="px-2.5 py-1.5 rounded-xl text-xs text-zinc-400 hover:bg-zinc-800 hover:text-white"
          title="Reset kamera"
        >
          ⟲
        </button>
      </div>
    </div>
  );
}

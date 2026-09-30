"use client";

import { useEffect, useRef, useState } from "react";
import type { AgentState } from "@/lib/types";
import { Scene } from "./Scene";
import { AllDesks } from "./DeskProp";
import { CharacterModel, type LiveAgentStatus } from "./CharacterModel";
import { LabelOverlay } from "./LabelOverlay";
import { CameraProjector } from "./CameraProjector";
import { supportsWebGL } from "./supportsWebGL";

export function Office({
  agents,
  onSelectAgent,
  onInteractProp,
}: {
  agents: Record<string, AgentState>;
  onSelectAgent?: (agent: AgentState) => void;
  onInteractProp?: (title: string, message: string, icon: string) => void;
}) {
  const [webglOk, setWebglOk] = useState<boolean | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const livePositionsRef = useRef<Record<string, LiveAgentStatus>>({});

  useEffect(() => {
    setWebglOk(supportsWebGL());
  }, []);

  const entries = Object.values(agents);

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
    <div ref={containerRef} className="relative w-full h-full overflow-hidden bg-zinc-950 select-none">
      <Scene onInteractProp={onInteractProp}>
        <AllDesks />
        {entries.map((agent) => (
          <CharacterModel
            key={agent.subagent_type}
            agent={agent}
            onSelect={onSelectAgent}
            livePositionsRef={livePositionsRef}
          />
        ))}
        <CameraProjector
          agents={agents}
          labelRefs={labelRefs}
          livePositionsRef={livePositionsRef}
        />
      </Scene>
      <LabelOverlay agents={agents} labelRefs={labelRefs} onSelectAgent={onSelectAgent} />
    </div>
  );
}

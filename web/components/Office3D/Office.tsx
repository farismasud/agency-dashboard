"use client";

import { useEffect, useState } from "react";
import type { AgentState } from "@/lib/types";
import { Scene } from "./Scene";
import { AllDesks } from "./DeskProp";
import { CharacterModel } from "./CharacterModel";
import { supportsWebGL } from "./supportsWebGL";

export function Office({ agents }: { agents: Record<string, AgentState> }) {
  const [webglOk, setWebglOk] = useState<boolean | null>(null);

  useEffect(() => {
    setWebglOk(supportsWebGL());
  }, []);

  const entries = Object.values(agents);
  let idleCount = 0;

  if (webglOk === false) {
    return (
      <div className="rounded-lg border border-amber-200 h-[440px] flex items-center justify-center text-neutral-500 text-sm p-4 text-center">
        3D view tidak didukung di browser ini.
      </div>
    );
  }

  if (webglOk === null) {
    return <div className="rounded-lg border border-amber-200 h-[440px]" />;
  }

  return (
    <div className="rounded-lg border border-amber-200 overflow-hidden h-[440px]">
      <Scene>
        <AllDesks />
        {entries.map((agent) => {
          const isIdle = agent.status !== "working";
          const breakSlotIndex = isIdle ? idleCount++ : 0;
          return (
            <CharacterModel key={agent.subagent_type} agent={agent} breakSlotIndex={breakSlotIndex} />
          );
        })}
      </Scene>
    </div>
  );
}

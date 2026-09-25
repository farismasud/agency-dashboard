"use client";

import { useEffect, useState, type RefObject } from "react";
import type { AgentState } from "@/lib/types";
import { ROLE_LABEL, DEFAULT_LABEL } from "./layout";
import { getTargetXZ } from "./CharacterModel";
import { projectToScreenPercent } from "./projectToScreen";

const LABEL_HEIGHT_Y = 1.2; // matches where the old <Html> bubble sat above a character

// Plain DOM overlay for name/status labels, positioned by projecting each
// agent's target 3D position to screen space - deliberately NOT using
// drei's <Html> (which anchors HTML inside the Canvas via a portal): that
// caused a real crash (`Attempted to synchronously unmount a root while
// React was already rendering`, plus a `removeChild` NotFoundError) seen in
// a live browser, reproducible on the latest available @react-three/fiber
// (9.8.1) and @react-three/drei (10.7.8) - not a stale-version issue.
//
// Known limitation of this approach: since it doesn't track the character's
// live per-frame lerp position (that state lives inside the Canvas, in
// CharacterModel's own ref, not exposed outside it), a label snaps directly
// to its destination when an agent's status changes, while the 3D model
// eases toward it over ~0.5-1s. Accepted deliberately - a brief label/body
// mismatch during a rare transition is a minor cosmetic gap, not a crash.
export function LabelOverlay({
  agents,
  containerRef,
}: {
  agents: Record<string, AgentState>;
  containerRef: RefObject<HTMLDivElement | null>;
}) {
  const [aspect, setAspect] = useState(16 / 10);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      if (el.clientHeight > 0) setAspect(el.clientWidth / el.clientHeight);
    };
    update();

    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef]);

  const entries = Object.values(agents);
  let idleCount = 0;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {entries.map((agent) => {
        const working = agent.status === "working";
        const isIdle = !working;
        const breakSlotIndex = isIdle ? idleCount++ : 0;
        const [x, z] = getTargetXZ(agent, breakSlotIndex);
        const { leftPct, topPct } = projectToScreenPercent([x, LABEL_HEIGHT_Y, z], aspect);
        const roleLabel = ROLE_LABEL[agent.subagent_type] ?? DEFAULT_LABEL;

        return (
          <div
            key={agent.subagent_type}
            className="absolute flex flex-col items-center select-none"
            style={{ left: `${leftPct}%`, top: `${topPct}%`, transform: "translate(-50%, -100%)" }}
          >
            {working && (
              <div className="mb-1 max-w-[140px] rounded bg-white/95 px-2 py-1 text-[11px] text-neutral-800 shadow truncate border border-neutral-200">
                {agent.last_action || "Kerja..."}
              </div>
            )}
            <div className="text-[10px] font-medium text-neutral-700 bg-white/80 px-1 rounded">
              {agent.display_name} · {roleLabel}
            </div>
            {!working && <div className="text-[10px] text-neutral-500">☕ Istirahat</div>}
          </div>
        );
      })}
    </div>
  );
}

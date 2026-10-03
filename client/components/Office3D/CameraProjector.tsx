"use client";

import { useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AgentState } from "@/lib/types";
import type { LiveAgentStatus } from "./CharacterModel";

const LABEL_HEIGHT_Y = 1.95;

// Moves the DOM labels (LabelOverlay) to follow each agent's live 3D position.
export function CameraProjector({
  agents,
  labelRefs,
  livePositionsRef,
}: {
  agents: Record<string, AgentState>;
  labelRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  livePositionsRef: React.MutableRefObject<Record<string, LiveAgentStatus>>;
}) {
  const v = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ camera, size }) => {
    for (const agent of Object.values(agents)) {
      const el = labelRefs.current[agent.subagent_type];
      const live = livePositionsRef.current[agent.subagent_type];
      if (!el || !live) continue;

      v.set(live.x, live.y + LABEL_HEIGHT_Y, live.z).project(camera);
      if (live.hidden || v.z > 1) {
        el.style.display = "none";
        continue;
      }

      el.style.display = "flex";
      const screenX = (v.x * 0.5 + 0.5) * size.width;
      const screenY = (-v.y * 0.5 + 0.5) * size.height;
      el.style.transform = `translate(-50%, -100%) translate3d(${screenX}px, ${screenY}px, 0)`;
      // Farther agents render behind nearer ones.
      el.style.zIndex = String(Math.round((1 - v.z) * 10000));

      const bubble = el.querySelector<HTMLSpanElement>("[data-bubble-text]");
      if (bubble && bubble.textContent !== live.bubbleText) bubble.textContent = live.bubbleText;
      const spot = el.querySelector<HTMLSpanElement>("[data-spot-text]");
      if (spot && spot.textContent !== live.spotLabel) spot.textContent = live.spotLabel;
    }
  });

  return null;
}

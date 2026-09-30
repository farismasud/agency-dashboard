"use client";

import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { AgentState } from "@/lib/types";
import type { LiveAgentStatus } from "./CharacterModel";

const LABEL_HEIGHT_Y = 1.35;

export function CameraProjector({
  agents,
  labelRefs,
  livePositionsRef,
}: {
  agents: Record<string, AgentState>;
  labelRefs?: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
  livePositionsRef?: React.MutableRefObject<Record<string, LiveAgentStatus>>;
}) {
  const v = new THREE.Vector3();

  useFrame(({ camera, size }) => {
    if (!labelRefs?.current || !livePositionsRef?.current) return;

    const entries = Object.values(agents);

    for (const agent of entries) {
      const el = labelRefs.current[agent.subagent_type];
      if (!el) continue;

      const live = livePositionsRef.current[agent.subagent_type];
      const posX = live ? live.x : 0;
      const posZ = live ? live.z : 0;

      v.set(posX, LABEL_HEIGHT_Y, posZ);
      v.project(camera);

      // Hide if behind camera
      if (v.z > 1) {
        el.style.display = "none";
        continue;
      }

      el.style.display = "flex";
      const screenX = (v.x * 0.5 + 0.5) * size.width;
      const screenY = (-(v.y * 0.5) + 0.5) * size.height;

      el.style.transform = `translate(-50%, -100%) translate3d(${screenX}px, ${screenY}px, 0)`;

      // Update dialogue text content live if bubble element exists
      const bubbleEl = el.querySelector("[data-bubble-text]") as HTMLSpanElement | null;
      if (bubbleEl && live && live.bubbleText) {
        bubbleEl.textContent = live.bubbleText;
      }
    }
  });

  return null;
}

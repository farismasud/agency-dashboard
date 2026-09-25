"use client";

import { Suspense, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Clone, Html, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { AgentState } from "@/lib/types";
import {
  ROLE_SPRITE,
  ROLE_RING_COLOR,
  ROLE_LABEL,
  DESK_POS,
  BREAK_SLOTS,
  DEFAULT_POS,
  DEFAULT_SPRITE,
  DEFAULT_RING_COLOR,
  DEFAULT_LABEL,
} from "./layout";

const MODEL_URLS = {
  male: "/office3d/characters/male.glb",
  female: "/office3d/characters/female.glb",
};

function CharacterMesh({ sprite }: { sprite: "male" | "female" }) {
  const { scene } = useGLTF(MODEL_URLS[sprite]);
  return <Clone object={scene} scale={0.9} />;
}

function CharacterFallback() {
  return (
    <mesh position={[0, 0.5, 0]}>
      <boxGeometry args={[0.5, 1, 0.3]} />
      <meshStandardMaterial color="#999999" />
    </mesh>
  );
}

export function CharacterModel({
  agent,
  breakSlotIndex,
}: {
  agent: AgentState;
  breakSlotIndex: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const sprite = ROLE_SPRITE[agent.subagent_type] ?? DEFAULT_SPRITE;
  const ringColor = ROLE_RING_COLOR[agent.subagent_type] ?? DEFAULT_RING_COLOR;
  const roleLabel = ROLE_LABEL[agent.subagent_type] ?? DEFAULT_LABEL;
  const working = agent.status === "working";

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Read the target fresh every frame - if `agent` changes mid-transition
    // (rapid working/idle flapping), the lerp simply redirects toward the
    // new target from wherever the character currently is, no snapping.
    const [targetX, targetZ] = working
      ? DESK_POS[agent.subagent_type] ?? DEFAULT_POS
      : BREAK_SLOTS[breakSlotIndex % BREAK_SLOTS.length];

    const lerpFactor = Math.min(1, delta * 2);
    groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, targetX, lerpFactor);
    groupRef.current.position.z = THREE.MathUtils.lerp(groupRef.current.position.z, targetZ, lerpFactor);

    if (working) {
      groupRef.current.position.y = Math.sin(performance.now() / 400) * 0.05;
    } else {
      groupRef.current.position.y = THREE.MathUtils.lerp(groupRef.current.position.y, 0, lerpFactor);
    }
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
        <circleGeometry args={[0.5, 24]} />
        <meshStandardMaterial color={ringColor} />
      </mesh>

      <Suspense fallback={<CharacterFallback />}>
        <CharacterMesh sprite={sprite} />
      </Suspense>

      <Html position={[0, 1.9, 0]} center distanceFactor={10}>
        <div className="flex flex-col items-center pointer-events-none select-none">
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
      </Html>
    </group>
  );
}

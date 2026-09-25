"use client";

import { Component, Suspense, useLayoutEffect, useRef } from "react";
import type { ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { Clone, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import type { AgentState } from "@/lib/types";
import {
  ROLE_SPRITE,
  ROLE_RING_COLOR,
  DESK_POS,
  BREAK_SLOTS,
  DEFAULT_POS,
  DEFAULT_SPRITE,
  DEFAULT_RING_COLOR,
  SEAT_OFFSET_Z,
} from "./layout";

const MODEL_SCALE = 1.3;

const MODEL_URLS = {
  male: "/office3d/characters/male.glb",
  female: "/office3d/characters/female.glb",
};

// Where a character should be for the given agent - the chair position when
// working (desk position + SEAT_OFFSET_Z), or its assigned break slot when
// idle. Shared by the initial-position effect, the per-frame lerp, and
// LabelOverlay (which projects this same target to screen space for the
// name/status label, rendered outside the Canvas - see LabelOverlay.tsx).
export function getTargetXZ(agent: AgentState, breakSlotIndex: number): [number, number] {
  if (agent.status === "working") {
    const [deskX, deskZ] = DESK_POS[agent.subagent_type] ?? DEFAULT_POS;
    return [deskX, deskZ + SEAT_OFFSET_Z];
  }
  return BREAK_SLOTS[breakSlotIndex % BREAK_SLOTS.length];
}

function CharacterMesh({ sprite }: { sprite: "male" | "female" }) {
  const { scene } = useGLTF(MODEL_URLS[sprite]);
  return <Clone object={scene} scale={MODEL_SCALE} />;
}

function CharacterFallback() {
  return (
    <mesh position={[0, 0.4, 0]}>
      <boxGeometry args={[0.4, 0.8, 0.25]} />
      <meshStandardMaterial color="#999999" />
    </mesh>
  );
}

// useGLTF's Suspense fallback only covers the *loading* state - if the
// fetch itself fails (404, network error), the thrown error propagates past
// Suspense and would otherwise crash the whole R3F tree. This boundary
// catches that and renders the same fallback box instead.
class ModelErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
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
  const working = agent.status === "working";

  // Place the character at its target immediately on mount, instead of
  // easing in from the room's center (0,0,0) - a user expects agents to
  // already be in place, not visibly glide there from the middle of the room.
  useLayoutEffect(() => {
    if (!groupRef.current) return;
    const [x, z] = getTargetXZ(agent, breakSlotIndex);
    groupRef.current.position.set(x, 0, z);
    // Intentionally mount-only: subsequent status/position changes are
    // handled by the per-frame lerp below, not re-run here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    // Read the target fresh every frame - if `agent` changes mid-transition
    // (rapid working/idle flapping), the lerp simply redirects toward the
    // new target from wherever the character currently is, no snapping.
    const [targetX, targetZ] = getTargetXZ(agent, breakSlotIndex);

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

      <ModelErrorBoundary fallback={<CharacterFallback />}>
        <Suspense fallback={<CharacterFallback />}>
          <CharacterMesh sprite={sprite} />
        </Suspense>
      </ModelErrorBoundary>
    </group>
  );
}

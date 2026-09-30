"use client";

import { Component, Suspense, useLayoutEffect, useMemo, useRef, useState, useEffect } from "react";
import type { ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations, useTexture } from "@react-three/drei";
import * as THREE from "three";
import { clone as skeletonClone } from "three/examples/jsm/utils/SkeletonUtils.js";
import type { AgentState } from "@/lib/types";
import {
  ROLE_SPRITE,
  ROLE_RING_COLOR,
  DEFAULT_SPRITE,
  DEFAULT_RING_COLOR,
} from "./layout";
import {
  getRandomOfficeSpots,
  getDeskSpot,
  getRandomDialogue,
  type OfficeSpot,
} from "./AgentBehavior";

const WALK_SPEED = 1.9; // world units per second

const MODEL_URLS = {
  male: "/office3d/characters/male.glb",
  female: "/office3d/characters/female.glb",
};

const ROLE_SCALES: Record<string, number> = {
  pm: 1.40,
  dev: 1.35,
  qa: 1.32,
  analyst: 1.30,
};

export interface LiveAgentStatus {
  x: number;
  z: number;
  rotationY: number;
  isWalking: boolean;
  bubbleText: string;
}

// 3D Unique Accessories per role
function CharacterAccessories({ role }: { role: string }) {
  if (role === "dev") {
    // Dev: Over-ear Coder Headphones with glowing neon green LED ring
    return (
      <group position={[0, 0.95, 0]}>
        {/* Headband Arc */}
        <mesh position={[0, 0.38, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.22, 0.025, 8, 24, Math.PI]} />
          <meshStandardMaterial color="#18181b" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Left Earcup */}
        <mesh position={[-0.23, 0.38, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, 0.05, 16]} />
          <meshStandardMaterial color="#18181b" roughness={0.3} />
        </mesh>
        <mesh position={[-0.26, 0.38, 0]} rotation={[0, 0, Math.PI / 2]}>
          <ringGeometry args={[0.03, 0.055, 16]} />
          <meshBasicMaterial color="#10b981" />
        </mesh>
        {/* Right Earcup */}
        <mesh position={[0.23, 0.38, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.07, 0.07, 0.05, 16]} />
          <meshStandardMaterial color="#18181b" roughness={0.3} />
        </mesh>
        <mesh position={[0.26, 0.38, 0]} rotation={[0, 0, Math.PI / 2]}>
          <ringGeometry args={[0.03, 0.055, 16]} />
          <meshBasicMaterial color="#10b981" />
        </mesh>
      </group>
    );
  }

  if (role === "analyst") {
    // Analyst: Smart Rectangular Glasses
    return (
      <group position={[0, 1.28, 0.22]}>
        {/* Bridge */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[0.05, 0.015, 0.01]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} />
        </mesh>
        {/* Left Frame */}
        <mesh position={[-0.1, 0, 0]}>
          <boxGeometry args={[0.13, 0.08, 0.01]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} />
        </mesh>
        <mesh position={[-0.1, 0, 0.005]}>
          <planeGeometry args={[0.11, 0.06]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.35} roughness={0.1} />
        </mesh>
        {/* Right Frame */}
        <mesh position={[0.1, 0, 0]}>
          <boxGeometry args={[0.13, 0.08, 0.01]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} />
        </mesh>
        <mesh position={[0.1, 0, 0.005]}>
          <planeGeometry args={[0.11, 0.06]} />
          <meshStandardMaterial color="#38bdf8" transparent opacity={0.35} roughness={0.1} />
        </mesh>
      </group>
    );
  }

  if (role === "pm") {
    // PM: Executive Lanyard with Purple ID Badge
    return (
      <group position={[0, 0.88, 0.18]}>
        {/* Lanyard Ribbon */}
        <mesh position={[0, 0.12, 0]} rotation={[0, 0, 0]}>
          <boxGeometry args={[0.22, 0.24, 0.01]} />
          <meshBasicMaterial color="#7c3aed" wireframe />
        </mesh>
        {/* Badge Card */}
        <mesh position={[0, -0.05, 0.01]}>
          <boxGeometry args={[0.09, 0.13, 0.01]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.03, 0.016]}>
          <planeGeometry args={[0.07, 0.04]} />
          <meshBasicMaterial color="#7c3aed" />
        </mesh>
      </group>
    );
  }

  if (role === "qa") {
    // QA: QA Inspector Collar Clip Badge
    return (
      <group position={[0.12, 0.94, 0.16]}>
        <mesh rotation={[0, 0, -0.2]}>
          <boxGeometry args={[0.06, 0.09, 0.01]} />
          <meshStandardMaterial color="#f97316" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.01, 0.008]} rotation={[0, 0, -0.2]}>
          <circleGeometry args={[0.02, 12]} />
          <meshBasicMaterial color="#ffffff" />
        </mesh>
      </group>
    );
  }

  return null;
}

// SkinnedMesh Animated Character with its own independent skeleton instance & custom colormap
function AnimatedCharacterMesh({
  sprite,
  role,
  actionState,
}: {
  sprite: "male" | "female";
  role: string;
  actionState: "walk" | "sit" | "idle" | "interact-right" | "interact-left";
}) {
  const { scene, animations } = useGLTF(MODEL_URLS[sprite]);

  // Load custom role texture (distinct clothes, hair, skin)
  const texture = useTexture(`/office3d/characters/Textures/colormap-${role}.png`);

  useEffect(() => {
    if (texture) {
      texture.flipY = false;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
    }
  }, [texture]);

  // Deep clone skinned mesh & skeleton so each agent has their own independent bones
  const clonedScene = useMemo(() => {
    const c = skeletonClone(scene);
    c.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        const mesh = obj as THREE.Mesh;
        if (mesh.material) {
          // Clone material with custom texture map
          const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
          mat.map = texture;
          mat.roughness = 0.5;
          mat.metalness = 0.1;
          mat.needsUpdate = true;
          mesh.material = mat;
        }
      }
    });
    return c;
  }, [scene, texture]);

  const { actions } = useAnimations(animations, clonedScene);

  useEffect(() => {
    // Choose active animation clip
    const clipName = actionState === "interact-left" ? "interact-left" : actionState;
    const action = actions[clipName] || actions[actionState] || actions["idle"];
    if (action) {
      action.reset().fadeIn(0.25).play();
    }
    return () => {
      if (action) {
        action.fadeOut(0.25);
      }
    };
  }, [actionState, actions]);

  const roleScale = ROLE_SCALES[role] ?? 1.35;

  return (
    <group scale={roleScale}>
      <primitive object={clonedScene} />
      <CharacterAccessories role={role} />
    </group>
  );
}

function CharacterFallback() {
  return (
    <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
      <boxGeometry args={[0.4, 0.9, 0.25]} />
      <meshStandardMaterial color="#94a3b8" />
    </mesh>
  );
}

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
  onSelect,
  livePositionsRef,
}: {
  agent: AgentState;
  onSelect?: (agent: AgentState) => void;
  livePositionsRef?: React.MutableRefObject<Record<string, LiveAgentStatus>>;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [actionState, setActionState] = useState<"walk" | "sit" | "idle" | "interact-right" | "interact-left">("sit");

  const role = agent.subagent_type;
  const sprite = ROLE_SPRITE[role] ?? DEFAULT_SPRITE;
  const ringColor = ROLE_RING_COLOR[role] ?? DEFAULT_RING_COLOR;
  const working = agent.status === "working";

  // Target spot with exact [x, y, z] coordinates & sitting elevation
  const currentSpotRef = useRef<OfficeSpot>(getDeskSpot(role));
  const currentDialogue = useRef<string>(agent.last_action || "Fokus kerja...");
  const nextChangeTime = useRef<number>(performance.now() + 6000 + Math.random() * 8000);

  // Set initial position onto desk chair
  useLayoutEffect(() => {
    if (!groupRef.current) return;
    const initialSpot = getDeskSpot(role);
    groupRef.current.position.set(initialSpot.x, initialSpot.y, initialSpot.z);
    groupRef.current.rotation.y = initialSpot.faceAngle;
    currentSpotRef.current = initialSpot;
  }, [role]);

  // When live events arrive from backend, prioritize own desk
  useEffect(() => {
    if (agent.last_action) {
      currentDialogue.current = agent.last_action;
      if (working) {
        currentSpotRef.current = getDeskSpot(role);
        nextChangeTime.current = performance.now() + 16000;
      }
    }
  }, [agent.last_action, role, working]);

  useEffect(() => {
    if (hovered) {
      document.body.style.cursor = "pointer";
      return () => {
        document.body.style.cursor = "auto";
      };
    }
  }, [hovered]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const now = performance.now();

    // Pick new random spot across office
    if (now > nextChangeTime.current) {
      nextChangeTime.current = now + 9000 + Math.random() * 12000;

      const spots = getRandomOfficeSpots(role);
      // 40% chance return to own desk, 60% explore office
      let chosenSpot: OfficeSpot;
      if (Math.random() < 0.4) {
        chosenSpot = getDeskSpot(role);
      } else {
        const otherSpots = spots.filter((s) => s.id !== currentSpotRef.current.id);
        chosenSpot = otherSpots[Math.floor(Math.random() * otherSpots.length)] || getDeskSpot(role);
      }

      currentSpotRef.current = chosenSpot;
      currentDialogue.current = agent.last_action || getRandomDialogue(role, chosenSpot.category);
    }

    const currentX = groupRef.current.position.x;
    const currentY = groupRef.current.position.y;
    const currentZ = groupRef.current.position.z;

    const targetSpot = currentSpotRef.current;
    const dx = targetSpot.x - currentX;
    const dz = targetSpot.z - currentZ;
    const distanceXZ = Math.hypot(dx, dz);

    let isWalking = false;

    if (distanceXZ > 0.08) {
      // Walking locomotion
      isWalking = true;
      const step = Math.min(distanceXZ, WALK_SPEED * delta);
      groupRef.current.position.x += (dx / distanceXZ) * step;
      groupRef.current.position.z += (dz / distanceXZ) * step;

      // While walking, smooth lerp Y to floor level (0.0)
      groupRef.current.position.y = THREE.MathUtils.lerp(currentY, 0.0, delta * 10);

      // Rotate smoothly towards movement direction
      const travelHeading = Math.atan2(dx, dz);
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, travelHeading, delta * 12);

      if (actionState !== "walk") setActionState("walk");
    } else {
      // Reached destination spot
      groupRef.current.position.x = targetSpot.x;
      groupRef.current.position.z = targetSpot.z;

      // Smoothly elevate to seat cushion (0.38 for chair, 0.24 for sofa) or lower to floor (0.0)
      groupRef.current.position.y = THREE.MathUtils.lerp(currentY, targetSpot.y, delta * 8);

      // Rotate smoothly towards spot facing angle
      groupRef.current.rotation.y = THREE.MathUtils.lerp(groupRef.current.rotation.y, targetSpot.faceAngle, delta * 6);

      // Switch to resting/sitting animation
      if (actionState !== targetSpot.actionState) {
        setActionState(targetSpot.actionState);
      }
    }

    // Role ring: keep flat on the floor even when character sits up
    if (ringRef.current) {
      const pulse = 1 + Math.sin(now / 240) * 0.08;
      const baseScale = hovered ? 1.25 : 1.0;
      ringRef.current.scale.set(baseScale * pulse, baseScale * pulse, 1);
      // Anchor ring to floor regardless of group Y elevation
      ringRef.current.position.y = -groupRef.current.position.y + 0.015;
    }

    // Sync live coordinates to shared ref for HUD labels
    if (livePositionsRef && livePositionsRef.current) {
      livePositionsRef.current[role] = {
        x: groupRef.current.position.x,
        z: groupRef.current.position.z,
        rotationY: groupRef.current.rotation.y,
        isWalking,
        bubbleText: currentDialogue.current,
      };
    }
  });

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(agent);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      {/* Glowing Neon Role Ring */}
      <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
        <ringGeometry args={[0.35, 0.52, 32]} />
        <meshStandardMaterial
          color={ringColor}
          emissive={ringColor}
          emissiveIntensity={working ? 1.4 : 0.45}
          roughness={0.1}
        />
      </mesh>

      <ModelErrorBoundary fallback={<CharacterFallback />}>
        <Suspense fallback={<CharacterFallback />}>
          <AnimatedCharacterMesh
            sprite={sprite}
            role={role}
            actionState={actionState}
          />
        </Suspense>
      </ModelErrorBoundary>
    </group>
  );
}

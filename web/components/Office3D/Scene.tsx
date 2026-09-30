"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, OrbitControls, Sky, Stars } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";
import type { AgentState, RoadmapData } from "@/lib/types";
import { FLOOR2_Y } from "./layout";
import type { ViewFloor } from "./CharacterModel";
import { AllDesks, type DeskActivity } from "./DeskProp";
import { GroundFloorShell, Grounds, Staircase, UpperFloorShell } from "./Building";
import { ConferenceMeetingTable, CoffeeEspressoBar, PendantLamp, PottedPlant, WallBookshelf, WallWhiteboard } from "./OfficeProps";
import {
  ArcadeMachine,
  BeanBag,
  CoffeeTable,
  EntranceDoor,
  HighTable,
  type InteractFn,
  LoungeChair,
  LoungeTV,
  MeetingScreen,
  Parasol,
  PingPongTable,
  PlanterBox,
  ReceptionDesk,
  Rug,
  ServerRack,
  Sofa,
  StringLights,
  Tree,
  WaterCooler,
} from "./RoomProps";

type Vec3 = [number, number, number];

export interface CameraFocus {
  target: Vec3;
  position: Vec3;
  key: number;
}

export const VIEW_PRESETS: Record<"all" | "1" | "2", Omit<CameraFocus, "key">> = {
  all: { target: [0, 2.4, 0], position: [17, 15.5, 19] },
  "1": { target: [0, 0.6, 0], position: [12.5, 11.5, 14.5] },
  "2": { target: [0, FLOOR2_Y + 0.6, -0.3], position: [12.5, 14.5, 14.5] },
};

// Glides the orbit camera to `focus`; any user drag cancels the glide.
function CameraRig({ focus }: { focus: CameraFocus }) {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const camera = useThree((s) => s.camera);
  const active = useRef(false);
  const target = useMemo(() => new THREE.Vector3(), []);
  const position = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    target.set(...focus.target);
    position.set(...focus.position);
    active.current = true;
  }, [focus, target, position]);

  useEffect(() => {
    if (!controls) return;
    const stop = () => {
      active.current = false;
    };
    controls.addEventListener("start", stop);
    return () => controls.removeEventListener("start", stop);
  }, [controls]);

  useFrame((_, dt) => {
    if (!active.current || !controls) return;
    const k = 1 - Math.exp(-dt * 3.5);
    controls.target.lerp(target, k);
    camera.position.lerp(position, k);
    controls.update();
    if (camera.position.distanceTo(position) < 0.02 && controls.target.distanceTo(target) < 0.02) active.current = false;
  });

  return null;
}

function Lighting({ night }: { night: boolean }) {
  const sun: Vec3 = night ? [-12, 20, 8] : [16, 24, 10];
  return (
    <>
      {night ? (
        <>
          <color attach="background" args={["#0b1020"]} />
          <Stars radius={90} depth={40} count={2500} factor={4} fade speed={0.5} />
        </>
      ) : (
        <Sky distance={450} sunPosition={sun} turbidity={3} rayleigh={1.1} mieCoefficient={0.004} />
      )}
      <hemisphereLight args={[night ? "#334155" : "#e0f2fe", night ? "#1c1917" : "#e7dccb", night ? 0.45 : 1.1]} />
      <directionalLight
        position={sun}
        intensity={night ? 0.5 : 2.6}
        color={night ? "#a5b4fc" : "#fff4e0"}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
        shadow-camera-far={70}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      {/* Interior fill: ground floor is shaded by the upper slab, so it always needs its own lights */}
      {([
        [-5, 3.0, -1.8],
        [5.8, 3.0, -4.2],
        [5.8, 3.0, 3.0],
        [-5, 3.0, 4.5],
      ] as Vec3[]).map((p, i) => (
        <pointLight key={i} position={p} intensity={night ? 9 : 5} distance={12} decay={1.4} color="#fff1dc" />
      ))}
      {night &&
        ([
          [-4, FLOOR2_Y + 2.6, -2.5],
          [5.5, FLOOR2_Y + 2.6, -3],
          [7, FLOOR2_Y + 2.4, 4.3],
          [-2, FLOOR2_Y + 2.6, 4.3],
        ] as Vec3[]).map((p, i) => <pointLight key={i} position={p} intensity={8} distance={11} decay={1.4} color="#ffe4bf" />)}
      {/* Soft studio reflections without downloading an HDRI */}
      <Environment resolution={128} frames={1}>
        <Lightformer intensity={night ? 0.4 : 1.2} position={[0, 8, 0]} rotation-x={Math.PI / 2} scale={[20, 20, 1]} />
        <Lightformer intensity={night ? 0.2 : 0.8} position={[0, 3, 12]} scale={[20, 6, 1]} color="#fde68a" />
        <Lightformer intensity={night ? 0.2 : 0.6} position={[-12, 3, 0]} rotation-y={Math.PI / 2} scale={[20, 6, 1]} color="#bfdbfe" />
      </Environment>
    </>
  );
}

function GroundFloor({ night, activity, roadmap, onInteract }: { night: boolean; activity: Record<string, DeskActivity>; roadmap?: RoadmapData | null; onInteract?: InteractFn }) {
  return (
    <group>
      <GroundFloorShell night={night} />
      <AllDesks floor={1} activity={activity} />
      <Rug position={[-5, 0.004, -1.75]} size={[6.6, 6.8]} color="#cbd5e1" border="#94a3b8" />
      <PendantLamp position={[-6.5, 2.35, -1.75]} onInteract={onInteract} />
      <PendantLamp position={[-3.5, 2.35, -1.75]} onInteract={onInteract} />
      <ServerRack position={[-0.8, 0, -6.55]} onInteract={onInteract} />
      <PottedPlant position={[-9.3, 0, -6.4]} scale={1.2} onInteract={onInteract} />
      <PottedPlant position={[-9.2, 0, 2.4]} scale={1.1} onInteract={onInteract} />
      <PottedPlant position={[-9.4, 0, 3.6]} scale={0.9} onInteract={onInteract} />

      {/* Meeting room */}
      <ConferenceMeetingTable position={[6, 0, -4.2]} onInteract={onInteract} />
      <MeetingScreen position={[6, 1.7, -6.95]} roadmap={roadmap} />
      <PendantLamp position={[6, 2.35, -4.2]} onInteract={onInteract} />

      {/* Pantry */}
      <CoffeeEspressoBar position={[8.3, 0, -0.55]} onInteract={onInteract} />
      <HighTable position={[6, 0, 0.2]} />
      <WaterCooler position={[9.6, 0, 3.2]} rotation={[0, -Math.PI / 2, 0]} onInteract={onInteract} />

      {/* Lobby */}
      <Rug position={[5.2, 0.004, 5.2]} size={[4.5, 3]} color="#e2d6c3" border="#b6a58b" />
      <ReceptionDesk position={[7.2, 0, 5.0]} rotation={[0, Math.PI, 0]} onInteract={onInteract} />
      <Sofa position={[2.45, 0, 5.4]} rotation={[0, Math.PI / 2, 0]} width={1.7} color="#0f766e" cushion="#14b8a6" onInteract={onInteract} />
      <PottedPlant position={[2.3, 0, 6.5]} scale={0.9} onInteract={onInteract} />
      <PottedPlant position={[9.4, 0, 6.4]} scale={1.2} onInteract={onInteract} />
      <EntranceDoor position={[4.8, 0, 7]} onInteract={onInteract} />

      <Staircase position={[-8.8, 0, 6.0]} />
    </group>
  );
}

function UpperFloor({ night, agents, activity, onInteract }: { night: boolean; agents: Record<string, AgentState>; activity: Record<string, DeskActivity>; onInteract?: InteractFn }) {
  const y = FLOOR2_Y;
  return (
    <group>
      <UpperFloorShell night={night} />
      <AllDesks floor={2} activity={activity} />
      <Rug position={[-4, y + 0.004, -2.85]} size={[6.4, 6.8]} color="#e7e0d6" border="#c4b8a6" />
      <WallWhiteboard position={[-9.97, y + 1.6, -3]} rotation={[0, Math.PI / 2, 0]} onInteract={onInteract} />
      <WallBookshelf position={[-8, y + 1.0, -6.85]} onInteract={onInteract} />

      {/* TV lounge */}
      <Rug position={[5.5, y + 0.004, -3.8]} size={[6, 4]} color="#f5efe6" border="#d6c7ae" />
      <LoungeTV position={[5.5, y, -6.95]} agents={agents} onInteract={onInteract} />
      <Sofa position={[5.5, y, -2.35]} rotation={[0, Math.PI, 0]} width={2.6} color="#475569" cushion="#64748b" onInteract={onInteract} />
      <CoffeeTable position={[5.5, y, -4.0]} />
      <BeanBag position={[3.2, y, -4.6]} color="#f59e0b" onInteract={onInteract} />
      <BeanBag position={[7.8, y, -4.6]} color="#e11d48" onInteract={onInteract} />
      <ArcadeMachine position={[9.4, y, -5.6]} rotation={[0, -Math.PI / 2, 0]} onInteract={onInteract} />
      <PottedPlant position={[1.6, y, -6.4]} scale={1.1} onInteract={onInteract} />
      <PottedPlant position={[9.4, y, 1.0]} scale={1.0} onInteract={onInteract} />

      {/* Game corner */}
      <PingPongTable position={[-3, y, 4.2]} onInteract={onInteract} />
      <PottedPlant position={[0.5, y, 6.4]} scale={1.0} onInteract={onInteract} />
      <PottedPlant position={[-7.3, y, 6.4]} scale={0.9} onInteract={onInteract} />

      {/* Rooftop terrace */}
      <Parasol position={[8.6, y, 3.0]} />
      <LoungeChair position={[7.9, y, 3.2]} />
      <LoungeChair position={[9.3, y, 3.2]} />
      <PlanterBox position={[9.65, y, 5.3]} size={[0.5, 2.2]} />
      <PlanterBox position={[5.2, y, 2.0]} size={[1.8, 0.5]} />
      {([
        [4.15, 1.75],
        [9.85, 6.85],
      ] as [number, number][]).map(([x, z]) => (
        <mesh key={x} position={[x, y + 1.35, z]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 2.7, 8]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      ))}
      <StringLights from={[4.15, y + 2.65, 1.75]} to={[9.85, y + 2.65, 6.85]} night={night} />
      {night && <pointLight position={[7, y + 2.2, 4.3]} intensity={3} distance={6} color="#fcd34d" />}
    </group>
  );
}

export function Scene({
  children,
  agents,
  timeOfDay = "day",
  viewFloor,
  focus,
  deskActivity,
  roadmap,
  onInteractProp,
}: {
  children: ReactNode;
  agents: Record<string, AgentState>;
  deskActivity: Record<string, DeskActivity>;
  roadmap?: RoadmapData | null;
  timeOfDay?: "day" | "night";
  viewFloor: ViewFloor;
  focus: CameraFocus;
  onInteractProp?: InteractFn;
}) {
  const night = timeOfDay === "night";

  return (
    <Canvas
      shadows="percentage"
      dpr={[1, 2]}
      camera={{ position: VIEW_PRESETS.all.position, fov: 42, near: 0.1, far: 500 }}
      gl={{ antialias: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={3.5}
        maxDistance={42}
        maxPolarAngle={Math.PI / 2.1}
        target={VIEW_PRESETS.all.target}
      />
      <CameraRig focus={focus} />
      <Lighting night={night} />

      <Grounds night={night} />
      {([
        [-14, -5, 1.2],
        [-13.5, 4, 1.0],
        [-4, -10.5, 1.1],
        [6, -11, 1.3],
        [14, -9, 1.0],
        [-12.5, 10, 0.9],
      ] as Vec3[]).map(([x, z, s]) => (
        <Tree key={`${x}-${z}`} position={[x, -0.2, z]} scale={s} />
      ))}

      <GroundFloor night={night} activity={deskActivity} roadmap={roadmap} onInteract={onInteractProp} />
      {viewFloor !== 1 && <UpperFloor night={night} agents={agents} activity={deskActivity} onInteract={onInteractProp} />}

      {children}
    </Canvas>
  );
}

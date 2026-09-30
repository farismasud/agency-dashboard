"use client";

import { useEffect } from "react";
import { DESK_POS_3D, HOT_DESKS, guestAtSlot } from "./layout";
import { getScreenTexture, updateScreenActivity } from "./ScreenTextures";

export interface DeskActivity {
  lines: string[];
  working: boolean;
}

export function DeskProp({
  role,
  x,
  y = 0,
  z,
  rotationY = 0,
  activity,
}: {
  role: string;
  x: number;
  y?: number;
  z: number;
  rotationY?: number;
  activity?: DeskActivity;
}) {
  const screenTexture = getScreenTexture(role);
  const linesKey = activity ? `${activity.working}|${activity.lines.join("\n")}` : "";
  useEffect(() => {
    if (role && activity) updateScreenActivity(role, activity.lines, activity.working);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, linesKey]);

  return (
    <group position={[x, y, z]} rotation={[0, rotationY, 0]}>
      {/* --- DESK STRUCTURE --- */}
      {/* Table Top (Walnut Wood) */}
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 0.05, 0.8]} />
        <meshStandardMaterial color="#c89f72" roughness={0.45} metalness={0.05} />
      </mesh>

      {/* Desk Legs (Black Matte Metal) */}
      <mesh position={[-0.68, 0.35, -0.32]} castShadow>
        <boxGeometry args={[0.04, 0.7, 0.04]} />
        <meshStandardMaterial color="#1e1e24" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0.68, 0.35, -0.32]} castShadow>
        <boxGeometry args={[0.04, 0.7, 0.04]} />
        <meshStandardMaterial color="#1e1e24" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[-0.68, 0.35, 0.32]} castShadow>
        <boxGeometry args={[0.04, 0.7, 0.04]} />
        <meshStandardMaterial color="#1e1e24" roughness={0.3} metalness={0.8} />
      </mesh>
      <mesh position={[0.68, 0.35, 0.32]} castShadow>
        <boxGeometry args={[0.04, 0.7, 0.04]} />
        <meshStandardMaterial color="#1e1e24" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Back Privacy / Modesty Panel */}
      <mesh position={[0, 0.45, -0.34]} castShadow receiveShadow>
        <boxGeometry args={[1.36, 0.4, 0.02]} />
        <meshStandardMaterial color="#e7e2da" roughness={0.6} />
      </mesh>

      {/* --- COMPUTER SETUP --- */}
      {/* Monitor Stand Base */}
      <mesh position={[0, 0.75, -0.2]} castShadow>
        <cylinderGeometry args={[0.1, 0.12, 0.02, 16]} />
        <meshStandardMaterial color="#27272a" metalness={0.7} roughness={0.3} />
      </mesh>
      {/* Monitor Pole */}
      <mesh position={[0, 0.88, -0.2]} castShadow>
        <cylinderGeometry args={[0.02, 0.02, 0.25, 12]} />
        <meshStandardMaterial color="#3f3f46" metalness={0.8} />
      </mesh>
      {/* Monitor Body / Bezel */}
      <mesh position={[0, 1.05, -0.2]} castShadow>
        <boxGeometry args={[0.72, 0.42, 0.03]} />
        <meshStandardMaterial color="#18181b" roughness={0.2} metalness={0.5} />
      </mesh>
      {/* Monitor Screen (Glowing display with dynamic app texture) */}
      <mesh position={[0, 1.05, -0.183]}>
        <planeGeometry args={[0.68, 0.38]} />
        <meshStandardMaterial
          map={screenTexture}
          emissive="#ffffff"
          emissiveMap={screenTexture}
          emissiveIntensity={0.85}
          roughness={0.2}
        />
      </mesh>

      {/* Desk Lamp (Mini glowing desk lamp) */}
      <group position={[0.55, 0.74, -0.2]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.05, 0.06, 0.02, 12]} />
          <meshStandardMaterial color="#18181b" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.15, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 8]} />
          <meshStandardMaterial color="#71717a" metalness={0.9} />
        </mesh>
        <mesh position={[-0.06, 0.3, 0]} rotation={[0, 0, Math.PI / 4]}>
          <coneGeometry args={[0.06, 0.1, 16]} />
          <meshStandardMaterial color="#eab308" emissive="#fef08a" emissiveIntensity={0.8} />
        </mesh>
      </group>

      {/* Keyboard */}
      <mesh position={[0, 0.75, 0.08]} castShadow receiveShadow>
        <boxGeometry args={[0.42, 0.015, 0.14]} />
        <meshStandardMaterial color="#18181b" roughness={0.4} />
      </mesh>
      {/* Mousepad */}
      <mesh position={[0.34, 0.748, 0.08]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[0.18, 0.22]} />
        <meshStandardMaterial color="#27272a" roughness={0.8} />
      </mesh>
      {/* Mouse */}
      <mesh position={[0.34, 0.76, 0.08]} castShadow>
        <boxGeometry args={[0.05, 0.02, 0.09]} />
        <meshStandardMaterial color="#09090b" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Coffee Mug */}
      <group position={[-0.45, 0.745, 0.1]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.04, 0.035, 0.09, 16]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.2} />
        </mesh>
        {/* Coffee Liquid */}
        <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[0.033, 12]} />
          <meshStandardMaterial color="#3f2e18" roughness={0.1} />
        </mesh>
      </group>

      {/* --- ERGONOMIC CHAIR --- */}
      <group position={[0, 0, 0.65]}>
        {/* Wheels / Star Base */}
        <mesh position={[0, 0.06, 0]} castShadow>
          <cylinderGeometry args={[0.26, 0.28, 0.04, 5]} />
          <meshStandardMaterial color="#09090b" roughness={0.5} />
        </mesh>
        {/* Gas Lift Cylinder */}
        <mesh position={[0, 0.22, 0]} castShadow>
          <cylinderGeometry args={[0.03, 0.03, 0.28, 12]} />
          <meshStandardMaterial color="#71717a" metalness={0.9} />
        </mesh>
        {/* Seat Cushion */}
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.46, 0.08, 0.44]} />
          <meshStandardMaterial color="#1e293b" roughness={0.7} />
        </mesh>
        {/* Backrest */}
        <mesh position={[0, 0.74, 0.2]} rotation={[-0.08, 0, 0]} castShadow>
          <boxGeometry args={[0.42, 0.55, 0.05]} />
          <meshStandardMaterial color="#334155" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

export function AllDesks({ floor, activity }: { floor: 1 | 2; activity: Record<string, DeskActivity> }) {
  return (
    <>
      {Object.entries(DESK_POS_3D)
        .filter(([, [, y]]) => (y > 1 ? 2 : 1) === floor)
        .map(([role, [x, y, z]]) => (
          <DeskProp key={role} role={role} x={x} y={y} z={z} activity={activity[role]} />
        ))}
      {floor === 1 &&
        HOT_DESKS.map(([x, y, z], slot) => {
          const guest = guestAtSlot(slot);
          return (
            <DeskProp
              key={`hot-${slot}`}
              role={guest ?? `hotdesk-${slot}`}
              x={x}
              y={y}
              z={z}
              rotationY={Math.PI}
              activity={guest ? activity[guest] : undefined}
            />
          );
        })}
    </>
  );
}

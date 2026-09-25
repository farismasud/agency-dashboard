"use client";

import { DESK_POS } from "./layout";

export function DeskProp({ x, z }: { x: number; z: number }) {
  return (
    <group position={[x, 0, z]}>
      {/* Desk body */}
      <mesh position={[0, 0.375, 0]}>
        <boxGeometry args={[1.4, 0.75, 0.7]} />
        <meshStandardMaterial color="#b98a55" />
      </mesh>
      {/* Monitor */}
      <mesh position={[0, 0.95, -0.2]}>
        <boxGeometry args={[0.6, 0.4, 0.05]} />
        <meshStandardMaterial color="#2b2b33" />
      </mesh>
      {/* Chair */}
      <mesh position={[0, 0.25, 0.7]}>
        <cylinderGeometry args={[0.25, 0.25, 0.5, 12]} />
        <meshStandardMaterial color="#3f3f46" />
      </mesh>
    </group>
  );
}

export function AllDesks() {
  return (
    <>
      {Object.entries(DESK_POS).map(([role, [x, z]]) => (
        <DeskProp key={role} x={x} z={z} />
      ))}
    </>
  );
}

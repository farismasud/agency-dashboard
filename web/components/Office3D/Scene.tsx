"use client";

import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { PerspectiveCamera } from "@react-three/drei";

export function Scene({ children }: { children: ReactNode }) {
  return (
    <Canvas shadows={false} style={{ width: "100%", height: "100%" }}>
      <PerspectiveCamera
        makeDefault
        position={[6, 7, 9]}
        fov={45}
        onUpdate={(camera) => camera.lookAt(0, 1, 0)}
      />
      <ambientLight intensity={0.7} />
      <directionalLight position={[5, 8, 5]} intensity={0.8} />

      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <planeGeometry args={[16, 10]} />
        <meshStandardMaterial color="#e8cfa0" />
      </mesh>

      {/* Back wall */}
      <mesh position={[0, 2.5, -4]}>
        <planeGeometry args={[16, 5]} />
        <meshStandardMaterial color="#f3e9d8" />
      </mesh>

      {/* Side wall */}
      <mesh position={[-8, 2.5, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[10, 5]} />
        <meshStandardMaterial color="#ece0cc" />
      </mesh>

      {children}
    </Canvas>
  );
}

"use client";

import type { ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import {
  PottedPlant,
  WallWhiteboard,
  WallBookshelf,
  BreakLoungeArea,
  PendantLamp,
} from "./OfficeProps";

export function Scene({
  children,
  onInteractProp,
}: {
  children: ReactNode;
  onInteractProp?: (title: string, message: string, icon: string) => void;
}) {
  return (
    <Canvas
      shadows
      camera={{ position: [9, 8, 11], fov: 42 }}
      style={{ width: "100%", height: "100%" }}
    >
      <PerspectiveCamera makeDefault position={[9, 8, 11]} fov={42} />

      {/* OrbitControls: 360 rotation, smooth damping, zoom & pan */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.06}
        minDistance={4}
        maxDistance={24}
        maxPolarAngle={Math.PI / 2.1} // don't go below floor
        target={[0, 0.8, 0]}
      />

      {/* --- LIGHTING --- */}
      <ambientLight intensity={0.75} color="#cbd5e1" />
      
      {/* Studio Key Light (Sun / Main Spotlight) */}
      <directionalLight
        position={[10, 14, 8]}
        intensity={1.8}
        color="#fffbeb"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={35}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-bias={-0.0001}
      />

      {/* Cool Fill Light from Window */}
      <directionalLight position={[-10, 8, -6]} intensity={0.6} color="#38bdf8" />

      {/* --- ARCHITECTURAL ROOM STRUCTURE --- */}
      {/* Wooden Parquet Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[18, 14]} />
        <meshStandardMaterial color="#2d221b" roughness={0.4} metalness={0.05} />
      </mesh>

      {/* Plush Office Rug (Under the work desks) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.2, 0.005, -0.4]} receiveShadow>
        <planeGeometry args={[11.5, 6.2]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
      {/* Rug Accent Border */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.2, 0.006, -0.4]} receiveShadow>
        <planeGeometry args={[11.2, 5.9]} />
        <meshStandardMaterial color="#0f172a" roughness={0.95} />
      </mesh>

      {/* --- ARCHITECTURAL BACK WALL WITH CARVED WINDOW APERTURE --- */}
      {/* Left Wall Section (from x = -9 to x = 0.1) */}
      <mesh position={[-4.45, 2.75, -5.5]} receiveShadow>
        <planeGeometry args={[9.1, 5.5]} />
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </mesh>
      {/* Right Wall Section (from x = 6.3 to x = 9.0) */}
      <mesh position={[7.65, 2.75, -5.5]} receiveShadow>
        <planeGeometry args={[2.7, 5.5]} />
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </mesh>
      {/* Top Header Section above Window (y = 4.6 to 5.5) */}
      <mesh position={[3.2, 5.05, -5.5]} receiveShadow>
        <planeGeometry args={[6.2, 0.9]} />
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </mesh>
      {/* Bottom Sill Section below Window (y = 0 to 1.4) */}
      <mesh position={[3.2, 0.7, -5.5]} receiveShadow>
        <planeGeometry args={[6.2, 1.4]} />
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </mesh>

      {/* Back Wall Baseboard Trim (Left of window) */}
      <mesh position={[-4.45, 0.1, -5.48]} receiveShadow>
        <boxGeometry args={[9.1, 0.2, 0.04]} />
        <meshStandardMaterial color="#09090b" roughness={0.5} />
      </mesh>
      {/* Back Wall Baseboard Trim (Under window) */}
      <mesh position={[3.2, 0.1, -5.48]} receiveShadow>
        <boxGeometry args={[6.2, 0.2, 0.04]} />
        <meshStandardMaterial color="#09090b" roughness={0.5} />
      </mesh>
      {/* Back Wall Baseboard Trim (Right of window) */}
      <mesh position={[7.65, 0.1, -5.48]} receiveShadow>
        <boxGeometry args={[2.7, 0.2, 0.04]} />
        <meshStandardMaterial color="#09090b" roughness={0.5} />
      </mesh>

      {/* --- PANORAMIC WINDOW WITH NIGHT CITY & GLOWING MOON --- */}
      <group
        position={[3.2, 3.0, -5.48]}
        onPointerOver={(e) => {
          e.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onInteractProp?.(
            "Jendela Langit Malam",
            "Bulan purnama & ribuan bintang di langit malam menemani kerja keras seluruh agensi.",
            "🌕"
          );
        }}
      >
        {/* Hollow Architectural Window Frame */}
        {/* Top Outer Frame */}
        <mesh position={[0, 1.55, 0]} castShadow receiveShadow>
          <boxGeometry args={[6.2, 0.12, 0.16]} />
          <meshStandardMaterial color="#09090b" metalness={0.85} roughness={0.25} />
        </mesh>
        {/* Bottom Outer Sill (Deep ledge) */}
        <mesh position={[0, -1.55, 0.06]} castShadow receiveShadow>
          <boxGeometry args={[6.35, 0.14, 0.26]} />
          <meshStandardMaterial color="#09090b" metalness={0.85} roughness={0.25} />
        </mesh>
        {/* Left Outer Frame */}
        <mesh position={[-3.05, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 3.0, 0.16]} />
          <meshStandardMaterial color="#09090b" metalness={0.85} roughness={0.25} />
        </mesh>
        {/* Right Outer Frame */}
        <mesh position={[3.05, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.12, 3.0, 0.16]} />
          <meshStandardMaterial color="#09090b" metalness={0.85} roughness={0.25} />
        </mesh>

        {/* Thin Architectural Mullions (Dividers) */}
        <mesh position={[-1.0, 0, 0.04]}>
          <boxGeometry args={[0.04, 3.0, 0.06]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} />
        </mesh>
        <mesh position={[1.0, 0, 0.04]}>
          <boxGeometry args={[0.04, 3.0, 0.06]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} />
        </mesh>
        <mesh position={[0, 0.45, 0.04]}>
          <boxGeometry args={[6.0, 0.04, 0.06]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} />
        </mesh>

        {/* Crystal Clear Glass Pane */}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[6.0, 3.0]} />
          <meshStandardMaterial
            color="#bae6fd"
            transparent
            opacity={0.12}
            roughness={0.05}
            metalness={0.2}
          />
        </mesh>

        {/* === OUTSIDE WINDOW: DEEP NIGHT SKY, MOON & STARS === */}
        {/* Deep Night Cosmic Backdrop */}
        <mesh position={[0, 0, -1.8]}>
          <planeGeometry args={[16, 9]} />
          <meshBasicMaterial color="#020617" />
        </mesh>

        {/* 🌕 THE GLOWING FULL MOON (PROMINENTLY CENTERED IN WINDOW) */}
        <group position={[-0.4, 0.85, -1.2]}>
          {/* Main Moon 3D Sphere */}
          <mesh>
            <sphereGeometry args={[0.72, 32, 32]} />
            <meshStandardMaterial
              color="#fffbeb"
              emissive="#fef08a"
              emissiveIntensity={3.6}
              roughness={0.15}
            />
          </mesh>
          {/* Moon Crater Accents */}
          <mesh position={[-0.18, 0.12, 0.68]} rotation={[0, 0, 0.4]}>
            <circleGeometry args={[0.15, 16]} />
            <meshBasicMaterial color="#fde047" transparent opacity={0.35} />
          </mesh>
          <mesh position={[0.22, -0.16, 0.66]}>
            <circleGeometry args={[0.18, 16]} />
            <meshBasicMaterial color="#facc15" transparent opacity={0.3} />
          </mesh>
          {/* Soft Moonlight Glow Halo */}
          <mesh position={[0, 0, -0.06]}>
            <circleGeometry args={[1.55, 32]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.32} />
          </mesh>
          <mesh position={[0, 0, -0.08]}>
            <circleGeometry args={[2.5, 32]} />
            <meshBasicMaterial color="#60a5fa" transparent opacity={0.14} />
          </mesh>
          {/* Cool Moonlight shining into the office */}
          <pointLight color="#bae6fd" intensity={4.2} distance={18} />
        </group>

        {/* Twinkling Night Stars */}
        {[
          [-2.6, 1.25, -1.4, 0.035],
          [-2.1, 0.9, -1.4, 0.025],
          [-1.8, 1.35, -1.4, 0.03],
          [-1.4, 0.6, -1.4, 0.02],
          [-1.1, 1.1, -1.4, 0.04],
          [-0.6, 1.3, -1.4, 0.025],
          [-0.2, 0.8, -1.4, 0.035],
          [0.3, 1.35, -1.4, 0.02],
          [0.8, 1.1, -1.4, 0.04],
          [1.0, 1.4, -1.4, 0.025],
          [2.4, 1.25, -1.4, 0.03],
          [2.7, 0.7, -1.4, 0.035],
          [-2.4, 0.3, -1.4, 0.02],
          [-0.8, 0.4, -1.4, 0.025],
          [2.5, 0.2, -1.4, 0.02],
        ].map(([sx, sy, sz, radius], idx) => (
          <mesh key={idx} position={[sx, sy, sz]}>
            <sphereGeometry args={[radius, 8, 8]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
        ))}

        {/* Distant City Skyline Silhouettes with Glowing Windows */}
        <group position={[0, -0.65, -0.8]}>
          {/* Skyscraper 1 */}
          <mesh position={[-2.4, 0.25, 0]}>
            <boxGeometry args={[0.65, 1.3, 0.1]} />
            <meshStandardMaterial color="#090d16" roughness={0.9} />
          </mesh>
          {/* Windows Skyscraper 1 */}
          <mesh position={[-2.4, 0.35, 0.06]}>
            <planeGeometry args={[0.45, 0.6]} />
            <meshBasicMaterial color="#fef08a" transparent opacity={0.65} />
          </mesh>

          {/* Skyscraper 2 with Antenna & Flashing Beacon */}
          <mesh position={[-1.5, 0.5, 0]}>
            <boxGeometry args={[0.8, 1.8, 0.1]} />
            <meshStandardMaterial color="#0b1329" roughness={0.9} />
          </mesh>
          <mesh position={[-1.5, 0.5, 0.06]}>
            <planeGeometry args={[0.55, 1.1]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.55} />
          </mesh>
          <mesh position={[-1.5, 1.5, 0]}>
            <cylinderGeometry args={[0.015, 0.015, 0.4, 6]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>

          {/* Skyscraper 3 */}
          <mesh position={[-0.5, 0.15, 0]}>
            <boxGeometry args={[0.9, 1.1, 0.1]} />
            <meshStandardMaterial color="#090d16" roughness={0.9} />
          </mesh>

          {/* Skyscraper 4 */}
          <mesh position={[0.5, 0.4, 0]}>
            <boxGeometry args={[0.85, 1.6, 0.1]} />
            <meshStandardMaterial color="#0f172a" roughness={0.9} />
          </mesh>
          <mesh position={[0.5, 0.45, 0.06]}>
            <planeGeometry args={[0.6, 0.9]} />
            <meshBasicMaterial color="#fef08a" transparent opacity={0.6} />
          </mesh>

          {/* Skyscraper 5 */}
          <mesh position={[1.5, 0.2, 0]}>
            <boxGeometry args={[0.7, 1.2, 0.1]} />
            <meshStandardMaterial color="#090d16" roughness={0.9} />
          </mesh>

          {/* Skyscraper 6 */}
          <mesh position={[2.4, 0.45, 0]}>
            <boxGeometry args={[0.75, 1.7, 0.1]} />
            <meshStandardMaterial color="#0b1329" roughness={0.9} />
          </mesh>
          <mesh position={[2.4, 0.5, 0.06]}>
            <planeGeometry args={[0.5, 1.0]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.5} />
          </mesh>
        </group>
      </group>

      {/* Side Wall (Left) */}
      <mesh position={[-9, 2.75, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[14, 5.5]} />
        <meshStandardMaterial color="#27272a" roughness={0.7} />
      </mesh>
      {/* Side Wall Baseboard */}
      <mesh position={[-8.98, 0.1, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[14, 0.2, 0.04]} />
        <meshStandardMaterial color="#09090b" />
      </mesh>

      {/* --- PROPS & ACCENTS --- */}
      {/* Whiteboard on Left Wall */}
      <WallWhiteboard
        position={[-8.95, 2.8, -1.2]}
        rotation={[0, Math.PI / 2, 0]}
        onInteract={onInteractProp}
      />

      {/* Bookshelf on Back Wall (Left side) */}
      <WallBookshelf position={[-4.5, 2.8, -5.35]} onInteract={onInteractProp} />

      {/* Indoor Potted Plants */}
      <PottedPlant position={[-7.8, 0, -4.6]} scale={1.25} onInteract={onInteractProp} />
      <PottedPlant position={[7.5, 0, -4.6]} scale={1.15} onInteract={onInteractProp} />
      <PottedPlant position={[-8.0, 0, 4.2]} scale={1.05} onInteract={onInteractProp} />

      {/* Break Lounge Corner (Front-Right Area) */}
      <BreakLoungeArea position={[5.2, 0, 3.0]} onInteract={onInteractProp} />

      {/* Pendant Lights Hanging from Ceiling above Desks */}
      <PendantLamp position={[-2.6, 3.8, -1]} onInteract={onInteractProp} />
      <PendantLamp position={[3.2, 3.8, -1]} onInteract={onInteractProp} />

      {/* Active Scene Content (Desks, Avatars, etc.) */}
      {children}
    </Canvas>
  );
}

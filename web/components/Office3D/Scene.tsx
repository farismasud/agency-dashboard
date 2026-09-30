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
  ArchitecturalStaircase,
  MezzanineGlassRailing,
  ConferenceMeetingTable,
  EntranceDoor,
  CoffeeEspressoBar,
} from "./OfficeProps";

export function Scene({
  children,
  timeOfDay = "day",
  onInteractProp,
}: {
  children: ReactNode;
  timeOfDay?: "day" | "night";
  onInteractProp?: (title: string, message: string, icon: string) => void;
}) {
  const isDay = timeOfDay === "day";

  return (
    <Canvas
      shadows
      camera={{ position: [14, 12, 16], fov: 44 }}
      style={{ width: "100%", height: "100%" }}
    >
      <PerspectiveCamera makeDefault position={[14, 12, 16]} fov={44} />

      {/* OrbitControls: 360 smooth exploration of 2-floor agency */}
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.06}
        minDistance={5}
        maxDistance={32}
        maxPolarAngle={Math.PI / 2.08}
        target={[0, 2.0, 0]}
      />

      {/* --- DYNAMIC DAY / NIGHT LIGHTING --- */}
      {/* Ambient Light: Clear natural daylight or warm inviting golden-ivory nighttime office interior */}
      <ambientLight
        intensity={isDay ? 1.25 : 1.4}
        color={isDay ? "#f8fafc" : "#fef3c7"}
      />

      {/* Main Key Light: Sun beam in daytime or ceiling downlights at night */}
      <directionalLight
        position={isDay ? [12, 18, 10] : [2, 16, 4]}
        intensity={isDay ? 2.4 : 1.9}
        color={isDay ? "#fffbeb" : "#fffbeb"}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={45}
        shadow-camera-left={-16}
        shadow-camera-right={16}
        shadow-camera-top={16}
        shadow-camera-bottom={-16}
        shadow-bias={-0.0001}
      />

      {/* Window Lighting: Daylight sunbeam or soft cinematic moonlight rim */}
      <directionalLight
        position={[6, 8, -10]}
        intensity={isDay ? 1.8 : 1.3}
        color={isDay ? "#bae6fd" : "#93c5fd"}
      />

      {/* Night Interior Ceiling Fill Lights: Ensures all 2 floors are clearly visible, warm & cozy */}
      {!isDay && (
        <>
          {/* Floor 1 Core Workstations Overhead Light */}
          <pointLight position={[0, 3.8, 1.0]} intensity={1.8} distance={18} color="#fef08a" />
          {/* Floor 2 Mezzanine Workstations Overhead Light */}
          <pointLight position={[-5.5, 6.8, -3.2]} intensity={1.8} distance={15} color="#fef3c7" />
          {/* Break Lounge & Entrance Warm Glow */}
          <pointLight position={[6.5, 3.5, 3.5]} intensity={1.4} distance={14} color="#fde68a" />
          {/* Conference Meeting Area Warm Glow */}
          <pointLight position={[6.0, 3.5, -1.8]} intensity={1.4} distance={14} color="#fef3c7" />
        </>
      )}

      {/* --- FLOOR 1 (Ground Floor - Parquet & Dark Slate) --- */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0.5]} receiveShadow>
        <planeGeometry args={[22, 16]} />
        <meshStandardMaterial color="#241a15" roughness={0.45} metalness={0.05} />
      </mesh>

      {/* Ground Floor Workstation Rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 1.0]} receiveShadow>
        <planeGeometry args={[12, 11]} />
        <meshStandardMaterial color="#1e293b" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 1.0]} receiveShadow>
        <planeGeometry args={[11.6, 10.6]} />
        <meshStandardMaterial color="#0f172a" roughness={0.95} />
      </mesh>

      {/* --- FLOOR 2: MEZZANINE SLAB & STRUCTURAL COLUMNS --- */}
      {/* Mezzanine Concrete / Hardwood Slab (y = 3.58) */}
      <mesh position={[-5.5, 3.58, -3.25]} castShadow receiveShadow>
        <boxGeometry args={[11.0, 0.16, 8.5]} />
        <meshStandardMaterial color="#1c1917" roughness={0.5} metalness={0.1} />
      </mesh>
      {/* Mezzanine Floor Surface Trim */}
      <mesh position={[-5.5, 3.67, -3.25]} receiveShadow>
        <boxGeometry args={[10.9, 0.02, 8.4]} />
        <meshStandardMaterial color="#2d221b" roughness={0.4} />
      </mesh>
      {/* Mezzanine Work Area Rug */}
      <mesh position={[-6.0, 3.685, -3.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8.5, 6.5]} />
        <meshStandardMaterial color="#1e293b" roughness={0.95} />
      </mesh>

      {/* Structural Support Columns (From Floor 1 to Floor 2 ceiling) */}
      <mesh position={[-0.2, 3.6, 0.9]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 7.2, 16]} />
        <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[-0.2, 3.6, -7.3]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 7.2, 16]} />
        <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Mezzanine Glass Balustrade Overlooking Floor 1 */}
      <MezzanineGlassRailing onInteract={onInteractProp} />

      {/* Floating Staircase Connecting Floor 1 to Floor 2 */}
      <ArchitecturalStaircase position={[-9.2, 0, 3.6]} onInteract={onInteractProp} />

      {/* --- WALLS WITH CARVED PANORAMIC DOUBLE-HEIGHT WINDOW --- */}
      {/* Left Wall (Double-Height: 22 units wide, 7.5 units high) */}
      <mesh position={[-11, 3.75, 0.5]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[16, 7.5]} />
        <meshStandardMaterial color="#27272a" roughness={0.75} />
      </mesh>
      {/* Left Wall Baseboard */}
      <mesh position={[-10.98, 0.1, 0.5]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[16, 0.2, 0.04]} />
        <meshStandardMaterial color="#09090b" />
      </mesh>

      {/* Right Wall (Double-Height) */}
      <mesh position={[11, 3.75, 0.5]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[16, 7.5]} />
        <meshStandardMaterial color="#27272a" roughness={0.75} />
      </mesh>
      <mesh position={[10.98, 0.1, 0.5]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <boxGeometry args={[16, 0.2, 0.04]} />
        <meshStandardMaterial color="#09090b" />
      </mesh>

      {/* Back Wall Section Left of Window (x = -11 to x = 0.5, width = 11.5) */}
      <mesh position={[-5.25, 3.75, -7.5]} receiveShadow>
        <planeGeometry args={[11.5, 7.5]} />
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </mesh>
      {/* Back Wall Section Right of Window (x = 10.5 to x = 11.0, width = 0.5) */}
      <mesh position={[10.75, 3.75, -7.5]} receiveShadow>
        <planeGeometry args={[0.5, 7.5]} />
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </mesh>
      {/* Back Wall Header above Window (y = 6.9 to 7.5, height = 0.6) */}
      <mesh position={[5.5, 7.2, -7.5]} receiveShadow>
        <planeGeometry args={[10.0, 0.6]} />
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </mesh>
      {/* Back Wall Sill below Window (y = 0 to 0.7, height = 0.7) */}
      <mesh position={[5.5, 0.35, -7.5]} receiveShadow>
        <planeGeometry args={[10.0, 0.7]} />
        <meshStandardMaterial color="#18181b" roughness={0.8} />
      </mesh>

      {/* --- GIANT DOUBLE-HEIGHT PANORAMIC WINDOW --- */}
      <group
        position={[5.5, 3.8, -7.48]}
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
            isDay ? "Pemandangan Siang Hari" : "Pemandangan Langit Malam",
            isDay
              ? "Matahari pagi bersinar cerah di atas kota, energi tim penuh untuk coding!"
              : "Bulan purnama & ribuan bintang di langit malam menemani kerja keras seluruh agensi.",
            isDay ? "☀️" : "🌕"
          );
        }}
      >
        {/* Outer Heavy Steel Frame */}
        <mesh position={[0, 3.12, 0]} castShadow>
          <boxGeometry args={[10.0, 0.16, 0.2]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} />
        </mesh>
        <mesh position={[0, -3.12, 0.08]} castShadow>
          <boxGeometry args={[10.2, 0.18, 0.32]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} />
        </mesh>
        <mesh position={[-4.95, 0, 0]} castShadow>
          <boxGeometry args={[0.16, 6.2, 0.2]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} />
        </mesh>
        <mesh position={[4.95, 0, 0]} castShadow>
          <boxGeometry args={[0.16, 6.2, 0.2]} />
          <meshStandardMaterial color="#09090b" metalness={0.9} />
        </mesh>

        {/* Architectural Glass Mullions & Transoms (4x3 Modern Grid) */}
        {[-2.5, 0, 2.5].map((mx) => (
          <mesh key={mx} position={[mx, 0, 0.04]}>
            <boxGeometry args={[0.06, 6.2, 0.08]} />
            <meshStandardMaterial color="#09090b" metalness={0.9} />
          </mesh>
        ))}
        {[-1.0, 1.0].map((my) => (
          <mesh key={my} position={[0, my, 0.04]}>
            <boxGeometry args={[9.8, 0.06, 0.08]} />
            <meshStandardMaterial color="#09090b" metalness={0.9} />
          </mesh>
        ))}

        {/* Clear Double-Height Glass Pane */}
        <mesh position={[0, 0, 0.02]}>
          <planeGeometry args={[9.8, 6.1]} />
          <meshStandardMaterial
            color={isDay ? "#bae6fd" : "#93c5fd"}
            transparent
            opacity={0.12}
            roughness={0.05}
            metalness={0.2}
          />
        </mesh>

        {/* === OUTSIDE SKY & CELESTIAL BODIES (DAY VS NIGHT) === */}
        {/* Sky Backdrop */}
        <mesh position={[0, 0, -2.2]}>
          <planeGeometry args={[26, 14]} />
          <meshBasicMaterial color={isDay ? "#38bdf8" : "#020617"} />
        </mesh>

        {/* ☀️ DAY MODE: GOLDEN RADIANT SUN & CLOUDS */}
        {isDay && (
          <group position={[1.5, 1.4, -1.4]}>
            {/* Sun Sphere */}
            <mesh>
              <sphereGeometry args={[0.85, 32, 32]} />
              <meshBasicMaterial color="#fef08a" />
            </mesh>
            {/* Sun Glow Halo */}
            <mesh position={[0, 0, -0.05]}>
              <circleGeometry args={[2.4, 32]} />
              <meshBasicMaterial color="#fed7aa" transparent opacity={0.35} />
            </mesh>
            <mesh position={[0, 0, -0.08]}>
              <circleGeometry args={[4.0, 32]} />
              <meshBasicMaterial color="#fef08a" transparent opacity={0.15} />
            </mesh>
            {/* Warm sunlight beam pouring into studio */}
            <pointLight color="#fef08a" intensity={4.5} distance={22} />

            {/* Drifting Clouds */}
            <group position={[-3.5, -0.8, -0.4]}>
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.45, 16, 16]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
              </mesh>
              <mesh position={[0.5, -0.1, 0]}>
                <sphereGeometry args={[0.35, 16, 16]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
              </mesh>
              <mesh position={[-0.4, -0.1, 0]}>
                <sphereGeometry args={[0.35, 16, 16]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
              </mesh>
            </group>
            <group position={[2.8, -1.4, -0.4]}>
              <mesh position={[0, 0, 0]}>
                <sphereGeometry args={[0.5, 16, 16]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
              </mesh>
              <mesh position={[0.6, -0.1, 0]}>
                <sphereGeometry args={[0.38, 16, 16]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
              </mesh>
              <mesh position={[-0.5, -0.1, 0]}>
                <sphereGeometry args={[0.38, 16, 16]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.75} />
              </mesh>
            </group>
          </group>
        )}

        {/* 🌙 NIGHT MODE: GLOWING MOON & 60+ STARS */}
        {!isDay && (
          <>
            <group position={[1.5, 1.4, -1.4]}>
              {/* Moon Sphere */}
              <mesh>
                <sphereGeometry args={[0.85, 32, 32]} />
                <meshStandardMaterial
                  color="#fffbeb"
                  emissive="#fef08a"
                  emissiveIntensity={3.8}
                  roughness={0.15}
                />
              </mesh>
              {/* Craters */}
              <mesh position={[-0.2, 0.15, 0.8]} rotation={[0, 0, 0.4]}>
                <circleGeometry args={[0.18, 16]} />
                <meshBasicMaterial color="#fde047" transparent opacity={0.35} />
              </mesh>
              <mesh position={[0.26, -0.18, 0.78]}>
                <circleGeometry args={[0.22, 16]} />
                <meshBasicMaterial color="#facc15" transparent opacity={0.3} />
              </mesh>
              {/* Halo */}
              <mesh position={[0, 0, -0.06]}>
                <circleGeometry args={[1.8, 32]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.32} />
              </mesh>
              <mesh position={[0, 0, -0.08]}>
                <circleGeometry args={[2.8, 32]} />
                <meshBasicMaterial color="#60a5fa" transparent opacity={0.14} />
              </mesh>
              <pointLight color="#bae6fd" intensity={4.5} distance={22} />
            </group>

            {/* Twinkling Night Stars */}
            {[
              [-4.2, 2.2, -1.8, 0.04],
              [-3.6, 1.5, -1.8, 0.03],
              [-3.0, 2.4, -1.8, 0.045],
              [-2.4, 1.1, -1.8, 0.025],
              [-1.8, 2.1, -1.8, 0.05],
              [-1.1, 1.3, -1.8, 0.03],
              [-0.4, 2.5, -1.8, 0.04],
              [0.2, 1.8, -1.8, 0.035],
              [0.8, 2.6, -1.8, 0.05],
              [3.4, 2.3, -1.8, 0.04],
              [4.1, 1.6, -1.8, 0.045],
              [4.6, 2.5, -1.8, 0.035],
              [-4.0, 0.5, -1.8, 0.03],
              [-1.5, 0.6, -1.8, 0.035],
              [3.8, 0.4, -1.8, 0.03],
            ].map(([sx, sy, sz, radius], idx) => (
              <mesh key={idx} position={[sx, sy, sz]}>
                <sphereGeometry args={[radius, 8, 8]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            ))}
          </>
        )}

        {/* City Skyline Silhouettes */}
        <group position={[0, -1.4, -1.0]}>
          {/* Skyscraper 1 */}
          <mesh position={[-3.8, 0.5, 0]}>
            <boxGeometry args={[1.1, 2.8, 0.1]} />
            <meshStandardMaterial color={isDay ? "#cbd5e1" : "#090d16"} roughness={0.7} />
          </mesh>
          <mesh position={[-3.8, 0.8, 0.06]}>
            <planeGeometry args={[0.8, 1.8]} />
            <meshBasicMaterial
              color={isDay ? "#38bdf8" : "#fef08a"}
              transparent
              opacity={isDay ? 0.35 : 0.65}
            />
          </mesh>

          {/* Skyscraper 2 with Antenna & Beacon */}
          <mesh position={[-2.2, 1.0, 0]}>
            <boxGeometry args={[1.3, 3.8, 0.1]} />
            <meshStandardMaterial color={isDay ? "#94a3b8" : "#0b1329"} roughness={0.7} />
          </mesh>
          <mesh position={[-2.2, 1.1, 0.06]}>
            <planeGeometry args={[1.0, 2.6]} />
            <meshBasicMaterial
              color={isDay ? "#bae6fd" : "#38bdf8"}
              transparent
              opacity={isDay ? 0.45 : 0.6}
            />
          </mesh>
          <mesh position={[-2.2, 3.1, 0]}>
            <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
            <meshBasicMaterial color="#ef4444" />
          </mesh>

          {/* Skyscraper 3 */}
          <mesh position={[-0.5, 0.4, 0]}>
            <boxGeometry args={[1.4, 2.5, 0.1]} />
            <meshStandardMaterial color={isDay ? "#cbd5e1" : "#090d16"} roughness={0.7} />
          </mesh>

          {/* Skyscraper 4 */}
          <mesh position={[1.4, 0.9, 0]}>
            <boxGeometry args={[1.3, 3.4, 0.1]} />
            <meshStandardMaterial color={isDay ? "#94a3b8" : "#0f172a"} roughness={0.7} />
          </mesh>
          <mesh position={[1.4, 1.0, 0.06]}>
            <planeGeometry args={[0.9, 2.2]} />
            <meshBasicMaterial
              color={isDay ? "#38bdf8" : "#fef08a"}
              transparent
              opacity={isDay ? 0.35 : 0.6}
            />
          </mesh>

          {/* Skyscraper 5 */}
          <mesh position={[3.2, 0.6, 0]}>
            <boxGeometry args={[1.2, 2.9, 0.1]} />
            <meshStandardMaterial color={isDay ? "#cbd5e1" : "#090d16"} roughness={0.7} />
          </mesh>

          {/* Skyscraper 6 */}
          <mesh position={[4.6, 1.1, 0]}>
            <boxGeometry args={[1.2, 4.0, 0.1]} />
            <meshStandardMaterial color={isDay ? "#94a3b8" : "#0b1329"} roughness={0.7} />
          </mesh>
          <mesh position={[4.6, 1.2, 0.06]}>
            <planeGeometry args={[0.8, 2.6]} />
            <meshBasicMaterial
              color={isDay ? "#bae6fd" : "#38bdf8"}
              transparent
              opacity={isDay ? 0.45 : 0.55}
            />
          </mesh>
        </group>
      </group>

      {/* --- PROPS & ACCENTS ACROSS 2 FLOORS --- */}
      {/* Floor 2: Large Strategic Whiteboard Kanban */}
      <WallWhiteboard
        position={[-10.95, 5.2, -3.5]}
        rotation={[0, Math.PI / 2, 0]}
        onInteract={onInteractProp}
      />

      {/* Floor 2: Architecture Bookshelf & Archives */}
      <WallBookshelf position={[-6.0, 5.2, -7.38]} onInteract={onInteractProp} />

      {/* Floor 1: Conference & Sprint Review Meeting Table */}
      <ConferenceMeetingTable position={[6.0, 0, -1.8]} onInteract={onInteractProp} />

      {/* Floor 1: Break Lounge Corner (Front-Right) */}
      <BreakLoungeArea position={[7.0, 0, 4.5]} onInteract={onInteractProp} />

      {/* Floor 1: Studio Espresso Machine Bar */}
      <CoffeeEspressoBar position={[4.8, 0, 5.2]} onInteract={onInteractProp} />

      {/* Floor 1: HQ Entrance & Freelancer Door (Right Wall) */}
      <EntranceDoor position={[10.95, 1.5, 1.0]} onInteract={onInteractProp} />

      {/* Indoor Potted Plants */}
      <PottedPlant position={[-10.0, 0, -6.5]} scale={1.3} onInteract={onInteractProp} />
      <PottedPlant position={[9.8, 0, -6.5]} scale={1.2} onInteract={onInteractProp} />
      <PottedPlant position={[-10.0, 0, 6.2]} scale={1.1} onInteract={onInteractProp} />
      <PottedPlant position={[-0.8, 3.6, -7.0]} scale={1.0} onInteract={onInteractProp} />

      {/* Pendant Lights over Floor 1 Engineering Desks */}
      <PendantLamp position={[-3.0, 4.8, 1.0]} onInteract={onInteractProp} />
      <PendantLamp position={[3.0, 4.8, 1.0]} onInteract={onInteractProp} />

      {/* Pendant Lights over Floor 2 Mezzanine Desks */}
      <PendantLamp position={[-6.0, 6.8, -3.2]} onInteract={onInteractProp} />

      {/* Active Scene Content (Desks, Avatars, etc.) */}
      {children}
    </Canvas>
  );
}

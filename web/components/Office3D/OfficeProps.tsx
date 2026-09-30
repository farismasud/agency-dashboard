"use client";

import { useState } from "react";
import * as THREE from "three";

export interface PropInteractHandler {
  onInteract?: (title: string, message: string, icon: string) => void;
}

// Potted indoor plant
export function PottedPlant({
  position,
  scale = 1,
  onInteract,
}: {
  position: [number, number, number];
  scale?: number;
} & PropInteractHandler) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={position}
      scale={hovered ? scale * 1.05 : scale}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onInteract?.("Tanaman Hias", "Tanaman indoor penghasil oksigen untuk menjaga suasana kantor tetap rileks.", "🌿");
      }}
    >
      {/* Ceramic Pot */}
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.26, 0.18, 0.6, 16]} />
        <meshStandardMaterial color={hovered ? "#e2e8f0" : "#f1f5f9"} roughness={0.2} />
      </mesh>
      {/* Soil */}
      <mesh position={[0, 0.58, 0]}>
        <cylinderGeometry args={[0.24, 0.24, 0.05, 12]} />
        <meshStandardMaterial color="#3e2723" roughness={0.9} />
      </mesh>
      {/* Foliage / Leaves */}
      <group position={[0, 0.7, 0]}>
        <mesh position={[0, 0.25, 0]} castShadow>
          <sphereGeometry args={[0.35, 12, 12]} />
          <meshStandardMaterial color={hovered ? "#16a34a" : "#15803d"} roughness={0.5} />
        </mesh>
        <mesh position={[0.18, 0.35, 0.12]} rotation={[0.4, 0.2, -0.3]} castShadow>
          <boxGeometry args={[0.22, 0.3, 0.02]} />
          <meshStandardMaterial color="#16a34a" roughness={0.4} />
        </mesh>
        <mesh position={[-0.15, 0.38, -0.1]} rotation={[-0.3, -0.4, 0.4]} castShadow>
          <boxGeometry args={[0.22, 0.32, 0.02]} />
          <meshStandardMaterial color="#22c55e" roughness={0.4} />
        </mesh>
        <mesh position={[-0.1, 0.42, 0.15]} rotation={[0.3, -0.2, 0.2]} castShadow>
          <boxGeometry args={[0.2, 0.28, 0.02]} />
          <meshStandardMaterial color="#15803d" roughness={0.4} />
        </mesh>
      </group>
    </group>
  );
}

// Whiteboard Kanban on wall
export function WallWhiteboard({
  position,
  rotation,
  onInteract,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
} & PropInteractHandler) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={position}
      rotation={rotation}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onInteract?.("Papan Kanban Sprint", "Roadmap & pembagian task tim: Migrasi Odoo 19, zero-diff GL, and automated pipeline.", "📋");
      }}
    >
      {/* Board Frame */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[3.2, 1.8, 0.06]} />
        <meshStandardMaterial
          color={hovered ? "#94a3b8" : "#64748b"}
          metalness={0.8}
          roughness={0.2}
          emissive={hovered ? "#38bdf8" : "#000000"}
          emissiveIntensity={hovered ? 0.3 : 0}
        />
      </mesh>
      {/* White Surface */}
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[3.08, 1.68]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} />
      </mesh>
      {/* Sticky Notes (Colorful Scrum Notes) */}
      <mesh position={[-1.0, 0.4, 0.045]}>
        <planeGeometry args={[0.22, 0.22]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
      <mesh position={[-0.7, 0.4, 0.045]}>
        <planeGeometry args={[0.22, 0.22]} />
        <meshStandardMaterial color="#38bdf8" />
      </mesh>
      <mesh position={[-1.0, 0.1, 0.045]}>
        <planeGeometry args={[0.22, 0.22]} />
        <meshStandardMaterial color="#f472b6" />
      </mesh>
      <mesh position={[-0.1, 0.35, 0.045]}>
        <planeGeometry args={[0.22, 0.22]} />
        <meshStandardMaterial color="#4ade80" />
      </mesh>
      <mesh position={[0.2, 0.15, 0.045]}>
        <planeGeometry args={[0.22, 0.22]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
      <mesh position={[0.8, 0.3, 0.045]}>
        <planeGeometry args={[0.22, 0.22]} />
        <meshStandardMaterial color="#a78bfa" />
      </mesh>
      {/* Pen Tray */}
      <mesh position={[0, -0.88, 0.06]} castShadow>
        <boxGeometry args={[1.5, 0.04, 0.12]} />
        <meshStandardMaterial color="#334155" metalness={0.7} />
      </mesh>
    </group>
  );
}

// Modern Wall Bookshelf
export function WallBookshelf({
  position,
  onInteract,
}: {
  position: [number, number, number];
} & PropInteractHandler) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onInteract?.("Rak Buku Arsitektur", "Referensi Odoo 11 legacy apps, standard manual akuntansi, & kamus data.", "📚");
      }}
    >
      {/* Shelves */}
      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 0.04, 0.3]} />
        <meshStandardMaterial color="#451a03" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.8, 0.04, 0.3]} />
        <meshStandardMaterial color="#451a03" roughness={0.5} />
      </mesh>
      {/* Side Brackets */}
      <mesh position={[-1.38, 0.3, 0]} castShadow>
        <boxGeometry args={[0.04, 0.64, 0.28]} />
        <meshStandardMaterial color={hovered ? "#38bdf8" : "#09090b"} metalness={0.8} />
      </mesh>
      <mesh position={[1.38, 0.3, 0]} castShadow>
        <boxGeometry args={[0.04, 0.64, 0.28]} />
        <meshStandardMaterial color={hovered ? "#38bdf8" : "#09090b"} metalness={0.8} />
      </mesh>

      {/* Row of Books Bottom Shelf */}
      <group position={[-0.8, 0.18, 0]}>
        <mesh position={[-0.2, 0, 0]} castShadow>
          <boxGeometry args={[0.06, 0.32, 0.22]} />
          <meshStandardMaterial color="#38bdf8" />
        </mesh>
        <mesh position={[-0.12, 0, 0]} castShadow>
          <boxGeometry args={[0.07, 0.34, 0.22]} />
          <meshStandardMaterial color="#ef4444" />
        </mesh>
        <mesh position={[-0.04, 0, 0]} castShadow>
          <boxGeometry args={[0.05, 0.3, 0.22]} />
          <meshStandardMaterial color="#eab308" />
        </mesh>
        <mesh position={[0.05, 0, 0]} castShadow>
          <boxGeometry args={[0.08, 0.35, 0.22]} />
          <meshStandardMaterial color="#10b981" />
        </mesh>
      </group>

      {/* Mini Succulent on Top Shelf */}
      <group position={[0.6, 0.72, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.08, 0.06, 0.15, 12]} />
          <meshStandardMaterial color="#ffffff" roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.12, 0]} castShadow>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshStandardMaterial color="#22c55e" roughness={0.6} />
        </mesh>
      </group>
    </group>
  );
}

// Break Lounge Area (Sofa, Coffee Table, Water Dispenser)
export function BreakLoungeArea({
  position,
  onInteract,
}: {
  position: [number, number, number];
} & PropInteractHandler) {
  const [sofaHovered, setSofaHovered] = useState(false);
  const [waterHovered, setWaterHovered] = useState(false);
  const [tableHovered, setTableHovered] = useState(false);

  return (
    <group position={position}>
      {/* Cozy Modern Sofa */}
      <group
        position={[-0.6, 0, 0]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setSofaHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setSofaHovered(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onInteract?.("Sofa Lounge Santai", "Tempat tim beristirahat, ngobrol santai, dan mencari ide segar.", "🛋️");
        }}
      >
        {/* Seat Cushion */}
        <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.5, 0.22, 0.7]} />
          <meshStandardMaterial color={sofaHovered ? "#475569" : "#334155"} roughness={0.8} />
        </mesh>
        {/* Backrest */}
        <mesh position={[0, 0.6, -0.3]} castShadow>
          <boxGeometry args={[1.5, 0.5, 0.18]} />
          <meshStandardMaterial color={sofaHovered ? "#334155" : "#1e293b"} roughness={0.8} />
        </mesh>
        {/* Left Armrest */}
        <mesh position={[-0.8, 0.45, 0]} castShadow>
          <boxGeometry args={[0.18, 0.4, 0.72]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        {/* Right Armrest */}
        <mesh position={[0.8, 0.45, 0]} castShadow>
          <boxGeometry args={[0.18, 0.4, 0.72]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        {/* Sofa Throw Pillow */}
        <mesh position={[-0.55, 0.42, -0.18]} rotation={[0.2, 0.2, 0]} castShadow>
          <boxGeometry args={[0.28, 0.28, 0.1]} />
          <meshStandardMaterial color="#f59e0b" roughness={0.9} />
        </mesh>
      </group>

      {/* Coffee Table */}
      <group
        position={[-0.6, 0, 0.85]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setTableHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setTableHovered(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onInteract?.("Meja Kopi", "Secangkir kopi espresso hangat untuk menyegarkan pikiran developer.", "☕");
        }}
      >
        <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.42, 0.42, 0.04, 24]} />
          <meshStandardMaterial color={tableHovered ? "#92400e" : "#78350f"} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.1, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.2, 8]} />
          <meshStandardMaterial color="#18181b" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
          <cylinderGeometry args={[0.2, 0.22, 0.02, 16]} />
          <meshStandardMaterial color="#18181b" metalness={0.8} />
        </mesh>
        {/* Coffee Mug on Table */}
        <mesh position={[0.1, 0.28, 0]} castShadow>
          <cylinderGeometry args={[0.04, 0.035, 0.08, 12]} />
          <meshStandardMaterial color="#38bdf8" />
        </mesh>
      </group>

      {/* Water Dispenser */}
      <group
        position={[1.2, 0, -0.1]}
        onPointerOver={(e) => {
          e.stopPropagation();
          setWaterHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setWaterHovered(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onInteract?.("Galon Air Sejuk", "Gluk... gluk... Segar! Tubuh terhidrasi optimal agar tetap fokus memecahkan bug!", "💧");
        }}
      >
        {/* Dispenser Body */}
        <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.38, 1.0, 0.38]} />
          <meshStandardMaterial color={waterHovered ? "#e0f2fe" : "#f8fafc"} roughness={0.3} />
        </mesh>
        {/* Faucet Cavity */}
        <mesh position={[0, 0.65, 0.18]}>
          <boxGeometry args={[0.26, 0.22, 0.06]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        {/* Faucet Knobs (Red Hot & Blue Cold) */}
        <mesh position={[-0.05, 0.68, 0.22]}>
          <boxGeometry args={[0.03, 0.03, 0.04]} />
          <meshBasicMaterial color="#ef4444" />
        </mesh>
        <mesh position={[0.05, 0.68, 0.22]}>
          <boxGeometry args={[0.03, 0.03, 0.04]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
        {/* Water Bottle (Blue Transparent with water glow) */}
        <mesh position={[0, 1.25, 0]} castShadow>
          <cylinderGeometry args={[0.16, 0.16, 0.45, 16]} />
          <meshStandardMaterial
            color="#38bdf8"
            transparent
            opacity={0.75}
            roughness={0.1}
            emissive={waterHovered ? "#38bdf8" : "#0284c7"}
            emissiveIntensity={waterHovered ? 0.6 : 0.2}
          />
        </mesh>
      </group>
    </group>
  );
}

// Hanging Studio Pendant Light with Realistic Downlight Beam
export function PendantLamp({
  position,
  onInteract,
}: {
  position: [number, number, number];
} & PropInteractHandler) {
  const [lit, setLit] = useState(true);
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        setLit((prev) => !prev);
        onInteract?.(
          "Lampu Meja Studio",
          lit ? "Lampu dimatikan." : "Lampu dinyalakan kembali, suasana kerja hangat.",
          "💡"
        );
      }}
    >
      {/* Wire */}
      <mesh position={[0, 0.6, 0]}>
        <cylinderGeometry args={[0.008, 0.008, 1.2, 6]} />
        <meshStandardMaterial color="#09090b" />
      </mesh>
      {/* Dome Shade */}
      <mesh position={[0, 0, 0]} castShadow>
        <coneGeometry args={[0.34, 0.26, 24]} />
        <meshStandardMaterial
          color={hovered ? "#3f3f46" : "#18181b"}
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>
      {/* Warm Glowing Bulb */}
      <mesh position={[0, -0.05, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshStandardMaterial
          color={lit ? "#fef08a" : "#4b5563"}
          emissive={lit ? "#facc15" : "#000000"}
          emissiveIntensity={lit ? 3.0 : 0}
        />
      </mesh>
      {/* Real Downward Spotlight */}
      {lit && (
        <spotLight
          position={[0, -0.08, 0]}
          intensity={2.8}
          distance={10.0}
          angle={0.8}
          penumbra={0.9}
          color="#fef3c7"
          castShadow
          shadow-bias={-0.0001}
        />
      )}
    </group>
  );
}

// Architectural Floating Open-Riser Staircase from Floor 1 to Floor 2
export function ArchitecturalStaircase({
  position,
  onInteract,
}: {
  position: [number, number, number];
} & PropInteractHandler) {
  const [hovered, setHovered] = useState(false);
  const steps = 14;
  const totalHeight = 3.6;
  const totalDepth = 4.2;

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onInteract?.(
          "Tangga Arsitektural",
          "Akses lantai 1 (Engineering & Ops) ke lantai 2 (Mezzanine Strategy & Architecture).",
          "🪜"
        );
      }}
    >
      {/* Floating Walnut Treads */}
      {Array.from({ length: steps }).map((_, i) => {
        const stepY = (i / steps) * totalHeight;
        const stepZ = -(i / steps) * totalDepth;
        return (
          <mesh key={i} position={[0, stepY + 0.12, stepZ]} castShadow receiveShadow>
            <boxGeometry args={[1.35, 0.06, 0.34]} />
            <meshStandardMaterial
              color={hovered ? "#92400e" : "#5a3418"}
              roughness={0.4}
              metalness={0.1}
            />
          </mesh>
        );
      })}

      {/* Central Black Steel Spine / Stringer */}
      <mesh
        position={[0, totalHeight / 2, -totalDepth / 2]}
        rotation={[Math.atan2(totalHeight, totalDepth), 0, 0]}
        castShadow
      >
        <boxGeometry args={[0.2, 0.15, Math.hypot(totalHeight, totalDepth)]} />
        <meshStandardMaterial color="#0f172a" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Glass Balustrade & Steel Handrail */}
      <mesh
        position={[0.68, totalHeight / 2 + 0.5, -totalDepth / 2]}
        rotation={[Math.atan2(totalHeight, totalDepth), 0, 0]}
      >
        <planeGeometry args={[0.02, Math.hypot(totalHeight, totalDepth)]} />
        <meshStandardMaterial color="#38bdf8" transparent opacity={0.25} roughness={0.1} />
      </mesh>
      {/* Handrail */}
      <mesh
        position={[0.68, totalHeight / 2 + 0.95, -totalDepth / 2]}
        rotation={[Math.atan2(totalHeight, totalDepth), 0, 0]}
        castShadow
      >
        <cylinderGeometry args={[0.025, 0.025, Math.hypot(totalHeight, totalDepth), 12]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

// Mezzanine Glass Balustrade / Railing (Safe glass edge overlooking ground floor)
export function MezzanineGlassRailing({
  onInteract,
}: PropInteractHandler) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onInteract?.(
          "Balkon Kaca Mezzanine",
          "Pemandangan lantai 1 langsung dari lantai 2 untuk memantau aktivitas tim engineering.",
          "🏢"
        );
      }}
    >
      {/* Front Edge Railing (from x = -8.5 to x = 0 at z = 1.0, leaving x = -11.0 to -8.5 open for staircase entry) */}
      <group position={[-4.25, 3.6, 1.0]}>
        {/* Tempered Glass Panel */}
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[8.5, 0.9, 0.03]} />
          <meshStandardMaterial
            color={hovered ? "#38bdf8" : "#94a3b8"}
            transparent
            opacity={0.25}
            roughness={0.05}
            metalness={0.2}
          />
        </mesh>
        {/* Stainless Steel Handrail Cap */}
        <mesh position={[0, 0.92, 0]} castShadow>
          <boxGeometry args={[8.5, 0.05, 0.06]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Vertical Steel Posts */}
        {[-4.1, -2.1, -0.1, 1.9, 3.9].map((px, i) => (
          <mesh key={i} position={[px, 0.45, 0]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.9, 12]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Stairwell Side Guardrail (from z = 1.0 to z = -0.6 along x = -8.5) */}
      <group position={[-8.5, 3.6, 0.2]}>
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.03, 0.9, 1.6]} />
          <meshStandardMaterial
            color={hovered ? "#38bdf8" : "#94a3b8"}
            transparent
            opacity={0.25}
            roughness={0.05}
            metalness={0.2}
          />
        </mesh>
        <mesh position={[0, 0.92, 0]} castShadow>
          <boxGeometry args={[0.06, 0.05, 1.6]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
        </mesh>
        {[-0.7, 0.0, 0.7].map((pz, i) => (
          <mesh key={i} position={[0, 0.45, pz]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.9, 12]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} />
          </mesh>
        ))}
      </group>

      {/* Side Edge Railing (from z = 1.0 to z = -7.5 at x = 0, y = 3.6) */}
      <group position={[0, 3.6, -3.25]}>
        {/* Tempered Glass Panel */}
        <mesh position={[0, 0.45, 0]}>
          <boxGeometry args={[0.03, 0.9, 8.5]} />
          <meshStandardMaterial
            color={hovered ? "#38bdf8" : "#94a3b8"}
            transparent
            opacity={0.25}
            roughness={0.05}
            metalness={0.2}
          />
        </mesh>
        {/* Stainless Steel Handrail Cap */}
        <mesh position={[0, 0.92, 0]} castShadow>
          <boxGeometry args={[0.06, 0.05, 8.5]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Vertical Steel Posts */}
        {[-3.8, -1.8, 0.2, 2.2, 4.0].map((pz, i) => (
          <mesh key={i} position={[0, 0.45, pz]} castShadow>
            <cylinderGeometry args={[0.02, 0.02, 0.9, 12]} />
            <meshStandardMaterial color="#0f172a" metalness={0.8} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

// Conference & Sprint Review Meeting Table
export function ConferenceMeetingTable({
  position,
  onInteract,
}: {
  position: [number, number, number];
} & PropInteractHandler) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onInteract?.(
          "Meja Rapat Tim",
          "Tempat seluruh tim berkumpul untuk sprint review, retrospektif, dan demo rilis.",
          "📊"
        );
      }}
    >
      {/* Large Table Top (Solid Walnut Wood with Chamfered Edges) */}
      <mesh position={[0, 0.72, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.4, 0.06, 1.4]} />
        <meshStandardMaterial
          color={hovered ? "#854d0e" : "#5a3418"}
          roughness={0.3}
          metalness={0.1}
        />
      </mesh>
      {/* Modern Angled Metal Table Base */}
      <mesh position={[-1.1, 0.35, 0]} castShadow>
        <boxGeometry args={[0.08, 0.7, 1.0]} />
        <meshStandardMaterial color="#09090b" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[1.1, 0.35, 0]} castShadow>
        <boxGeometry args={[0.08, 0.7, 1.0]} />
        <meshStandardMaterial color="#09090b" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* Center Cable Pass-through / Wireless Charger */}
      <mesh position={[0, 0.752, 0]}>
        <boxGeometry args={[0.8, 0.005, 0.15]} />
        <meshStandardMaterial color="#1e293b" metalness={0.7} />
      </mesh>

      {/* Open Presentation Laptop on Table */}
      <group position={[0, 0.755, 0]}>
        <mesh castShadow>
          <boxGeometry args={[0.32, 0.015, 0.22]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.11, -0.1]} rotation={[-0.25, 0, 0]} castShadow>
          <boxGeometry args={[0.32, 0.2, 0.012]} />
          <meshStandardMaterial color="#0f172a" />
        </mesh>
        <mesh position={[0, 0.11, -0.092]} rotation={[-0.25, 0, 0]}>
          <planeGeometry args={[0.29, 0.17]} />
          <meshBasicMaterial color="#38bdf8" />
        </mesh>
      </group>

      {/* Conference Chairs Around Table */}
      {[-1.0, 0, 1.0].map((cx, i) => (
        <group key={`front-${i}`} position={[cx, 0, 0.85]}>
          <mesh position={[0, 0.42, 0]} castShadow>
            <boxGeometry args={[0.42, 0.06, 0.4]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.7, 0.18]} castShadow>
            <boxGeometry args={[0.38, 0.45, 0.04]} />
            <meshStandardMaterial color="#334155" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} />
          </mesh>
        </group>
      ))}
      {[-1.0, 0, 1.0].map((cx, i) => (
        <group key={`back-${i}`} position={[cx, 0, -0.85]} rotation={[0, Math.PI, 0]}>
          <mesh position={[0, 0.42, 0]} castShadow>
            <boxGeometry args={[0.42, 0.06, 0.4]} />
            <meshStandardMaterial color="#1e293b" roughness={0.7} />
          </mesh>
          <mesh position={[0, 0.7, 0.18]} castShadow>
            <boxGeometry args={[0.38, 0.45, 0.04]} />
            <meshStandardMaterial color="#334155" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.2, 0]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, 0.4, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

// HQ Main Entrance & Freelancer Door (Right Wall)
export function EntranceDoor({
  position,
  onInteract,
}: {
  position: [number, number, number];
} & PropInteractHandler) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={position}
      rotation={[0, -Math.PI / 2, 0]}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onInteract?.(
          "Pintu Masuk Utama",
          "Pintu akses utama kantor agensi tempat freelancer dan tamu masuk ke ruangan.",
          "🚪"
        );
      }}
    >
      {/* Outer Door Frame */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[2.4, 3.2, 0.15]} />
        <meshStandardMaterial color="#09090b" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Double Glass Doors */}
      <mesh position={[-0.55, 0, 0.02]}>
        <planeGeometry args={[1.05, 3.0]} />
        <meshStandardMaterial
          color={hovered ? "#38bdf8" : "#bae6fd"}
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>
      <mesh position={[0.55, 0, 0.02]}>
        <planeGeometry args={[1.05, 3.0]} />
        <meshStandardMaterial
          color={hovered ? "#38bdf8" : "#bae6fd"}
          transparent
          opacity={0.3}
          roughness={0.1}
          metalness={0.2}
        />
      </mesh>

      {/* Stainless Steel Vertical Door Handles */}
      <mesh position={[-0.08, 0, 0.08]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.8, 12]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.08, 0, 0.08]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.8, 12]} />
        <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Illuminated Header Sign */}
      <mesh position={[0, 1.75, 0.1]}>
        <boxGeometry args={[1.8, 0.35, 0.08]} />
        <meshStandardMaterial
          color="#064e3b"
          emissive="#22c55e"
          emissiveIntensity={hovered ? 0.9 : 0.5}
        />
      </mesh>
    </group>
  );
}

// Studio Espresso Machine Bar with Coffee Grinder & Steam Cups
export function CoffeeEspressoBar({
  position,
  onInteract,
}: {
  position: [number, number, number];
} & PropInteractHandler) {
  const [hovered, setHovered] = useState(false);

  return (
    <group
      position={position}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
      onClick={(e) => {
        e.stopPropagation();
        onInteract?.(
          "Bar Kopi Espresso",
          "Freshly brewed double shot espresso untuk menjaga performa ngoding tetap maksimal!",
          "☕"
        );
      }}
    >
      {/* Bar Counter Table */}
      <mesh position={[0, 0.45, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.2, 0.9, 0.6]} />
        <meshStandardMaterial color={hovered ? "#3f3f46" : "#27272a"} roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.91, 0]} receiveShadow>
        <boxGeometry args={[1.24, 0.04, 0.64]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.2} />
      </mesh>

      {/* Chrome Espresso Machine */}
      <group position={[-0.25, 0.93, 0]}>
        <mesh position={[0, 0.2, 0]} castShadow>
          <boxGeometry args={[0.42, 0.4, 0.32]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
        </mesh>
        {/* Portafilter Spout */}
        <mesh position={[0, 0.12, 0.18]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.08, 12]} />
          <meshStandardMaterial color="#09090b" metalness={0.8} />
        </mesh>
        {/* Steam Wand */}
        <mesh position={[0.18, 0.15, 0.16]} rotation={[0.3, 0, -0.3]} castShadow>
          <cylinderGeometry args={[0.008, 0.008, 0.18, 8]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} />
        </mesh>
        {/* Pressure Gauge */}
        <mesh position={[-0.12, 0.28, 0.165]}>
          <circleGeometry args={[0.035, 16]} />
          <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* Coffee Cups */}
      <mesh position={[0.25, 0.98, 0.08]} castShadow>
        <cylinderGeometry args={[0.045, 0.035, 0.09, 12]} />
        <meshStandardMaterial color="#facc15" />
      </mesh>
      <mesh position={[0.38, 0.98, -0.06]} castShadow>
        <cylinderGeometry args={[0.045, 0.035, 0.09, 12]} />
        <meshStandardMaterial color="#38bdf8" />
      </mesh>
    </group>
  );
}

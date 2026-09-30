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
        <>
          <spotLight
            position={[0, -0.08, 0]}
            intensity={4.8}
            distance={8.0}
            angle={0.65}
            penumbra={0.7}
            color="#fef3c7"
            castShadow
            shadow-bias={-0.0001}
          />
          {/* Volumetric Warm Light Beam Cone */}
          <mesh position={[0, -1.4, 0]}>
            <cylinderGeometry args={[0.15, 1.4, 2.6, 24, 1, true]} />
            <meshBasicMaterial
              color="#fef08a"
              transparent
              opacity={0.065}
              depthWrite={false}
            />
          </mesh>
        </>
      )}
    </group>
  );
}

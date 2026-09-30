"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { AgentState } from "@/lib/types";
import { ROLE_RING_COLOR } from "./layout";
import { getScreenTexture } from "./ScreenTextures";

type Vec3 = [number, number, number];
export type InteractFn = (title: string, message: string, icon: string) => void;

// Hover-grow + click wrapper shared by every clickable prop.
export function Interactive({
  children,
  position,
  rotation,
  info,
  onInteract,
  onActivate,
}: {
  children: ReactNode;
  position?: Vec3;
  rotation?: Vec3;
  info?: [title: string, message: string, icon: string];
  onInteract?: InteractFn;
  onActivate?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered]);

  return (
    <group
      position={position}
      rotation={rotation}
      scale={hovered ? 1.03 : 1}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onActivate?.();
        if (info) onInteract?.(...info);
      }}
    >
      {children}
    </group>
  );
}

// ---------- Seating ----------

// Occupants sit at local origin facing +z; backrest is at -z.
export function Sofa({
  position,
  rotation,
  width = 2.6,
  color = "#64748b",
  cushion = "#94a3b8",
  onInteract,
}: {
  position: Vec3;
  rotation?: Vec3;
  width?: number;
  color?: string;
  cushion?: string;
  onInteract?: InteractFn;
}) {
  const seats = Math.max(2, Math.round(width / 0.85));
  const seatW = (width - 0.1) / seats;
  return (
    <Interactive position={position} rotation={rotation} onInteract={onInteract} info={["Sofa Empuk", "Tempat favorit tim buat rebahan sambil nonton & ngobrol.", "🛋️"]}>
      <RoundedBox args={[width + 0.4, 0.28, 0.9]} radius={0.06} position={[0, 0.2, -0.05]} castShadow receiveShadow>
        <meshStandardMaterial color={color} roughness={0.9} />
      </RoundedBox>
      {Array.from({ length: seats }).map((_, i) => (
        <RoundedBox key={i} args={[seatW - 0.04, 0.14, 0.72]} radius={0.05} position={[-width / 2 + seatW * (i + 0.5) + 0.05, 0.38, 0.02]} castShadow receiveShadow>
          <meshStandardMaterial color={cushion} roughness={0.95} />
        </RoundedBox>
      ))}
      <RoundedBox args={[width + 0.4, 0.6, 0.22]} radius={0.08} position={[0, 0.62, -0.42]} castShadow>
        <meshStandardMaterial color={color} roughness={0.9} />
      </RoundedBox>
      {[-1, 1].map((s) => (
        <RoundedBox key={s} args={[0.2, 0.34, 0.9]} radius={0.06} position={[s * (width / 2 + 0.1), 0.46, -0.05]} castShadow>
          <meshStandardMaterial color={color} roughness={0.9} />
        </RoundedBox>
      ))}
      <RoundedBox args={[0.34, 0.3, 0.1]} radius={0.04} position={[-width / 2 + 0.25, 0.6, -0.26]} rotation={[-0.2, 0.25, 0.1]}>
        <meshStandardMaterial color="#f59e0b" roughness={1} />
      </RoundedBox>
      <RoundedBox args={[0.34, 0.3, 0.1]} radius={0.04} position={[width / 2 - 0.25, 0.6, -0.26]} rotation={[-0.2, -0.25, -0.1]}>
        <meshStandardMaterial color="#f8fafc" roughness={1} />
      </RoundedBox>
    </Interactive>
  );
}

export function BeanBag({ position, color, onInteract }: { position: Vec3; color: string; onInteract?: InteractFn }) {
  return (
    <Interactive position={position} onInteract={onInteract} info={["Beanbag", "Tenggelam nyaman di beanbag, mode santai total.", "🫘"]}>
      <mesh position={[0, 0.24, 0]} scale={[1, 0.55, 1]} castShadow receiveShadow>
        <sphereGeometry args={[0.48, 24, 16]} />
        <meshStandardMaterial color={color} roughness={0.95} />
      </mesh>
    </Interactive>
  );
}

export function CoffeeTable({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <RoundedBox args={[1.3, 0.07, 0.7]} radius={0.03} position={[0, 0.4, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#d6b48c" roughness={0.5} />
      </RoundedBox>
      {[[-0.55, -0.27], [0.55, -0.27], [-0.55, 0.27], [0.55, 0.27]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.18, z]} castShadow>
          <cylinderGeometry args={[0.025, 0.02, 0.36, 8]} />
          <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}
      {/* Snacks + remote */}
      <mesh position={[-0.3, 0.47, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.09, 0.08, 16]} />
        <meshStandardMaterial color="#ef4444" roughness={0.6} />
      </mesh>
      <mesh position={[0.25, 0.445, 0.1]} castShadow>
        <boxGeometry args={[0.2, 0.02, 0.06]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
    </group>
  );
}

export function Rug({ position, size, color, border }: { position: Vec3; size: [number, number]; color: string; border: string }) {
  return (
    <group position={position} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh receiveShadow>
        <planeGeometry args={size} />
        <meshStandardMaterial color={border} roughness={1} />
      </mesh>
      <mesh position={[0, 0, 0.002]} receiveShadow>
        <planeGeometry args={[size[0] - 0.3, size[1] - 0.3]} />
        <meshStandardMaterial color={color} roughness={1} />
      </mesh>
    </group>
  );
}

// ---------- Lounge TV ----------

const TV_CHANNELS = [
  { name: "Liga Kantor", icon: "⚽", glow: "#22c55e" },
  { name: "Agency News", icon: "📰", glow: "#3b82f6" },
  { name: "Lo-fi Radio", icon: "🎵", glow: "#c084fc" },
  { name: "Live Tim", icon: "📊", glow: "#22d3ee" },
] as const;

const TV_W = 640;
const TV_H = 360;

function drawFootball(ctx: CanvasRenderingContext2D, t: number) {
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 ? "#2f8f3a" : "#2a8234";
    ctx.fillRect((i * TV_W) / 10, 0, TV_W / 10 + 1, TV_H);
  }
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.lineWidth = 3;
  ctx.strokeRect(30, 30, TV_W - 60, TV_H - 60);
  ctx.beginPath();
  ctx.moveTo(TV_W / 2, 30);
  ctx.lineTo(TV_W / 2, TV_H - 30);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(TV_W / 2, TV_H / 2, 48, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeRect(30, TV_H / 2 - 70, 70, 140);
  ctx.strokeRect(TV_W - 100, TV_H / 2 - 70, 70, 140);

  const bx = TV_W / 2 + Math.sin(t * 0.9) * (TV_W / 2 - 90);
  const by = TV_H / 2 + Math.sin(t * 1.7) * (TV_H / 2 - 70);
  const teams: [string, number][] = [["#ef4444", -1], ["#3b82f6", 1]];
  for (const [color, side] of teams) {
    for (let p = 0; p < 5; p++) {
      const homeX = TV_W / 2 + side * (60 + (p % 3) * 70);
      const homeY = 70 + p * 55;
      const px = homeX + (bx - homeX) * 0.35 + Math.sin(t * 2 + p) * 8;
      const py = homeY + (by - homeY) * 0.35 + Math.cos(t * 1.6 + p) * 8;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
  ctx.fillStyle = "#fff";
  ctx.beginPath();
  ctx.arc(bx, by, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(15,23,42,0.85)";
  ctx.beginPath();
  ctx.roundRect(40, 40, 250, 36, 8);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 18px sans-serif";
  ctx.fillText(`INFRA 2 - 1 LEGACY   ${Math.floor((t * 3) % 90) + 1}'`, 54, 65);
  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.roundRect(TV_W - 110, 40, 70, 30, 6);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = "bold 16px sans-serif";
  ctx.fillText("● LIVE", TV_W - 102, 61);
}

const HEADLINES = [
  "Migrasi Odoo 19: 5 trade account capai zero-diff",
  "Balance Guard stabil di baseline 11",
  "Tim DevOps: uptime cluster 42 hari tanpa insiden",
  "Rooftop terrace resmi dibuka untuk istirahat tim",
  "Sprint 42 selesai lebih cepat dari jadwal",
];

function drawNews(ctx: CanvasRenderingContext2D, t: number) {
  const g = ctx.createLinearGradient(0, 0, TV_W, TV_H);
  g.addColorStop(0, "#0b1a3a");
  g.addColorStop(1, "#1e3a8a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TV_W, TV_H);
  ctx.fillStyle = "#dc2626";
  ctx.fillRect(0, 24, 250, 40);
  ctx.fillStyle = "#fff";
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("BREAKING • AGENCY NEWS", 14, 51);
  ctx.font = "bold 16px monospace";
  ctx.fillText(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }), TV_W - 80, 50);

  const headline = HEADLINES[Math.floor(t / 5) % HEADLINES.length];
  ctx.font = "bold 30px sans-serif";
  const words = headline.split(" ");
  let line = "";
  let y = 130;
  for (const w of words) {
    if (ctx.measureText(line + w).width > TV_W - 80) {
      ctx.fillText(line, 30, y);
      line = "";
      y += 40;
    }
    line += w + " ";
  }
  ctx.fillText(line, 30, y);

  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 4;
  ctx.beginPath();
  for (let i = 0; i <= 40; i++) {
    const x = 30 + i * 14;
    const yy = 270 - i * 1.5 - Math.sin(i * 0.6 + t * 2) * 12;
    if (i === 0) ctx.moveTo(x, yy);
    else ctx.lineTo(x, yy);
  }
  ctx.stroke();

  ctx.fillStyle = "#facc15";
  ctx.fillRect(0, TV_H - 44, TV_W, 44);
  ctx.fillStyle = "#111827";
  ctx.font = "bold 18px sans-serif";
  const ticker = HEADLINES.join("   •   ");
  const tickerW = ctx.measureText(ticker).width + 60;
  const offset = (t * 90) % tickerW;
  ctx.fillText(ticker, TV_W - offset, TV_H - 16);
  ctx.fillText(ticker, TV_W - offset + tickerW, TV_H - 16);
}

function drawLofi(ctx: CanvasRenderingContext2D, t: number) {
  const g = ctx.createLinearGradient(0, 0, 0, TV_H);
  g.addColorStop(0, "#312e81");
  g.addColorStop(0.6, "#9d174d");
  g.addColorStop(1, "#f97316");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, TV_W, TV_H);
  ctx.fillStyle = "#fde68a";
  ctx.beginPath();
  ctx.arc(480, 90, 42, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#1e1b4b";
  for (let i = 0; i < 12; i++) {
    const h = 60 + ((i * 37) % 90);
    ctx.fillRect(i * 56, TV_H - 60 - h, 50, h);
  }
  for (let i = 0; i < 48; i++) {
    const h = 10 + Math.abs(Math.sin(t * 3 + i * 0.5) * Math.cos(t * 1.3 + i * 0.2)) * 50;
    ctx.fillStyle = `hsl(${280 + i * 2}, 90%, 70%)`;
    ctx.fillRect(20 + i * 12.5, TV_H - 20 - h, 8, h);
  }
  ctx.fillStyle = "#fff";
  ctx.font = "bold 26px sans-serif";
  ctx.fillText("lofi beats to migrate & chill to", 30, 60);
  ctx.font = "16px sans-serif";
  ctx.fillText("♪ Agency Radio • 24/7", 30, 88);
}

function drawTeam(ctx: CanvasRenderingContext2D, agents: AgentState[], t: number) {
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, TV_W, TV_H);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "bold 22px sans-serif";
  ctx.fillText("LIVE TEAM STATUS", 24, 40);
  const working = agents.filter((a) => a.status === "working").length;
  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 16px monospace";
  ctx.fillText(`${working}/${agents.length} working`, TV_W - 170, 40);
  agents.slice(0, 8).forEach((a, i) => {
    const x = 24 + (i % 2) * 304;
    const y = 60 + Math.floor(i / 2) * 72;
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.roundRect(x, y, 290, 62, 8);
    ctx.fill();
    ctx.fillStyle = ROLE_RING_COLOR[a.subagent_type] ?? "#64748b";
    ctx.beginPath();
    ctx.arc(x + 22, y + 22, 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 16px sans-serif";
    ctx.fillText(a.display_name || a.subagent_type, x + 40, y + 28);
    const on = a.status === "working";
    ctx.fillStyle = on ? (Math.sin(t * 4) > 0 ? "#22c55e" : "#16a34a") : "#f59e0b";
    ctx.font = "bold 12px monospace";
    ctx.fillText(on ? "● WORKING" : "● IDLE", x + 200, y + 26);
    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px sans-serif";
    const action = a.last_action.length > 40 ? a.last_action.slice(0, 39) + "…" : a.last_action;
    ctx.fillText(action, x + 14, y + 50);
  });
}

export function LoungeTV({
  position,
  agents,
  onInteract,
}: {
  position: Vec3;
  agents: Record<string, AgentState>;
  onInteract?: InteractFn;
}) {
  const [channel, setChannel] = useState(0);
  const lightRef = useRef<THREE.PointLight>(null);
  const agentsRef = useRef(agents);
  useEffect(() => {
    agentsRef.current = agents;
  }, [agents]);

  const { canvas, texture } = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = TV_W;
    c.height = TV_H;
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return { canvas: c, texture: tex };
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  const lastDraw = useRef(0);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (lightRef.current) lightRef.current.intensity = 2.2 + Math.sin(t * 7) * 0.25 + Math.sin(t * 2.3) * 0.2;
    if (t - lastDraw.current < 1 / 20) return; // ponytail: 20fps redraw is plenty for a background TV
    lastDraw.current = t;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (channel === 0) drawFootball(ctx, t);
    else if (channel === 1) drawNews(ctx, t);
    else if (channel === 2) drawLofi(ctx, t);
    else drawTeam(ctx, Object.values(agentsRef.current), t);
    texture.needsUpdate = true;
  });

  const ch = TV_CHANNELS[channel];

  return (
    <group position={position}>
      {/* Console */}
      <RoundedBox args={[3.6, 0.45, 0.45]} radius={0.04} position={[0, 0.23, 0.3]} castShadow receiveShadow>
        <meshStandardMaterial color="#e5d3b3" roughness={0.6} />
      </RoundedBox>
      <mesh position={[0, 0.5, 0.35]} castShadow>
        <boxGeometry args={[1.2, 0.08, 0.12]} />
        <meshStandardMaterial color="#111827" roughness={0.4} />
      </mesh>
      {/* Ambilight glow on wall */}
      <mesh position={[0, 1.75, 0.02]}>
        <planeGeometry args={[3.9, 2.4]} />
        <meshBasicMaterial color={ch.glow} transparent opacity={0.28} toneMapped={false} />
      </mesh>
      <Interactive
        position={[0, 1.75, 0.08]}
        onActivate={() => setChannel((c) => (c + 1) % TV_CHANNELS.length)}
        onInteract={onInteract}
        info={[`TV Lounge — ${TV_CHANNELS[(channel + 1) % TV_CHANNELS.length].name}`, "Klik TV lagi untuk ganti channel.", TV_CHANNELS[(channel + 1) % TV_CHANNELS.length].icon]}
      >
        <RoundedBox args={[3.3, 1.9, 0.08]} radius={0.03} castShadow>
          <meshStandardMaterial color="#0a0a0a" roughness={0.3} metalness={0.4} />
        </RoundedBox>
        <mesh position={[0, 0, 0.045]}>
          <planeGeometry args={[3.18, 1.79]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
      </Interactive>
      <pointLight ref={lightRef} position={[0, 1.6, 1.6]} color={ch.glow} distance={7} decay={1.5} />
    </group>
  );
}

// ---------- Game corner ----------

export function ArcadeMachine({ position, rotation, onInteract }: { position: Vec3; rotation?: Vec3; onInteract?: InteractFn }) {
  const screenRef = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    screenRef.current?.color.setHSL((clock.elapsedTime * 0.15) % 1, 0.8, 0.55);
  });
  return (
    <Interactive position={position} rotation={rotation} onInteract={onInteract} info={["Mesin Arcade Retro", "High score: DEV 98.420 — siapa berani tantang?", "🕹️"]}>
      <RoundedBox args={[0.75, 1.75, 0.7]} radius={0.04} position={[0, 0.88, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#4c1d95" roughness={0.5} />
      </RoundedBox>
      <mesh position={[0, 1.3, 0.3]} rotation={[-0.25, 0, 0]}>
        <planeGeometry args={[0.55, 0.42]} />
        <meshBasicMaterial ref={screenRef} toneMapped={false} />
      </mesh>
      <mesh position={[0, 0.98, 0.42]} rotation={[-0.9, 0, 0]} castShadow>
        <boxGeometry args={[0.7, 0.3, 0.05]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      {[-0.15, 0.05, 0.18].map((x, i) => (
        <mesh key={i} position={[x, 1.05, 0.5]}>
          <sphereGeometry args={[0.035, 10, 8]} />
          <meshStandardMaterial color={["#ef4444", "#facc15", "#22c55e"][i]} emissive={["#ef4444", "#facc15", "#22c55e"][i]} emissiveIntensity={0.6} />
        </mesh>
      ))}
      <mesh position={[0, 1.72, 0.36]}>
        <boxGeometry args={[0.72, 0.18, 0.02]} />
        <meshBasicMaterial color="#f472b6" toneMapped={false} />
      </mesh>
    </Interactive>
  );
}

export function PingPongTable({ position, onInteract }: { position: Vec3; onInteract?: InteractFn }) {
  const ballRef = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 2.2;
    if (!ballRef.current) return;
    ballRef.current.position.set(Math.sin(t) * 1.15, 0.8 + Math.abs(Math.cos(t * 2)) * 0.28, Math.sin(t * 0.7) * 0.4);
  });
  return (
    <Interactive position={position} onInteract={onInteract} info={["Meja Ping Pong", "Ronde cepat 11 poin buat refresh otak di sela sprint.", "🏓"]}>
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow>
        <boxGeometry args={[2.74, 0.04, 1.525]} />
        <meshStandardMaterial color="#1d4ed8" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.762, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[2.74, 0.02]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.83, 0]}>
        <boxGeometry args={[0.02, 0.15, 1.65]} />
        <meshStandardMaterial color="#f8fafc" transparent opacity={0.7} />
      </mesh>
      {[[-1.2, -0.65], [1.2, -0.65], [-1.2, 0.65], [1.2, 0.65]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.36, z]} castShadow>
          <boxGeometry args={[0.05, 0.72, 0.05]} />
          <meshStandardMaterial color="#111827" />
        </mesh>
      ))}
      <mesh ref={ballRef}>
        <sphereGeometry args={[0.03, 10, 8]} />
        <meshBasicMaterial color="#fb923c" />
      </mesh>
    </Interactive>
  );
}

// ---------- Lobby / pantry ----------

function useLabelTexture(text: string, bg: string, fg: string) {
  const texture = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d");
    if (ctx) {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, 512, 128);
      ctx.fillStyle = fg;
      ctx.font = "bold 64px sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, 256, 68);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [text, bg, fg]);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

// Front of the desk faces local +z.
export function ReceptionDesk({ position, rotation, onInteract }: { position: Vec3; rotation?: Vec3; onInteract?: InteractFn }) {
  const logo = useLabelTexture("AGENCY HQ", "#0f172a", "#38bdf8");
  return (
    <Interactive position={position} rotation={rotation} onInteract={onInteract} info={["Resepsionis", "Selamat datang di Agency HQ! Silakan isi buku tamu dulu ya.", "🛎️"]}>
      <RoundedBox args={[2.4, 1.05, 0.7]} radius={0.05} position={[0, 0.525, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#f8fafc" roughness={0.4} />
      </RoundedBox>
      <mesh position={[0, 1.07, 0]} castShadow>
        <boxGeometry args={[2.5, 0.05, 0.8]} />
        <meshStandardMaterial color="#c89f72" roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.6, 0.355]}>
        <planeGeometry args={[1.6, 0.4]} />
        <meshBasicMaterial map={logo} toneMapped={false} />
      </mesh>
      <mesh position={[0.6, 1.3, -0.15]} castShadow>
        <boxGeometry args={[0.5, 0.32, 0.03]} />
        <meshStandardMaterial color="#111827" />
      </mesh>
      <mesh position={[-0.9, 1.2, 0]} castShadow>
        <sphereGeometry args={[0.13, 12, 10]} />
        <meshStandardMaterial color="#16a34a" roughness={0.8} />
      </mesh>
    </Interactive>
  );
}

// Tap faces local +z.
export function WaterCooler({ position, rotation, onInteract }: { position: Vec3; rotation?: Vec3; onInteract?: InteractFn }) {
  return (
    <Interactive position={position} rotation={rotation} onInteract={onInteract} info={["Dispenser Air", "Gluk... gluk... segar! Hidrasi dulu biar fokus.", "💧"]}>
      <RoundedBox args={[0.38, 1.0, 0.38]} radius={0.03} position={[0, 0.5, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#f8fafc" roughness={0.3} />
      </RoundedBox>
      <mesh position={[0, 0.68, 0.17]}>
        <boxGeometry args={[0.24, 0.2, 0.06]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>
      <mesh position={[0, 1.25, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.48, 20]} />
        <meshStandardMaterial color="#7dd3fc" transparent opacity={0.7} roughness={0.1} />
      </mesh>
    </Interactive>
  );
}

export function HighTable({ position }: { position: Vec3 }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.42, 0.42, 0.05, 28]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.52, 0]} castShadow>
        <cylinderGeometry args={[0.035, 0.035, 1.05, 10]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <cylinderGeometry args={[0.28, 0.3, 0.04, 20]} />
        <meshStandardMaterial color="#1f2937" metalness={0.6} />
      </mesh>
    </group>
  );
}

// Front faces local +z; LEDs blink.
export function ServerRack({ position, onInteract }: { position: Vec3; onInteract?: InteractFn }) {
  const green = useMemo(() => new THREE.MeshBasicMaterial({ color: "#22c55e", toneMapped: false }), []);
  const blue = useMemo(() => new THREE.MeshBasicMaterial({ color: "#38bdf8", toneMapped: false }), []);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    green.color.setRGB(0.1, 0.5 + 0.5 * Math.abs(Math.sin(t * 5)), 0.2);
    blue.color.setRGB(0.2, 0.6, 0.6 + 0.4 * Math.abs(Math.sin(t * 3 + 1)));
  });
  useEffect(() => () => {
    green.dispose();
    blue.dispose();
  }, [green, blue]);

  return (
    <Interactive position={position} onInteract={onInteract} info={["Server Rack", "Node staging & backup Postgres — semua LED hijau, cluster sehat.", "🖥️"]}>
      <RoundedBox args={[0.9, 2.1, 0.8]} radius={0.03} position={[0, 1.05, 0]} castShadow receiveShadow>
        <meshStandardMaterial color="#1f2937" roughness={0.4} metalness={0.5} />
      </RoundedBox>
      {Array.from({ length: 8 }).map((_, row) => (
        <group key={row} position={[0, 0.35 + row * 0.22, 0.405]}>
          <mesh>
            <planeGeometry args={[0.76, 0.16]} />
            <meshStandardMaterial color="#374151" roughness={0.5} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <mesh key={i} position={[0.22 + i * 0.05, 0, 0.002]} material={(row + i) % 2 ? green : blue}>
              <planeGeometry args={[0.025, 0.025]} />
            </mesh>
          ))}
        </group>
      ))}
    </Interactive>
  );
}

export function MeetingScreen({ position }: { position: Vec3 }) {
  const texture = getScreenTexture("pm");
  return (
    <group position={position}>
      <mesh castShadow>
        <boxGeometry args={[2.7, 1.55, 0.06]} />
        <meshStandardMaterial color="#0a0a0a" />
      </mesh>
      <mesh position={[0, 0, 0.035]}>
        <planeGeometry args={[2.6, 1.46]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
    </group>
  );
}

// Glass double door; faces local +z.
export function EntranceDoor({ position, onInteract }: { position: Vec3; onInteract?: InteractFn }) {
  const sign = useLabelTexture("ENTRANCE", "#064e3b", "#4ade80");
  return (
    <Interactive position={position} onInteract={onInteract} info={["Pintu Masuk Utama", "Pintu kaca otomatis tempat tamu & freelancer masuk.", "🚪"]}>
      {[-1.2, 1.2].map((x) => (
        <mesh key={x} position={[x, 1.35, 0]} castShadow>
          <boxGeometry args={[0.1, 2.7, 0.14]} />
          <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
        </mesh>
      ))}
      <mesh position={[0, 2.72, 0]} castShadow>
        <boxGeometry args={[2.5, 0.12, 0.14]} />
        <meshStandardMaterial color="#1f2937" metalness={0.7} roughness={0.3} />
      </mesh>
      {[-0.58, 0.58].map((x) => (
        <group key={x} position={[x, 1.33, 0]}>
          <mesh>
            <boxGeometry args={[1.1, 2.62, 0.03]} />
            <meshStandardMaterial color="#bae6fd" transparent opacity={0.3} roughness={0.05} depthWrite={false} />
          </mesh>
          <mesh position={[x > 0 ? -0.45 : 0.45, 0, 0.05]}>
            <cylinderGeometry args={[0.015, 0.015, 0.8, 8]} />
            <meshStandardMaterial color="#e5e7eb" metalness={0.9} roughness={0.2} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 3.0, 0.02]}>
        <planeGeometry args={[1.4, 0.35]} />
        <meshBasicMaterial map={sign} toneMapped={false} />
      </mesh>
    </Interactive>
  );
}

// ---------- Terrace / exterior ----------

export function LoungeChair({ position, rotation }: { position: Vec3; rotation?: Vec3 }) {
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0.3, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.65, 0.08, 1.3]} />
        <meshStandardMaterial color="#b08457" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.55, -0.55]} rotation={[0.9, 0, 0]} castShadow>
        <boxGeometry args={[0.65, 0.08, 0.6]} />
        <meshStandardMaterial color="#b08457" roughness={0.7} />
      </mesh>
      <mesh position={[0, 0.37, 0.1]}>
        <boxGeometry args={[0.58, 0.06, 1.0]} />
        <meshStandardMaterial color="#f1f5f9" roughness={1} />
      </mesh>
    </group>
  );
}

export function Parasol({ position, color = "#f97316" }: { position: Vec3; color?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 1.2, 0]} castShadow>
        <cylinderGeometry args={[0.03, 0.03, 2.4, 8]} />
        <meshStandardMaterial color="#e5e7eb" />
      </mesh>
      <mesh position={[0, 2.3, 0]} castShadow>
        <coneGeometry args={[1.3, 0.45, 8, 1, true]} />
        <meshStandardMaterial color={color} side={THREE.DoubleSide} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.25, 0.28, 0.06, 16]} />
        <meshStandardMaterial color="#374151" />
      </mesh>
    </group>
  );
}

export function PlanterBox({ position, size }: { position: Vec3; size: [number, number] }) {
  const bushes = Math.max(2, Math.round(Math.max(...size) / 0.6));
  const alongX = size[0] >= size[1];
  return (
    <group position={position}>
      <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
        <boxGeometry args={[size[0], 0.5, size[1]]} />
        <meshStandardMaterial color="#78716c" roughness={0.9} />
      </mesh>
      {Array.from({ length: bushes }).map((_, i) => {
        const f = (i + 0.5) / bushes - 0.5;
        return (
          <mesh
            key={i}
            position={[alongX ? f * size[0] : 0, 0.62 + (i % 2) * 0.08, alongX ? 0 : f * size[1]]}
            castShadow
          >
            <icosahedronGeometry args={[0.3, 0]} />
            <meshStandardMaterial color={i % 2 ? "#15803d" : "#22c55e"} roughness={0.8} flatShading />
          </mesh>
        );
      })}
    </group>
  );
}

// Warm bulbs strung between two points with a slight sag.
export function StringLights({ from, to, night }: { from: Vec3; to: Vec3; night: boolean }) {
  const bulbs = useMemo(() => {
    const n = 14;
    return Array.from({ length: n + 1 }, (_, i) => {
      const f = i / n;
      return [
        from[0] + (to[0] - from[0]) * f,
        from[1] + (to[1] - from[1]) * f - Math.sin(f * Math.PI) * 0.35,
        from[2] + (to[2] - from[2]) * f,
      ] as Vec3;
    });
  }, [from, to]);
  return (
    <group>
      {bulbs.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.05, 8, 6]} />
          <meshBasicMaterial color={night ? "#fde68a" : "#fef3c7"} toneMapped={!night} />
        </mesh>
      ))}
    </group>
  );
}

export function Tree({ position, scale = 1 }: { position: Vec3; scale?: number }) {
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.18, 1.8, 8]} />
        <meshStandardMaterial color="#7c5a3a" roughness={0.9} />
      </mesh>
      {[[0, 2.2, 0, 1.0], [0.4, 2.7, 0.2, 0.75], [-0.35, 2.8, -0.2, 0.7]].map(([x, y, z, r], i) => (
        <mesh key={i} position={[x, y, z]} castShadow>
          <icosahedronGeometry args={[r, 0]} />
          <meshStandardMaterial color={i === 1 ? "#4d7c0f" : "#65a30d"} roughness={0.8} flatShading />
        </mesh>
      ))}
    </group>
  );
}

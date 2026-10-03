"use client";

import { useMemo } from "react";
import * as THREE from "three";
import { FLOOR2_Y } from "./layout";

type Vec3 = [number, number, number];

// ---------- Procedural textures (canvas, no image downloads) ----------

const textureCache = new Map<string, THREE.CanvasTexture>();

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

function canvasTexture(key: string, draw: (ctx: CanvasRenderingContext2D, rand: () => number) => void) {
  const cached = textureCache.get(key);
  if (cached) return cached;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (ctx) draw(ctx, seeded(42));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  textureCache.set(key, tex);
  return tex;
}

const shade = (hex: string, amount: number) => {
  const c = new THREE.Color(hex);
  c.offsetHSL(0, 0, amount);
  return `#${c.getHexString()}`;
};

function planks(base: string, rows = 8, gap = "rgba(0,0,0,0.25)") {
  return canvasTexture(`planks-${base}-${rows}`, (ctx, rand) => {
    const rowH = 512 / rows;
    for (let r = 0; r < rows; r++) {
      let x = -rand() * 200;
      while (x < 512) {
        const w = 160 + rand() * 200;
        ctx.fillStyle = shade(base, (rand() - 0.5) * 0.08);
        ctx.fillRect(x, r * rowH, w, rowH);
        ctx.strokeStyle = "rgba(0,0,0,0.06)";
        ctx.lineWidth = 1;
        for (let g = 0; g < 4; g++) {
          const gy = r * rowH + rand() * rowH;
          ctx.beginPath();
          ctx.moveTo(x, gy);
          ctx.bezierCurveTo(x + w / 3, gy + 3, x + (2 * w) / 3, gy - 3, x + w, gy);
          ctx.stroke();
        }
        ctx.fillStyle = gap;
        ctx.fillRect(x, r * rowH, 2, rowH);
        x += w;
      }
      ctx.fillStyle = gap;
      ctx.fillRect(0, r * rowH, 512, 2);
    }
  });
}

function tiles(base: string, grout: string, count = 4) {
  return canvasTexture(`tiles-${base}-${count}`, (ctx, rand) => {
    const s = 512 / count;
    ctx.fillStyle = grout;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < count; i++)
      for (let j = 0; j < count; j++) {
        ctx.fillStyle = shade(base, (rand() - 0.5) * 0.04);
        ctx.fillRect(i * s + 3, j * s + 3, s - 6, s - 6);
      }
  });
}

function carpet(base: string) {
  return canvasTexture(`carpet-${base}`, (ctx, rand) => {
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 6000; i++) {
      ctx.fillStyle = rand() > 0.5 ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)";
      ctx.fillRect(rand() * 512, rand() * 512, 2, 2);
    }
  });
}

function windowView(night: boolean) {
  return canvasTexture(`window-${night}`, (ctx, rand) => {
    const sky = ctx.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0, night ? "#0b1026" : "#7cc4f5");
    sky.addColorStop(1, night ? "#27325a" : "#e0f2fe");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 14; i++) {
      const w = 30 + rand() * 50;
      const h = 120 + rand() * 260;
      const x = i * 38 - 10;
      ctx.fillStyle = night ? "#111831" : shade("#94a3b8", (rand() - 0.5) * 0.15);
      ctx.fillRect(x, 512 - h, w, h);
      for (let wy = 512 - h + 10; wy < 500; wy += 16)
        for (let wx = x + 6; wx < x + w - 6; wx += 10)
          if (rand() > (night ? 0.55 : 0.8)) {
            ctx.fillStyle = night ? "#fde68a" : "rgba(255,255,255,0.5)";
            ctx.fillRect(wx, wy, 5, 7);
          }
    }
  });
}

function withRepeat(tex: THREE.CanvasTexture, rx: number, ry: number) {
  const t = tex.clone();
  t.repeat.set(rx, ry);
  t.needsUpdate = true;
  return t;
}

// ---------- Building pieces ----------

// Floor surface covering rectangle [x0,x1] × [z0,z1]; `tile` = world size of one texture repeat.
function FloorSurface({ x0, x1, z0, z1, y, texture, tile }: { x0: number; x1: number; z0: number; z1: number; y: number; texture: THREE.CanvasTexture; tile: number }) {
  const w = x1 - x0;
  const d = z1 - z0;
  const map = useMemo(() => withRepeat(texture, w / tile, d / tile), [texture, w, d, tile]);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[(x0 + x1) / 2, y + 0.002, (z0 + z1) / 2]} receiveShadow>
      <planeGeometry args={[w, d]} />
      <meshStandardMaterial map={map} roughness={0.7} />
    </mesh>
  );
}

function Box({ position, size, color, roughness = 0.85, cast = true }: { position: Vec3; size: Vec3; color: string; roughness?: number; cast?: boolean }) {
  return (
    <mesh position={position} castShadow={cast} receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

// Window inset on a wall; faces local +z.
function WallWindow({ position, rotation, width, height, night }: { position: Vec3; rotation?: Vec3; width: number; height: number; night: boolean }) {
  const view = windowView(night);
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, 0.01]}>
        <planeGeometry args={[width, height]} />
        <meshBasicMaterial map={view} toneMapped={false} />
      </mesh>
      {[
        [0, height / 2, width + 0.12, 0.08],
        [0, -height / 2, width + 0.2, 0.1],
        [0, 0, 0.05, height],
      ].map(([x, y, w, h], i) => (
        <mesh key={i} position={[x, y, 0.04]} castShadow>
          <boxGeometry args={[w, h, 0.08]} />
          <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[(s * width) / 2, 0, 0.04]}>
          <boxGeometry args={[0.08, height, 0.08]} />
          <meshStandardMaterial color="#374151" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
    </group>
  );
}

const noRaycast = () => null;

// Straight glass partition from (x0,z0) to (x1,z1) with aluminium mullions.
function GlassWall({ from, to, y0, height, frosted = false }: { from: [number, number]; to: [number, number]; y0: number; height: number; frosted?: boolean }) {
  const [x0, z0] = from;
  const [x1, z1] = to;
  const length = Math.hypot(x1 - x0, z1 - z0);
  const angle = Math.atan2(z1 - z0, x1 - x0);
  const mullions = Math.max(1, Math.round(length / 3.5));
  return (
    <group position={[(x0 + x1) / 2, y0, (z0 + z1) / 2]} rotation={[0, -angle, 0]}>
      <mesh position={[0, height / 2, 0]} raycast={noRaycast} renderOrder={1}>
        <boxGeometry args={[length, height, 0.03]} />
        <meshStandardMaterial color="#e0f2fe" transparent opacity={0.1} roughness={0.05} metalness={0.1} depthWrite={false} />
      </mesh>
      {frosted && (
        <mesh position={[0, 1.2, 0]} raycast={noRaycast}>
          <boxGeometry args={[length, 0.35, 0.035]} />
          <meshStandardMaterial color="#f8fafc" transparent opacity={0.55} roughness={0.9} depthWrite={false} />
        </mesh>
      )}
      {[0, height].map((y) => (
        <mesh key={y} position={[0, y, 0]} raycast={noRaycast}>
          <boxGeometry args={[length, 0.04, 0.05]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.4} roughness={0.35} />
        </mesh>
      ))}
      {Array.from({ length: mullions + 1 }).map((_, i) => (
        <mesh key={i} position={[-length / 2 + (i * length) / mullions, height / 2, 0]} raycast={noRaycast}>
          <boxGeometry args={[0.03, height, 0.05]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.4} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

export function Railing({ from, to, y0 }: { from: [number, number]; to: [number, number]; y0: number }) {
  return <GlassWall from={from} to={to} y0={y0} height={1.05} />;
}

// 16 floating treads rising along -z from the group origin up to FLOOR2_Y.
export function Staircase({ position }: { position: Vec3 }) {
  const steps = 16;
  const run = 4.4;
  const rise = FLOOR2_Y;
  const slope = Math.atan2(rise, run);
  const len = Math.hypot(rise, run);
  return (
    <group position={position}>
      {Array.from({ length: steps }).map((_, i) => (
        <mesh key={i} position={[0, ((i + 1) * rise) / steps - 0.03, -(i + 0.5) * (run / steps)]} castShadow receiveShadow>
          <boxGeometry args={[1.3, 0.06, run / steps + 0.02]} />
          <meshStandardMaterial color="#b08457" roughness={0.5} />
        </mesh>
      ))}
      {[-0.68, 0.68].map((x) => (
        <mesh key={x} position={[x, rise / 2 - 0.1, -run / 2]} rotation={[slope, 0, 0]} castShadow>
          <boxGeometry args={[0.06, 0.28, len]} />
          <meshStandardMaterial color="#1f2937" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      <mesh position={[0.7, rise / 2 + 0.45, -run / 2]} rotation={[slope, 0, 0]} raycast={noRaycast}>
        <boxGeometry args={[0.02, 0.9, len]} />
        <meshStandardMaterial color="#dbeafe" transparent opacity={0.22} depthWrite={false} />
      </mesh>
      <mesh position={[0.7, rise / 2 + 0.92, -run / 2]} rotation={[slope, 0, 0]} castShadow>
        <boxGeometry args={[0.05, 0.05, len]} />
        <meshStandardMaterial color="#e5e7eb" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  );
}

function CeilingPanel({ position, night }: { position: Vec3; night: boolean }) {
  return (
    <mesh position={position} rotation={[Math.PI / 2, 0, 0]}>
      <planeGeometry args={[1.4, 0.5]} />
      <meshBasicMaterial color={night ? "#fff3d6" : "#ffffff"} toneMapped={false} />
    </mesh>
  );
}

const WALL = "#f1ede6";
const WALL_TOP = "#d6d0c4";

export function GroundFloorShell({ night }: { night: boolean }) {
  const oak = planks("#d9b38c");
  const stone = tiles("#e9e4dc", "#cfc8bc");
  const meetingCarpet = carpet("#475569");
  const h = FLOOR2_Y;

  return (
    <group>
      {/* Slab + finishes */}
      <Box position={[0, -0.1, 0]} size={[20.4, 0.2, 14.4]} color="#d6d3d1" cast={false} />
      <FloorSurface x0={-10} x1={1.5} z0={-7} z1={7} y={0} texture={oak} tile={3} />
      <FloorSurface x0={1.5} x1={10} z0={-7} z1={-1.5} y={0} texture={meetingCarpet} tile={3} />
      <FloorSurface x0={1.5} x1={10} z0={-1.5} z1={7} y={0} texture={stone} tile={2.4} />

      {/* Solid back + left walls (cutaway dollhouse: front/right are glass) */}
      <Box position={[0, h / 2, -7.1]} size={[20.4, h, 0.2]} color={WALL} />
      <Box position={[-10.1, h / 2, 0]} size={[0.2, h, 14.4]} color={WALL} />
      <mesh position={[5.75, h / 2, -6.99]}>
        <planeGeometry args={[8.5, h]} />
        <meshStandardMaterial color="#c7d2de" roughness={0.9} />
      </mesh>
      <mesh position={[-9.99, h / 2, -2.5]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[9, h]} />
        <meshStandardMaterial color="#e3ebe4" roughness={0.9} />
      </mesh>

      <WallWindow position={[-7.5, 1.75, -6.99]} width={2.2} height={1.7} night={night} />
      <WallWindow position={[-4.5, 1.75, -6.99]} width={2.2} height={1.7} night={night} />
      <WallWindow position={[3.0, 1.75, -6.99]} width={1.6} height={1.7} night={night} />
      <WallWindow position={[8.7, 1.75, -6.99]} width={1.6} height={1.7} night={night} />
      <WallWindow position={[-9.99, 1.75, -5.2]} rotation={[0, Math.PI / 2, 0]} width={2.2} height={1.7} night={night} />
      <WallWindow position={[-9.99, 1.75, -1.5]} rotation={[0, Math.PI / 2, 0]} width={2.2} height={1.7} night={night} />

      {/* Glass curtain wall: front (door gap for entrance) + right */}
      <GlassWall from={[-10, 7]} to={[3.55, 7]} y0={0} height={h - 0.25} />
      <GlassWall from={[6.05, 7]} to={[10, 7]} y0={0} height={h - 0.25} />
      <GlassWall from={[10, -7]} to={[10, 7]} y0={0} height={h - 0.25} />

      {/* Meeting room glass box with door gap at x ∈ [2.2, 3.4] */}
      <GlassWall from={[1.5, -7]} to={[1.5, -1.5]} y0={0} height={h - 0.25} frosted />
      <GlassWall from={[1.5, -1.5]} to={[2.2, -1.5]} y0={0} height={h - 0.25} frosted />
      <GlassWall from={[3.4, -1.5]} to={[10, -1.5]} y0={0} height={h - 0.25} frosted />

      {[
        [-6.5, -3.5],
        [-3.5, -3.5],
        [-6.5, 0],
        [-3.5, 0],
        [-5, 4.5],
        [5.5, 0.5],
        [5.5, 4.5],
        [8.5, 4.5],
      ].map(([x, z], i) => (
        <CeilingPanel key={i} position={[x, h - 0.26, z]} night={night} />
      ))}
    </group>
  );
}

export function UpperFloorShell({ night }: { night: boolean }) {
  const walnut = planks("#b98b62");
  const loungeCarpet = carpet("#9a8c7c");
  const deck = planks("#a0785a", 12, "rgba(0,0,0,0.45)");
  const y = FLOOR2_Y;
  const h = 3.2;

  return (
    <group>
      {/* Slab with stair opening at x ∈ [-10, -7.9], z ∈ [1.6, 7] */}
      <Box position={[1.05, y - 0.125, 0]} size={[17.9, 0.25, 14]} color="#f5f5f4" />
      <Box position={[-8.95, y - 0.125, -2.7]} size={[2.1, 0.25, 8.6]} color="#f5f5f4" />
      <FloorSurface x0={-10} x1={1} z0={-7} z1={1.6} y={y} texture={walnut} tile={3} />
      <FloorSurface x0={-7.9} x1={4} z0={1.6} z1={7} y={y} texture={walnut} tile={3} />
      <FloorSurface x0={1} x1={10} z0={-7} z1={1.6} y={y} texture={loungeCarpet} tile={3} />
      <FloorSurface x0={4} x1={10} z0={1.6} z1={7} y={y} texture={deck} tile={2} />

      <Box position={[0, y + h / 2, -7.1]} size={[20.4, h, 0.2]} color={WALL} />
      <Box position={[-10.1, y + h / 2, 0]} size={[0.2, h, 14.4]} color={WALL} />
      <Box position={[0, y + h + 0.05, -7.1]} size={[20.6, 0.1, 0.3]} color={WALL_TOP} />
      <Box position={[-10.1, y + h + 0.05, 0]} size={[0.3, 0.1, 14.6]} color={WALL_TOP} />
      {/* Lounge accent wall behind the TV */}
      <mesh position={[5.5, y + h / 2, -6.99]}>
        <planeGeometry args={[9, h]} />
        <meshStandardMaterial color="#334155" roughness={0.9} />
      </mesh>

      <WallWindow position={[-5, y + 1.75, -6.99]} width={2} height={1.6} night={night} />
      <WallWindow position={[-1.8, y + 1.75, -6.99]} width={2} height={1.6} night={night} />
      <WallWindow position={[1.9, y + 1.75, -6.99]} width={1.4} height={1.6} night={night} />
      <WallWindow position={[9.0, y + 1.75, -6.99]} width={1.4} height={1.6} night={night} />
      <WallWindow position={[-9.99, y + 1.75, 0.2]} rotation={[0, Math.PI / 2, 0]} width={1.8} height={1.6} night={night} />

      {/* Indoor glass envelope; terrace (x ≥ 4, z ≥ 1.6) is open air */}
      <GlassWall from={[-10, 7]} to={[4, 7]} y0={y} height={h} />
      <GlassWall from={[10, -7]} to={[10, 1.6]} y0={y} height={h} />
      <GlassWall from={[4, 1.6]} to={[10, 1.6]} y0={y} height={h} />
      <GlassWall from={[4, 1.6]} to={[4, 4]} y0={y} height={h} />
      <GlassWall from={[4, 5]} to={[4, 7]} y0={y} height={h} />
      <Railing from={[4, 7]} to={[10, 7]} y0={y} />
      <Railing from={[10, 1.6]} to={[10, 7]} y0={y} />
      {/* Stairwell guard */}
      <Railing from={[-7.9, 1.6]} to={[-7.9, 7]} y0={y} />
    </group>
  );
}

export function Grounds({ night }: { night: boolean }) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.21, 0]} receiveShadow>
        <circleGeometry args={[60, 48]} />
        <meshStandardMaterial color={night ? "#3f4a3a" : "#a3b98a"} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]} receiveShadow>
        <planeGeometry args={[26, 20]} />
        <meshStandardMaterial color="#d6d0c4" roughness={0.95} />
      </mesh>
      {/* Front walkway to entrance */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[4.8, -0.19, 12]} receiveShadow>
        <planeGeometry args={[2.6, 10]} />
        <meshStandardMaterial color="#cbc3b5" roughness={0.95} />
      </mesh>
    </group>
  );
}

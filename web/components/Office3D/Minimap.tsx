"use client";

import { useEffect, useRef } from "react";
import type { AgentState } from "@/lib/types";
import type { LiveAgentStatus } from "./CharacterModel";
import { ROLE_RING_COLOR, DEFAULT_RING_COLOR } from "./layout";

// World footprint x ∈ [-10, 10], z ∈ [-7, 7] → SVG pixels.
const SCALE = 7;
const W = 20 * SCALE;
const H = 14 * SCALE;
const toX = (x: number) => (x + 10) * SCALE;
const toY = (z: number) => (z + 7) * SCALE;

type Room = [x0: number, z0: number, x1: number, z1: number, label: string, fill: string];

const ROOMS: Record<1 | 2, Room[]> = {
  1: [
    [-10, -7, 1.5, 7, "Engineering", "#d9b38c"],
    [1.5, -7, 10, -1.5, "Rapat", "#64748b"],
    [1.5, -1.5, 10, 3, "Pantry", "#e9e4dc"],
    [1.5, 3, 10, 7, "Lobby", "#e2d6c3"],
    [-9.5, 1.6, -8.1, 6, "", "#92400e"],
  ],
  2: [
    [-10, -7, 1, 1.6, "Strategi", "#b98b62"],
    [1, -7, 10, 1.6, "Lounge TV", "#9a8c7c"],
    [-7.9, 1.6, 4, 7, "Game", "#c9a27e"],
    [4, 1.6, 10, 7, "Terrace", "#a0785a"],
    [-10, 1.6, -7.9, 7, "", "#1f2937"],
  ],
};

export function Minimap({
  agents,
  livePositionsRef,
  onPick,
}: {
  agents: Record<string, AgentState>;
  livePositionsRef: React.MutableRefObject<Record<string, LiveAgentStatus>>;
  onPick: (floor: 1 | 2, x: number, z: number) => void;
}) {
  const dotRefs = useRef<Record<string, SVGCircleElement | null>>({});

  // Dots move every animation frame straight from the live 3D positions (no React re-render).
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      for (const [key, el] of Object.entries(dotRefs.current)) {
        if (!el) continue;
        const [role, floorStr] = key.split("@");
        const live = livePositionsRef.current[role];
        const onFloor = live && (live.y > 1.8 ? 2 : 1) === Number(floorStr);
        el.style.display = onFloor ? "" : "none";
        if (live && onFloor) {
          el.setAttribute("cx", String(toX(live.x)));
          el.setAttribute("cy", String(toY(live.z)));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [livePositionsRef]);

  return (
    <div className="flex gap-2 rounded-2xl bg-zinc-900/85 backdrop-blur-md border border-zinc-700/70 p-2 shadow-2xl">
      {([2, 1] as const).map((floor) => (
        <div key={floor} className="flex flex-col items-center gap-1">
          <svg
            width={W}
            height={H}
            className="rounded-md cursor-crosshair"
            onClick={(e) => {
              const box = e.currentTarget.getBoundingClientRect();
              onPick(floor, (e.clientX - box.left) / SCALE - 10, (e.clientY - box.top) / SCALE - 7);
            }}
          >
            {ROOMS[floor].map(([x0, z0, x1, z1, label, fill], i) => (
              <g key={i}>
                <rect x={toX(x0)} y={toY(z0)} width={(x1 - x0) * SCALE} height={(z1 - z0) * SCALE} fill={fill} opacity={0.55} stroke="#0f172a" strokeWidth={1} />
                {label && (
                  <text x={toX((x0 + x1) / 2)} y={toY((z0 + z1) / 2) + 3} textAnchor="middle" fontSize={8} fill="#f8fafc" className="pointer-events-none select-none">
                    {label}
                  </text>
                )}
              </g>
            ))}
            {Object.keys(agents).map((role) => (
              <circle
                key={role}
                ref={(el) => {
                  dotRefs.current[`${role}@${floor}`] = el;
                }}
                r={3.5}
                fill={ROLE_RING_COLOR[role] ?? DEFAULT_RING_COLOR}
                stroke="#fff"
                strokeWidth={1}
                style={{ display: "none" }}
              >
                <title>{agents[role].display_name || role}</title>
              </circle>
            ))}
          </svg>
          <span className="text-[10px] font-mono text-zinc-400">Lantai {floor}</span>
        </div>
      ))}
    </div>
  );
}

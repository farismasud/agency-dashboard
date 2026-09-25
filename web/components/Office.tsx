import type { AgentState } from "@/lib/types";

const ROLE_LABEL: Record<string, string> = {
  pm: "PM",
  analyst: "Analyst",
  dev: "Dev",
  qa: "QA",
};

const ROLE_COLOR: Record<string, string> = {
  pm: "#7c3aed",
  analyst: "#0ea5e9",
  dev: "#16a34a",
  qa: "#ea580c",
};

// Alternate character sprite per role - purely for visual variety, no
// meaning attached. Kenney's "Toon Characters 1" pack (CC0).
const ROLE_SPRITE: Record<string, "male" | "female"> = {
  pm: "male",
  analyst: "female",
  dev: "male",
  qa: "female",
};

const DESK_POS: Record<string, { left: number; top: number }> = {
  pm: { left: 12, top: 20 },
  analyst: { left: 34, top: 54 },
  dev: { left: 62, top: 24 },
  qa: { left: 84, top: 56 },
};

const BREAK_SLOTS = [
  { left: 44, top: 84 },
  { left: 56, top: 84 },
  { left: 44, top: 92 },
  { left: 56, top: 92 },
];

const FURNITURE_POS: { src: string; left: number; top: number; width: number }[] = [
  { src: "/office/furniture/plantSmall1.png", left: 3, top: 88, width: 32 },
  { src: "/office/furniture/plantSmall2.png", left: 95, top: 88, width: 32 },
  { src: "/office/furniture/loungeSofaLong.png", left: 50, top: 88, width: 150 },
];

function Desk({ left, top }: { left: number; top: number }) {
  return (
    <div
      className="absolute pointer-events-none select-none"
      style={{ left: `${left}%`, top: `${top}%`, transform: "translate(-50%, -35%)" }}
    >
      <img src="/office/furniture/desk.png" alt="" width={70} height={74} className="[image-rendering:pixelated]" />
      <img
        src="/office/furniture/computerScreen.png"
        alt=""
        width={28}
        height={35}
        className="absolute [image-rendering:pixelated]"
        style={{ left: "50%", top: "-14px", transform: "translateX(-50%)" }}
      />
    </div>
  );
}

function Character({
  sprite,
  pose,
  bob,
  label,
}: {
  sprite: "male" | "female";
  pose: string;
  bob: boolean;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center pointer-events-none select-none">
      <img
        src={`/office/characters/${sprite}_${pose}.png`}
        alt=""
        width={44}
        height={59}
        className={`[image-rendering:pixelated] ${bob ? "agency-bob" : ""}`}
      />
      <div className="text-[10px] font-medium text-neutral-700 -mt-1">{label}</div>
    </div>
  );
}

export function Office({ agents }: { agents: Record<string, AgentState> }) {
  const entries = Object.values(agents);

  return (
    <div className="relative rounded-lg border border-amber-200 overflow-hidden h-[440px] bg-gradient-to-b from-amber-50 to-amber-100">
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 800 440" preserveAspectRatio="none">
        <rect x="0" y="0" width="800" height="440" fill="#f3e3c3" />
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={i} x1={i * 90} y1="0" x2={i * 90} y2="440" stroke="#e3cd9c" strokeWidth="2" />
        ))}
        <rect x="40" y="20" width="90" height="60" rx="4" fill="#bcdcf2" stroke="#8fb8d8" strokeWidth="3" />
        <line x1="85" y1="20" x2="85" y2="80" stroke="#8fb8d8" strokeWidth="3" />
        <rect x="670" y="20" width="90" height="60" rx="4" fill="#bcdcf2" stroke="#8fb8d8" strokeWidth="3" />
        <line x1="715" y1="20" x2="715" y2="80" stroke="#8fb8d8" strokeWidth="3" />
      </svg>

      {Object.entries(DESK_POS).map(([role, pos]) => (
        <Desk key={role} left={pos.left} top={pos.top} />
      ))}

      {FURNITURE_POS.map((f, i) => (
        <img
          key={i}
          src={f.src}
          alt=""
          width={f.width}
          className="absolute pointer-events-none select-none [image-rendering:pixelated]"
          style={{ left: `${f.left}%`, top: `${f.top}%`, transform: "translate(-50%, -30%)" }}
        />
      ))}

      {entries.map((agent) => {
        const working = agent.status === "working";
        const idx = entries.filter((e) => e.status !== "working").indexOf(agent);
        const pos = working
          ? DESK_POS[agent.subagent_type] ?? { left: 50, top: 50 }
          : BREAK_SLOTS[idx % BREAK_SLOTS.length];
        const sprite = ROLE_SPRITE[agent.subagent_type] ?? "male";
        const pose = working ? "think" : "idle";

        return (
          <div
            key={agent.subagent_type}
            className="absolute flex flex-col items-center transition-all duration-700 ease-in-out"
            style={{ left: `${pos.left}%`, top: `${pos.top}%`, transform: "translate(-50%, -75%)" }}
          >
            {working && (
              <div className="mb-1 max-w-[140px] rounded bg-white/95 px-2 py-1 text-[11px] text-neutral-800 shadow truncate border border-neutral-200">
                {agent.last_action || "Kerja..."}
              </div>
            )}
            <Character
              sprite={sprite}
              pose={pose}
              bob={working}
              label={`${agent.display_name} · ${ROLE_LABEL[agent.subagent_type] ?? agent.subagent_type}`}
            />
            {!working && <div className="text-[10px] text-neutral-500 mt-0.5">☕ Istirahat</div>}
          </div>
        );
      })}
    </div>
  );
}

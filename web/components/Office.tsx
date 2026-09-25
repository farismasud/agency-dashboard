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

// Desk position (working) per role, and a shared break-area slot (idle),
// as percentages of the room's width/height.
const DESK_POS: Record<string, { left: number; top: number }> = {
  pm: { left: 12, top: 22 },
  analyst: { left: 34, top: 55 },
  dev: { left: 62, top: 28 },
  qa: { left: 84, top: 58 },
};

const BREAK_SLOTS = [
  { left: 46, top: 82 },
  { left: 54, top: 82 },
  { left: 46, top: 90 },
  { left: 54, top: 90 },
];

function DeskIcon({ x, y, color }: { x: number; y: number; color: string }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-26} y={0} width={52} height={26} rx={4} fill="#c9a878" stroke="#a9835b" strokeWidth={1.5} />
      <rect x={-18} y={-16} width={36} height={20} rx={2} fill="#2b2b33" />
      <rect x={-15} y={-13} width={30} height={13} rx={1} fill={color} opacity={0.85} />
      <rect x={-3} y={4} width={6} height={10} fill="#8a6a45" />
    </g>
  );
}

function Plant({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x}, ${y})`}>
      <rect x={-10} y={0} width={20} height={16} rx={3} fill="#b3714a" />
      <circle cx={0} cy={-10} r={16} fill="#3f9142" />
      <circle cx={-9} cy={-4} r={11} fill="#4caf50" />
      <circle cx={9} cy={-4} r={11} fill="#4caf50" />
    </g>
  );
}

function Character({
  colorHex,
  label,
  working,
}: {
  colorHex: string;
  label: string;
  working: boolean;
}) {
  return (
    <div className="flex flex-col items-center pointer-events-none select-none">
      <svg
        width="40"
        height="52"
        viewBox="0 0 40 52"
        className={working ? "agency-bob" : ""}
      >
        <ellipse cx="20" cy="49" rx="12" ry="3" fill="rgba(0,0,0,0.18)" />
        <rect x="10" y="20" width="20" height="22" rx="8" fill={colorHex} />
        <circle cx="20" cy="12" r="11" fill="#f2c9a0" />
        <circle cx="16" cy="12" r="1.6" fill="#2b2b33" />
        <circle cx="24" cy="12" r="1.6" fill="#2b2b33" />
        <path d="M15 17 Q20 20 25 17" stroke="#8a5a3a" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M9 8 Q20 -3 31 8 L31 10 Q20 3 9 10 Z" fill="#3b2a20" />
      </svg>
      <div className="text-[10px] font-medium text-neutral-700 -mt-1">{label}</div>
    </div>
  );
}

export function Office({ agents }: { agents: Record<string, AgentState> }) {
  const entries = Object.values(agents);

  return (
    <div className="relative rounded-lg border border-amber-200 overflow-hidden h-[440px] bg-gradient-to-b from-amber-50 to-amber-100">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 800 440"
        preserveAspectRatio="none"
      >
        <rect x="0" y="0" width="800" height="440" fill="#f3e3c3" />
        {Array.from({ length: 9 }).map((_, i) => (
          <line key={i} x1={i * 90} y1="0" x2={i * 90} y2="440" stroke="#e3cd9c" strokeWidth="2" />
        ))}
        <rect x="40" y="20" width="90" height="60" rx="4" fill="#bcdcf2" stroke="#8fb8d8" strokeWidth="3" />
        <line x1="85" y1="20" x2="85" y2="80" stroke="#8fb8d8" strokeWidth="3" />
        <rect x="670" y="20" width="90" height="60" rx="4" fill="#bcdcf2" stroke="#8fb8d8" strokeWidth="3" />
        <line x1="715" y1="20" x2="715" y2="80" stroke="#8fb8d8" strokeWidth="3" />

        {Object.keys(DESK_POS).map((role) => (
          <DeskIcon
            key={role}
            x={(DESK_POS[role].left / 100) * 800}
            y={(DESK_POS[role].top / 100) * 440}
            color={ROLE_COLOR[role]}
          />
        ))}

        <rect x="330" y="330" width="140" height="60" rx="16" fill="#8b6a4f" />
        <rect x="330" y="320" width="140" height="20" rx="10" fill="#a9835b" />

        <Plant x={30} y={400} />
        <Plant x={760} y={400} />
      </svg>

      {entries.map((agent) => {
        const working = agent.status === "working";
        const idx = entries.filter((e) => e.status !== "working").indexOf(agent);
        const pos = working
          ? DESK_POS[agent.subagent_type] ?? { left: 50, top: 50 }
          : BREAK_SLOTS[idx % BREAK_SLOTS.length];

        return (
          <div
            key={agent.subagent_type}
            className="absolute flex flex-col items-center transition-all duration-700 ease-in-out"
            style={{ left: `${pos.left}%`, top: `${pos.top}%`, transform: "translate(-50%, -60%)" }}
          >
            {working && (
              <div className="mb-1 max-w-[140px] rounded bg-white/95 px-2 py-1 text-[11px] text-neutral-800 shadow truncate border border-neutral-200">
                {agent.last_action || "Kerja..."}
              </div>
            )}
            <Character
              colorHex={ROLE_COLOR[agent.subagent_type] ?? "#64748b"}
              label={`${agent.display_name} · ${ROLE_LABEL[agent.subagent_type] ?? agent.subagent_type}`}
              working={working}
            />
            {!working && <div className="text-[10px] text-neutral-500 mt-0.5">☕ Istirahat</div>}
          </div>
        );
      })}
    </div>
  );
}

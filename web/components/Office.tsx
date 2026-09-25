import type { AgentState } from "@/lib/types";

const ROLE_POSITIONS: Record<string, { left: string; top: string }> = {
  pm: { left: "10%", top: "20%" },
  analyst: { left: "35%", top: "50%" },
  dev: { left: "60%", top: "30%" },
  qa: { left: "80%", top: "60%" },
};

export function Office({ agents }: { agents: Record<string, AgentState> }) {
  return (
    <div className="relative border rounded bg-amber-50 h-[400px] overflow-hidden">
      {Object.values(agents).map((agent) => {
        const pos = ROLE_POSITIONS[agent.subagent_type] ?? { left: "50%", top: "50%" };
        return (
          <div
            key={agent.subagent_type}
            className="absolute flex flex-col items-center transition-all duration-500"
            style={{ left: pos.left, top: pos.top }}
          >
            <div
              className={`px-2 py-1 rounded text-xs text-white ${
                agent.status === "working" ? "bg-green-600" : "bg-gray-400"
              }`}
            >
              {agent.display_name} · {agent.subagent_type}
            </div>
            <div className="text-xs bg-white border rounded px-1 mt-1 max-w-[160px] truncate">
              {agent.status === "working" ? agent.last_action : "Istirahat"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

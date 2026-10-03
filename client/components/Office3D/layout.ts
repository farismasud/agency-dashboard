// Leads of non-Claude tools. The backend prefixes their subagent type with the
// tool name, so these keys are what the rest of the web sees.
export const TOOL_LEAD_STYLE: Record<string, { label: string; color: string }> = {
  "codex-lead": { label: "Codex", color: "#10b981" },
  "agy-lead": { label: "agy", color: "#3b82f6" },
  "hermes-lead": { label: "Hermes", color: "#ec4899" },
};

export const ROLE_LABEL: Record<string, string> = {
  pm: "PM",
  analyst: "Analyst",
  dev: "Dev",
  qa: "QA",
  devops: "DevOps",
  dba: "DBA",
  security: "Security",
  designer: "Designer",
  lead: "Lead",
  trader: "Trader",
  finance: "Finance",
  scribe: "Scribe",
  infra: "Infra",
  uiux: "UI/UX",
  omarchy: "Omarchy",
  ...Object.fromEntries(Object.entries(TOOL_LEAD_STYLE).map(([role, style]) => [role, style.label])),
};

export const ROLE_RING_COLOR: Record<string, string> = {
  pm: "#7c3aed",
  analyst: "#0ea5e9",
  dev: "#16a34a",
  qa: "#ea580c",
  devops: "#0d9488",
  dba: "#2563eb",
  security: "#dc2626",
  designer: "#a855f7",
  lead: "#f59e0b",
  trader: "#10b981",
  finance: "#eab308",
  scribe: "#6366f1",
  infra: "#06b6d4",
  uiux: "#ec4899",
  omarchy: "#8b5cf6",
  ...Object.fromEntries(Object.entries(TOOL_LEAD_STYLE).map(([role, style]) => [role, style.color])),
};

// Building footprint: x ∈ [-10, 10], z ∈ [-7, 7]. Floor 2 walking surface sits at FLOOR2_Y.
export const FLOOR2_Y = 3.6;
export const floorY = (floor: 1 | 2) => (floor === 2 ? FLOOR2_Y : 0);

// [x, y, z] desk centre. Chair sits at z + 0.65, monitor faces +z.
export const DESK_POS_3D: Record<string, [number, number, number]> = {
  // Lantai 1 — Engineering open office
  dev: [-6.5, 0, -3.5],
  qa: [-3.5, 0, -3.5],
  devops: [-6.5, 0, 0],
  dba: [-3.5, 0, 0],
  infra: [-6.5, 0, 2.5],
  // Lantai 2 — Strategy & Trading Studio (zona kiri)
  pm: [-5.5, FLOOR2_Y, -4.5],
  analyst: [-2.5, FLOOR2_Y, -4.5],
  trader: [-5.5, FLOOR2_Y, -1.5],
  finance: [-2.5, FLOOR2_Y, -1.5],
  designer: [-5.5, FLOOR2_Y, 1.5],
  security: [-2.5, FLOOR2_Y, 1.5],
  scribe: [-4.0, FLOOR2_Y, 4.2],
  // Main Claude session (hook events without agent_type)
  lead: [1.2, FLOOR2_Y, 2.9],
};

// Hot desks on Lt.1 for subagent types without a fixed desk (Explore, general-purpose...).
// They face the corridor (rotated 180°), so the chair sits at z - 0.65.
export const HOT_DESKS: [number, number, number][] = [
  [-6.2, 0, 3.2],
  [-4.2, 0, 3.2],
  [-2.2, 0, 3.2],
  [-0.2, 0, 3.2],
];

// First-seen guest roles keep their hot desk for the whole session.
// ponytail: more than 4 guests share desks round-robin; add desks if that becomes common.
const guestSlots = new Map<string, number>();

export function guestSlot(role: string): number {
  let slot = guestSlots.get(role);
  if (slot === undefined) {
    slot = guestSlots.size % HOT_DESKS.length;
    guestSlots.set(role, slot);
  }
  return slot;
}

export function guestAtSlot(slot: number): string | undefined {
  for (const [role, s] of guestSlots) if (s === slot) return role;
  return undefined;
}

export const isGuest = (role: string) => !(role in DESK_POS_3D);

export const DEFAULT_RING_COLOR = "#64748b";
export const DEFAULT_LABEL = "Agent";

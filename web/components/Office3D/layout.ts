export const ROLE_LABEL: Record<string, string> = {
  pm: "PM",
  analyst: "Analyst",
  dev: "Dev",
  qa: "QA",
};

export const ROLE_SPRITE: Record<string, "male" | "female"> = {
  pm: "male",
  analyst: "female",
  dev: "male",
  qa: "female",
};

export const ROLE_RING_COLOR: Record<string, string> = {
  pm: "#7c3aed",
  analyst: "#0ea5e9",
  dev: "#16a34a",
  qa: "#ea580c",
};

// [x, z] world-unit positions. x = left/right, z = depth (toward camera is +z).
export const DESK_POS: Record<string, [number, number]> = {
  pm: [-4, -2],
  analyst: [-1.2, 1],
  dev: [2, -2],
  qa: [4.5, 1],
};

export const BREAK_SLOTS: [number, number][] = [
  [-1, 3.2],
  [0, 3.2],
  [-1, 4],
  [0, 4],
];

// Used when a subagent_type has no entry in DESK_POS/ROLE_* maps (e.g. a
// future new role) - keeps the scene from crashing on an undefined lookup.
export const DEFAULT_POS: [number, number] = [0, 0];
export const DEFAULT_SPRITE: "male" | "female" = "male";
export const DEFAULT_RING_COLOR = "#64748b";
export const DEFAULT_LABEL = "Agent";

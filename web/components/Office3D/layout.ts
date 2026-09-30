export const ROLE_LABEL: Record<string, string> = {
  pm: "PM",
  analyst: "Analyst",
  dev: "Dev",
  qa: "QA",
  devops: "DevOps",
  dba: "DBA",
  security: "Security",
  designer: "Designer",
};

export const ROLE_SPRITE: Record<string, "male" | "female"> = {
  pm: "male",
  analyst: "female",
  dev: "male",
  qa: "female",
  devops: "male",
  dba: "male",
  security: "male",
  designer: "female",
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
};

// [x, y, z] world-unit positions.
// Floor 1 desks: y = 0
// Floor 2 desks: y = 3.6 (Mezzanine Floor)
export const DESK_POS_3D: Record<string, [number, number, number]> = {
  // --- LANTAI 1 (Ground Floor - Engineering & Operations) ---
  dev: [-3.0, 0, -1.0],
  qa: [3.0, 0, -1.0],
  devops: [-3.0, 0, 3.2],
  dba: [3.0, 0, 3.2],

  // --- LANTAI 2 (Mezzanine Floor - Strategy, Architecture & Design) ---
  pm: [-7.2, 3.6, -5.0],
  analyst: [-2.6, 3.6, -5.0],
  security: [-6.8, 3.6, -2.0],
  designer: [-2.6, 3.6, -2.0],
};

// Backward compatibility map for [x, z]
export const DESK_POS: Record<string, [number, number]> = {
  dev: [-3.0, -1.0],
  qa: [3.0, -1.0],
  devops: [-3.0, 3.2],
  dba: [3.0, 3.2],
  pm: [-7.2, -5.0],
  analyst: [-2.6, -5.0],
  security: [-6.8, -2.0],
  designer: [-2.6, -2.0],
};

export const SEAT_OFFSET_Z = 0.65;

export const DEFAULT_POS: [number, number] = [0, 0];
export const DEFAULT_SPRITE: "male" | "female" = "male";
export const DEFAULT_RING_COLOR = "#64748b";
export const DEFAULT_LABEL = "Agent";

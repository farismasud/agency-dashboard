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
  // Lantai 2 — Strategy studio
  pm: [-5.5, FLOOR2_Y, -4.5],
  analyst: [-2.5, FLOOR2_Y, -4.5],
  security: [-5.5, FLOOR2_Y, -1.2],
  designer: [-2.5, FLOOR2_Y, -1.2],
};

export const DEFAULT_RING_COLOR = "#64748b";
export const DEFAULT_LABEL = "Agent";

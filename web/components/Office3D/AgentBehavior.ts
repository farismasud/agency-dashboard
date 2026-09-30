"use client";

import { DESK_POS_3D } from "./layout";

export interface OfficeSpot {
  id: string;
  x: number;
  z: number;
  y: number; // ground floor (0), chair (0.38), sofa (0.24), floor 2 (3.6), floor 2 chair (3.98)
  faceAngle: number;
  actionState: "sit" | "idle" | "interact-right" | "interact-left";
  category: "desk" | "sofa" | "whiteboard" | "waterCooler" | "bookshelf" | "window" | "plant" | "coffee" | "balcony" | "meeting" | "wander";
  label: string;
  floor: 1 | 2;
}

// Seat cushion heights: ground floor chair: 0.38, floor 2 chair: 3.98
export function getDeskSpot(role: string): OfficeSpot {
  const [dx, dy, dz] = DESK_POS_3D[role] ?? [-3.0, 0, -1.0];
  const floor: 1 | 2 = dy > 1.0 ? 2 : 1;
  return {
    id: `desk-${role}`,
    x: dx,
    z: dz + 0.65, // Exact chair center
    y: dy + 0.38, // Elevated onto chair cushion
    faceAngle: Math.PI, // Facing desk/monitor
    actionState: "sit",
    category: "desk",
    label: `Meja ${role.toUpperCase()} (Lantai ${floor})`,
    floor,
  };
}

export function getRandomOfficeSpots(role: string): OfficeSpot[] {
  const ownDesk = getDeskSpot(role);

  // Common shared waypoints across both floors
  const spots: OfficeSpot[] = [
    ownDesk,

    // === LANTAI 1 (Ground Floor) ===
    // Break Lounge Sofa (sitting squarely on cushions)
    {
      id: "sofa-left",
      x: 6.05,
      z: 4.5,
      y: 0,
      faceAngle: 0,
      actionState: "sit",
      category: "sofa",
      label: "Sofa Santai (Lt. 1)",
      floor: 1,
    },
    {
      id: "sofa-right",
      x: 6.75,
      z: 4.5,
      y: 0,
      faceAngle: 0,
      actionState: "sit",
      category: "sofa",
      label: "Sofa Santai (Lt. 1)",
      floor: 1,
    },
    // Espresso Coffee Bar (standing in front of bar counter, facing machine)
    {
      id: "coffee-bar",
      x: 4.8,
      z: 4.4,
      y: 0,
      faceAngle: 0,
      actionState: "interact-right",
      category: "coffee",
      label: "Mesin Espresso (Lt. 1)",
      floor: 1,
    },
    // Water Dispenser (standing in front of tap cavity, facing dispenser)
    {
      id: "water-cooler",
      x: 8.2,
      z: 5.0,
      y: 0,
      faceAngle: Math.PI,
      actionState: "interact-left",
      category: "waterCooler",
      label: "Galon Air Sejuk (Lt. 1)",
      floor: 1,
    },
    // Conference / Meeting Table Chairs
    {
      id: "meeting-table-1",
      x: 6.0,
      z: -0.95,
      y: 0,
      faceAngle: Math.PI, // Sitting on front chair facing meeting table
      actionState: "sit",
      category: "meeting",
      label: "Meja Rapat Tim (Lt. 1)",
      floor: 1,
    },
    {
      id: "meeting-table-2",
      x: 6.0,
      z: -2.65,
      y: 0,
      faceAngle: 0, // Sitting on back chair facing meeting table
      actionState: "sit",
      category: "meeting",
      label: "Meja Rapat Tim (Lt. 1)",
      floor: 1,
    },
    {
      id: "meeting-table-3",
      x: 5.0,
      z: -0.95,
      y: 0,
      faceAngle: Math.PI, // Sitting on front-left chair
      actionState: "sit",
      category: "meeting",
      label: "Meja Rapat Tim (Lt. 1)",
      floor: 1,
    },
    // Entrance / Freelancer Door
    {
      id: "entrance-door",
      x: 10.1,
      z: 1.0,
      y: 0,
      faceAngle: -Math.PI / 2,
      actionState: "idle",
      category: "wander",
      label: "Pintu Masuk Utama (Lt. 1)",
      floor: 1,
    },
    // Ground Floor Panoramic Window View
    {
      id: "window-floor1",
      x: 5.5,
      z: -6.6,
      y: 0,
      faceAngle: Math.PI,
      actionState: "idle",
      category: "window",
      label: "Jendela Panoramik (Lt. 1)",
      floor: 1,
    },

    // === LANTAI 2 (Mezzanine Floor, y = 3.6) ===
    // Mezzanine Glass Balcony Overlook (Leaning on railing looking at Floor 1)
    {
      id: "mezzanine-balcony-left",
      x: -6.5,
      z: 0.5,
      y: 3.6,
      faceAngle: 0, // Looking forward over balcony
      actionState: "idle",
      category: "balcony",
      label: "Balkon Kaca Mezzanine (Lt. 2)",
      floor: 2,
    },
    {
      id: "mezzanine-balcony-right",
      x: -2.0,
      z: 0.5,
      y: 3.6,
      faceAngle: 0,
      actionState: "idle",
      category: "balcony",
      label: "Balkon Kaca Mezzanine (Lt. 2)",
      floor: 2,
    },
    // Large Wall Whiteboard Kanban (Floor 2)
    {
      id: "whiteboard-kanban",
      x: -9.8,
      z: -3.5,
      y: 3.6,
      faceAngle: -Math.PI / 2,
      actionState: "interact-right",
      category: "whiteboard",
      label: "Papan Kanban Strategis (Lt. 2)",
      floor: 2,
    },
    // Architecture Bookshelf & Archives (Floor 2)
    {
      id: "bookshelf-floor2",
      x: -6.0,
      z: -6.6,
      y: 3.6,
      faceAngle: Math.PI,
      actionState: "idle",
      category: "bookshelf",
      label: "Rak Dokumen & Arsitektur (Lt. 2)",
      floor: 2,
    },
  ];

  // Also allow visiting colleague desks on the same floor
  const colleagueDesks = Object.entries(DESK_POS_3D)
    .filter(([r]) => r !== role)
    .map(([colleague, [dx, dy, dz]]) => {
      const fl: 1 | 2 = dy > 1.0 ? 2 : 1;
      return {
        id: `visit-${colleague}`,
        x: dx + 0.85,
        z: dz + 0.5,
        y: dy,
        faceAngle: -Math.PI / 2,
        actionState: "interact-right" as const,
        category: "wander" as const,
        label: `Diskusi dengan ${colleague.toUpperCase()} (Lt. ${fl})`,
        floor: fl,
      };
    });

  return [...spots, ...colleagueDesks];
}

// Dialogues for all 8 roles
export const AGENT_DIALOGUES: Record<string, Record<string, string[]>> = {
  pm: {
    dev: ["Sprint target kita deploy modul invoice!", "Prioritaskan PR rekonsiliasi GL ya!"],
    qa: ["Risko, ada bug regression di PR terbaru?", "Pastikan guard baseline tetap 11 ya!"],
    analyst: ["Lulu, bagaimana audit saldo historis O11?", "Semua trade account aman zero-diff!"],
    devops: ["Bimo, cluster staging siap untuk deploy?", "Monitor resource usage saat migration!"],
    whiteboard: ["Menyusun prioritas sprint 42 📋", "Update milestone Odoo 19 di board..."],
    balcony: ["Memantau suasana kerja tim dari balkon 🏢", "Tim engineering solid di lantai 1!"],
    sofa: ["Brainstorming roadmap di sofa lounge 🛋️"],
    window: ["Melihat langit kota yang megah dari kantor 🌆"],
    desk: ["Mengkoordinasi task & approval pipeline...", "Review requirement klien & milestone..."],
  },
  dev: {
    qa: ["Risko, diff PR #108 siap ditest!", "Test unit-nya udah gua update!"],
    dba: ["Deni, query balance move_line-nya udah di-index kan?"],
    devops: ["Bimo, container app sudah siap dibuild!"],
    coffee: ["Bikin espresso dulu biar coding lancar ☕", "Double shot espresso for peak performance!"],
    waterCooler: ["Minum air putih dingin seger 💧"],
    whiteboard: ["Pindahkan task ke 'Code Review' 🚀"],
    sofa: ["Chilling sejenak sambil mikir algoritma 💡"],
    window: ["Pemandangan luar jendela bikin rileks ✨"],
    desk: ["Writing clean code in VS Code 💻", "Refactoring migration logic..."],
  },
  qa: {
    dev: ["Pingot, PR #108 lolos semua test suite!", "Aman! Zero-diff GL vs Aging terkonfirmasi ✔"],
    security: ["Bagas, audit iron rules sudah hijau semua!"],
    waterCooler: ["Rehat sejenak setelah running automated test 💧"],
    whiteboard: ["Memeriksa checklist QA sebelum rilis 📋"],
    meeting: ["Review hasil test coverage di meja meeting 📊"],
    desk: ["Running automated test suites 🧪", "Verifying edge cases & diff..."],
  },
  analyst: {
    pm: ["Zaki, analisa selisih data historis tuntas!", "Balance Sheet 2021 cocok 100%!"],
    dba: ["Deni, struktur tabel O19 sudah sinkron dengan O11."],
    bookshelf: ["Membaca dokumentasi arsitektur Odoo 📚"],
    balcony: ["Menganalisis performa data dari balkon 📈"],
    desk: ["Auditing accounting ledger records 🗄️", "Verifying journal entries consistency..."],
  },
  devops: {
    dev: ["Pingot, build Docker image selesai dalam 42 detik!"],
    dba: ["Deni, volume persistent Postgres sudah di-backup."],
    desk: ["Monitoring Kubernetes cluster & Traefik SSL 🐳", "Optimizing container CPU & memory..."],
    coffee: ["Espresso break sejenak sebelum maintenance ☕"],
    waterCooler: ["Isi ulang botol minum di galon 💧"],
  },
  dba: {
    dev: ["Query query plan sudah optimal dengan index baru!"],
    analyst: ["Tabel account_move_line sudah terverifikasi double-entry."],
    desk: ["Running VACUUM ANALYZE & audit index 🗄️", "Verifying foreign key constraints..."],
    meeting: ["Diskusi kapasitas penyimpanan database di meja rapat."],
    waterCooler: ["Ambil air sejuk dulu biar fokus 💧"],
  },
  security: {
    pm: ["Zaki, Balance Guard check baseline 11 valid & locked!"],
    qa: ["Semua akses endpoint JSON-RPC aman dan tervalidasi."],
    balcony: ["Patroli integritas sistem dari lantai 2 🛡️"],
    whiteboard: ["Checklist Iron Rules: 4/4 Enforced 🔒"],
    desk: ["Scanning security vulnerabilities & token leaks 🛡️", "Auditing permission and credentials..."],
  },
  designer: {
    pm: ["Zaki, desain command center 2 lantai sudah siap!"],
    dev: ["Pingot, token desain & CSS sudah diekspor ke Tailwind."],
    balcony: ["Mencari inspirasi visual dari balkon kaca 🎨"],
    sofa: ["Sketching wireframe baru di iPad ✏️"],
    desk: ["Crafting isometric UI components in Figma 🎨", "Polishing design system & colors..."],
  },
};

export function getRandomDialogue(role: string, context: string): string {
  const rolePool = AGENT_DIALOGUES[role] || AGENT_DIALOGUES.dev;
  const list = rolePool[context] || rolePool.desk || ["Fokus kerja 🚀"];
  return list[Math.floor(Math.random() * list.length)];
}

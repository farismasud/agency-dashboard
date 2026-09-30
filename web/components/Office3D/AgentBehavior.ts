"use client";

import { DESK_POS } from "./layout";

export interface OfficeSpot {
  id: string;
  x: number;
  z: number;
  y: number; // 0 for standing/floor, 0.38 for chair, 0.24 for sofa
  faceAngle: number;
  actionState: "sit" | "idle" | "interact-right" | "interact-left";
  category: "desk" | "sofa" | "whiteboard" | "waterCooler" | "bookshelf" | "window" | "plant" | "wander";
  label: string;
}

// Ergonomic chair seat height: 0.38
// Lounge sofa seat height: 0.24
export function getDeskSpot(role: string): OfficeSpot {
  const desk = DESK_POS[role] ?? [-4, -2];
  return {
    id: `desk-${role}`,
    x: desk[0],
    z: desk[1] + 0.65, // Exact chair center
    y: 0.38, // Elevated onto chair cushion
    faceAngle: Math.PI, // Facing desk/monitor
    actionState: "sit",
    category: "desk",
    label: "Meja Kerja",
  };
}

export function getRandomOfficeSpots(role: string): OfficeSpot[] {
  const ownDesk = getDeskSpot(role);

  return [
    ownDesk,
    // Break Lounge Sofa (sitting on cushions)
    {
      id: "sofa-left",
      x: 4.25,
      z: 3.0,
      y: 0.24, // On sofa cushion
      faceAngle: 0,
      actionState: "sit",
      category: "sofa",
      label: "Sofa Santai",
    },
    {
      id: "sofa-right",
      x: 4.95,
      z: 3.0,
      y: 0.24, // On sofa cushion
      faceAngle: 0,
      actionState: "sit",
      category: "sofa",
      label: "Sofa Santai",
    },
    // Water Cooler
    {
      id: "water-cooler",
      x: 6.35,
      z: 2.85,
      y: 0,
      faceAngle: -Math.PI / 2,
      actionState: "interact-left",
      category: "waterCooler",
      label: "Galon Air",
    },
    // Whiteboard Kanban
    {
      id: "whiteboard-todo",
      x: -7.6,
      z: -1.6,
      y: 0,
      faceAngle: -Math.PI / 2,
      actionState: "interact-right",
      category: "whiteboard",
      label: "Papan Kanban",
    },
    {
      id: "whiteboard-progress",
      x: -7.6,
      z: -0.8,
      y: 0,
      faceAngle: -Math.PI / 2,
      actionState: "interact-right",
      category: "whiteboard",
      label: "Papan Kanban",
    },
    // Bookshelf
    {
      id: "bookshelf",
      x: -4.5,
      z: -4.6,
      y: 0,
      faceAngle: Math.PI,
      actionState: "idle",
      category: "bookshelf",
      label: "Rak Buku",
    },
    // Panoramic Window (Looking at Moon & Stars)
    {
      id: "window-view",
      x: 2.6,
      z: -4.6,
      y: 0,
      faceAngle: Math.PI,
      actionState: "idle",
      category: "window",
      label: "Jendela Bulan",
    },
    {
      id: "window-view-2",
      x: 4.2,
      z: -4.6,
      y: 0,
      faceAngle: Math.PI,
      actionState: "idle",
      category: "window",
      label: "Jendela Bintang",
    },
    // Indoor Plant Corner
    {
      id: "plant-left",
      x: -6.8,
      z: -4.0,
      y: 0,
      faceAngle: -Math.PI / 4,
      actionState: "idle",
      category: "plant",
      label: "Sudut Tanaman",
    },
    // Open Area Wandering
    {
      id: "open-center",
      x: 0.5,
      z: 0.5,
      y: 0,
      faceAngle: Math.PI / 3,
      actionState: "idle",
      category: "wander",
      label: "Area Tengah",
    },
    {
      id: "open-front",
      x: -1.8,
      z: 3.2,
      y: 0,
      faceAngle: -Math.PI / 6,
      actionState: "idle",
      category: "wander",
      label: "Koridor Depan",
    },
    // Visiting Colleagues' Desks (Standing beside them)
    ...(["pm", "dev", "qa", "analyst"]
      .filter((r) => r !== role)
      .map((colleague) => {
        const desk = DESK_POS[colleague] ?? [0, 0];
        return {
          id: `visit-${colleague}`,
          x: desk[0] + 0.85,
          z: desk[1] + 0.5,
          y: 0,
          faceAngle: -Math.PI / 2,
          actionState: "interact-right" as const,
          category: "wander" as const,
          label: `Diskusi dengan ${colleague.toUpperCase()}`,
        };
      })),
  ];
}

// Agency dialogue lines for inter-agent interactions
export const AGENT_DIALOGUES: Record<string, Record<string, string[]>> = {
  pm: {
    dev: [
      "Pingot, modul invoice siap dideploy?",
      "Sprint ini target selesai sebelum Jumat ya!",
      "Prioritaskan PR rekonsiliasi GL dulu ya!",
    ],
    qa: [
      "Risko, ada bug regression di PR terbaru?",
      "Tolong pastikan balance guard tetap 11 ya!",
    ],
    analyst: [
      "Lulu, bagaimana audit saldo historis O11?",
      "Bagus, 5 trade account sudah zero diff!",
    ],
    whiteboard: [
      "Menyusun prioritas sprint berikutnya 📋",
      "Update milestone roadmap di board...",
    ],
    waterCooler: [
      "Ngopi dulu sambil mantau sprint ☕",
      "Ambil air dingin, meeting seharian 💧",
    ],
    sofa: [
      "Brainstorming roadmap di sofa 🛋️",
      "Rehat sejenak sebelum sprint review...",
    ],
    window: [
      "Melihat bulan purnama di luar jendela 🌕",
      "Malam tenang, sprint on track! ✨",
    ],
    desk: [
      "Mengkoordinasi task & roadmap...",
      "Review PR & approval pipeline...",
    ],
  },
  dev: {
    qa: [
      "Risko, tolong review diff PR #108 ya!",
      "Test unit-nya udah gua update, monggo dicek!",
    ],
    pm: [
      "Zaki, logic partial reconcile udah beres!",
      "Branch feature siap dimerge ke staging!",
    ],
    analyst: [
      "Lulu, field account_id di O19 udah dipetakan?",
      "Query SQL-nya udah net 0 ya!",
    ],
    whiteboard: [
      "Cek backlog ticket yang belum diambil 🔍",
      "Pindahkan task ke 'Code Review' 🚀",
    ],
    waterCooler: [
      "Isi bensin kopi dulu biar coding lancar ☕",
      "Minum air putih dingin seger banget 💧",
    ],
    sofa: [
      "Chilling sejenak sambil mikir algoritma 💡",
      "Diskusi santai refactoring kode...",
    ],
    window: [
      "Bintang di langit malam keren banget 🌟",
      "Ngoding larut malam ditemani bulan 🌕",
    ],
    desk: [
      "Writing clean code in VS Code 💻",
      "Refactoring business logic...",
    ],
  },
  qa: {
    dev: [
      "Pingot, PR #108 lolos semua test suite!",
      "Aman! Zero diff GL vs Aging terkonfirmasi ✔",
    ],
    pm: [
      "Zaki, guard check baseline 11 valid!",
      "Regression test hijau semua!",
    ],
    analyst: [
      "Lulu, data test sudah sesuai ledger!",
    ],
    waterCooler: [
      "Rehat sejenak setelah running test suite 💧",
      "Ambil air minum sambil nunggu CI build...",
    ],
    whiteboard: [
      "Memeriksa checklist QA sebelum rilis 📋",
      "Semua test case bertanda hijau ✅",
    ],
    sofa: [
      "Duduk santai di sofa, build hijau semua ✨",
    ],
    window: [
      "Pemandangan malam yang indah dari kantor 🌃",
    ],
    desk: [
      "Running automated test suites 🧪",
      "Verifying edge cases & diff...",
    ],
  },
  analyst: {
    pm: [
      "Zaki, analisa selisih data historis sudah siap!",
      "Semua akun dagang sudah 100% tally!",
    ],
    dev: [
      "Pingot, ini referensi field legacy dari O11 ya.",
      "Struktur data O19 sudah sinkron 100%.",
    ],
    whiteboard: [
      "Memetakan ERD & diagram relasi tabel...",
      "Menganalisis skema O11 vs O19 📊",
    ],
    bookshelf: [
      "Membaca dokumentasi arsitektur sistem 📚",
      "Mengecek kamus data referensi...",
    ],
    waterCooler: [
      "Minum air putih dulu biar fokus 💧",
    ],
    sofa: [
      "Membaca report ringkasan di sofa 🛋️",
    ],
    window: [
      "Inspirasi analisis datang di malam hari 🌕",
    ],
    desk: [
      "Investigating database records 🗄️",
      "Auditing accounting ledger...",
    ],
  },
};

export function getRandomDialogue(role: string, context: string): string {
  const rolePool = AGENT_DIALOGUES[role] || AGENT_DIALOGUES.dev;
  const list = rolePool[context] || rolePool.desk || ["Fokus kerja 🚀"];
  return list[Math.floor(Math.random() * list.length)];
}

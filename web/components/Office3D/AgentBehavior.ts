"use client";

import { DESK_POS_3D, FLOOR2_Y, floorY } from "./layout";

export type SpotCategory =
  | "desk"
  | "sofa"
  | "tv"
  | "whiteboard"
  | "waterCooler"
  | "bookshelf"
  | "window"
  | "coffee"
  | "balcony"
  | "meeting"
  | "game"
  | "server"
  | "wander";

type XZ = [number, number];

export interface OfficeSpot {
  id: string;
  x: number;
  z: number;
  floor: 1 | 2;
  faceAngle: number;
  category: SpotCategory;
  label: string;
  // Approach waypoints on the spot's floor. via[0] always lies on that floor's
  // corridor line (z = 1.8 on Lt.1, z = 1.0 on Lt.2), so any two spots on the
  // same floor connect with a straight, obstacle-free corridor segment.
  via: XZ[];
  talkTo?: string;
}

export interface NavWaypoint {
  x: number;
  y: number;
  z: number;
  isStair?: boolean;
}

const PI = Math.PI;
const faceTowards = (fromX: number, fromZ: number, toX: number, toZ: number) => Math.atan2(toX - fromX, toZ - fromZ);

const DESK_VIA: Record<string, XZ[]> = {
  dev: [[-5, 1.8], [-5, -2.1], [-6.5, -2.1]],
  qa: [[-5, 1.8], [-5, -2.1], [-3.5, -2.1]],
  devops: [[-6.5, 1.8]],
  dba: [[-3.5, 1.8]],
  pm: [[-4, 1], [-4, -3.1], [-5.5, -3.1]],
  analyst: [[-4, 1], [-4, -3.1], [-2.5, -3.1]],
  security: [[-5.5, 1]],
  designer: [[-2.5, 1]],
};

const floorOfY = (y: number): 1 | 2 => (y > 1 ? 2 : 1);

export function getDeskSpot(role: string): OfficeSpot {
  const [dx, dy, dz] = DESK_POS_3D[role] ?? DESK_POS_3D.dev;
  const floor = floorOfY(dy);
  return {
    id: `desk-${role}`,
    x: dx,
    z: dz + 0.65,
    floor,
    faceAngle: PI,
    category: "desk",
    label: `Meja ${role.toUpperCase()} (Lt. ${floor})`,
    via: DESK_VIA[role] ?? DESK_VIA.dev,
  };
}

const TV_X = 5.5;
const TV_Z = -7;

const SHARED_SPOTS: OfficeSpot[] = [
  // ===== LANTAI 1 =====
  { id: "window-f1", x: -9.2, z: -5.2, floor: 1, faceAngle: -PI / 2, category: "window", label: "Jendela Engineering (Lt. 1)", via: [[-8, 1.8], [-8, -5.2]] },
  { id: "server-rack", x: -0.8, z: -5.8, floor: 1, faceAngle: PI, category: "server", label: "Server Rack (Lt. 1)", via: [[0.5, 1.8], [0.5, -5.8]] },
  ...[5, 6, 7].map((x, i): OfficeSpot => ({
    id: `meeting-front-${i}`, x, z: -3.35, floor: 1, faceAngle: PI, category: "meeting", label: "Ruang Rapat (Lt. 1)",
    via: [[2.8, 1.8], [2.8, -2.4], [x, -2.4]],
  })),
  ...[5, 6, 7].map((x, i): OfficeSpot => ({
    id: `meeting-back-${i}`, x, z: -5.05, floor: 1, faceAngle: 0, category: "meeting", label: "Ruang Rapat (Lt. 1)",
    via: [[2.8, 1.8], [2.8, -2.4], [3.6, -5.9], [x, -5.9]],
  })),
  { id: "coffee-bar", x: 8.3, z: 0.15, floor: 1, faceAngle: PI, category: "coffee", label: "Pantry Espresso (Lt. 1)", via: [[8.3, 1.8]] },
  { id: "water-cooler", x: 8.95, z: 3.2, floor: 1, faceAngle: PI / 2, category: "waterCooler", label: "Dispenser Air (Lt. 1)", via: [[8.95, 1.8]] },
  { id: "pantry-table-a", x: 5.45, z: 0.2, floor: 1, faceAngle: PI / 2, category: "coffee", label: "Meja Bar Pantry (Lt. 1)", via: [[5.45, 1.8]] },
  { id: "pantry-table-b", x: 6.55, z: 0.2, floor: 1, faceAngle: -PI / 2, category: "coffee", label: "Meja Bar Pantry (Lt. 1)", via: [[6.55, 1.8]] },
  { id: "lobby-sofa-a", x: 2.45, z: 5.0, floor: 1, faceAngle: PI / 2, category: "sofa", label: "Sofa Lobby (Lt. 1)", via: [[3.4, 1.8], [3.4, 5.0]] },
  { id: "lobby-sofa-b", x: 2.45, z: 5.8, floor: 1, faceAngle: PI / 2, category: "sofa", label: "Sofa Lobby (Lt. 1)", via: [[3.4, 1.8], [3.4, 5.8]] },
  { id: "reception", x: 7.2, z: 4.1, floor: 1, faceAngle: 0, category: "wander", label: "Resepsionis (Lt. 1)", via: [[7.2, 1.8]] },
  { id: "entrance", x: 4.8, z: 6.3, floor: 1, faceAngle: 0, category: "window", label: "Pintu Masuk (Lt. 1)", via: [[4.8, 1.8]] },

  // ===== LANTAI 2 =====
  { id: "whiteboard", x: -9.2, z: -3, floor: 2, faceAngle: -PI / 2, category: "whiteboard", label: "Papan Kanban (Lt. 2)", via: [[-7.2, 1], [-7.2, -3]] },
  { id: "bookshelf", x: -8, z: -6.3, floor: 2, faceAngle: PI, category: "bookshelf", label: "Rak Arsip (Lt. 2)", via: [[-7.2, 1], [-7.2, -6.3]] },
  ...[4.7, 5.5, 6.3].map((x, i): OfficeSpot => ({
    id: `tv-sofa-${i}`, x, z: -2.35, floor: 2, faceAngle: PI, category: "tv", label: "Lounge TV (Lt. 2)",
    via: [[2.5, 1], [2.5, -3.2], [x, -3.2]],
  })),
  { id: "beanbag-l", x: 3.2, z: -4.6, floor: 2, faceAngle: faceTowards(3.2, -4.6, TV_X, TV_Z), category: "tv", label: "Beanbag Lounge (Lt. 2)", via: [[2.5, 1], [2.5, -3.2], [3.2, -3.2]] },
  { id: "beanbag-r", x: 7.8, z: -4.6, floor: 2, faceAngle: faceTowards(7.8, -4.6, TV_X, TV_Z), category: "tv", label: "Beanbag Lounge (Lt. 2)", via: [[2.5, 1], [2.5, -3.2], [7.8, -3.2]] },
  { id: "arcade", x: 8.6, z: -5.6, floor: 2, faceAngle: PI / 2, category: "game", label: "Mesin Arcade (Lt. 2)", via: [[2.5, 1], [2.5, -3.2], [8.6, -3.2]] },
  { id: "pingpong-a", x: -4.9, z: 4.2, floor: 2, faceAngle: PI / 2, category: "game", label: "Meja Ping Pong (Lt. 2)", via: [[-4.9, 1]] },
  { id: "pingpong-b", x: -1.1, z: 4.2, floor: 2, faceAngle: -PI / 2, category: "game", label: "Meja Ping Pong (Lt. 2)", via: [[-1.1, 1]] },
  { id: "terrace-1", x: 6, z: 6.4, floor: 2, faceAngle: 0, category: "balcony", label: "Rooftop Terrace (Lt. 2)", via: [[2.5, 1], [2.5, 4.5], [6, 4.5]] },
  { id: "terrace-2", x: 8.6, z: 6.4, floor: 2, faceAngle: 0, category: "balcony", label: "Rooftop Terrace (Lt. 2)", via: [[2.5, 1], [2.5, 4.5], [8.6, 4.5]] },
];

export function getOfficeSpots(role: string): OfficeSpot[] {
  const visits = Object.keys(DESK_POS_3D)
    .filter((colleague) => colleague !== role)
    .map((colleague): OfficeSpot => {
      const desk = getDeskSpot(colleague);
      return {
        id: `visit-${colleague}`,
        x: desk.x + 0.95,
        z: desk.z - 0.2,
        floor: desk.floor,
        faceAngle: -PI / 2,
        category: "wander",
        label: `Diskusi dengan ${colleague.toUpperCase()} (Lt. ${desk.floor})`,
        via: desk.via,
        talkTo: colleague,
      };
    });
  return [...SHARED_SPOTS, ...visits];
}

// ---- Seat reservation: stops two agents from sitting on the same cushion ----
const claimedSpots = new Map<string, string>(); // spotId -> role

export function claimSpot(role: string, spot: OfficeSpot) {
  for (const [id, owner] of claimedSpots) if (owner === role) claimedSpots.delete(id);
  if (!spot.id.startsWith("visit-")) claimedSpots.set(spot.id, role);
}

export function pickNextSpot(role: string, working: boolean, current: OfficeSpot): OfficeSpot {
  const desk = getDeskSpot(role);
  if (current.id !== desk.id && Math.random() < (working ? 0.7 : 0.25)) return desk;
  const options = getOfficeSpots(role).filter((s) => {
    const owner = claimedSpots.get(s.id);
    return s.id !== current.id && (!owner || owner === role);
  });
  return options[Math.floor(Math.random() * options.length)] ?? desk;
}

// ---- Navigation: spot -> corridor -> (stairs) -> corridor -> spot ----
const STAIRS_UP: NavWaypoint[] = [
  { x: -7.5, y: 0, z: 1.8 },
  { x: -7.5, y: 0, z: 6.5 },
  { x: -8.8, y: 0, z: 6.5 },
  { x: -8.8, y: 0, z: 6.15 },
  { x: -8.8, y: FLOOR2_Y, z: 1.6, isStair: true },
  { x: -8.8, y: FLOOR2_Y, z: 1.0 },
  { x: -7.2, y: FLOOR2_Y, z: 1.0 },
];
const STAIRS_DOWN: NavWaypoint[] = [
  { x: -7.2, y: FLOOR2_Y, z: 1.0 },
  { x: -8.8, y: FLOOR2_Y, z: 1.0 },
  { x: -8.8, y: FLOOR2_Y, z: 1.6 },
  { x: -8.8, y: 0, z: 6.15, isStair: true },
  { x: -8.8, y: 0, z: 6.5 },
  { x: -7.5, y: 0, z: 6.5 },
  { x: -7.5, y: 0, z: 1.8 },
];

export function buildPath(from: OfficeSpot, to: OfficeSpot): NavWaypoint[] {
  const leg = (spot: OfficeSpot, pts: XZ[]) => pts.map(([x, z]) => ({ x, y: floorY(spot.floor), z }));
  const path: NavWaypoint[] = [...leg(from, [...from.via].reverse())];
  if (from.floor !== to.floor) path.push(...(from.floor === 1 ? STAIRS_UP : STAIRS_DOWN));
  path.push(...leg(to, [...to.via, [to.x, to.z]]));
  return path;
}

// ---- Dialogue ----
const GENERIC_DIALOGUES: Record<string, string[]> = {
  tv: ["Nonton Liga Kantor dulu ⚽", "Gol!! Siapa yang cetak? 📺", "Berita agensi hari ini seru juga 📰", "Lo-fi beats biar chill 🎵"],
  game: ["Satu ronde lagi! 🏓", "Rekor high-score baru 🕹️", "Smash! Poin buat gua 🏓"],
  server: ["Cek suhu server rack 🌡️", "LED hijau semua, aman ✅"],
  balcony: ["Cari angin di rooftop 🌤️", "Pemandangan kota dari terrace ✨"],
  window: ["Lihat suasana luar sebentar 🌆"],
  coffee: ["Ngopi dulu ☕", "Ngobrol santai di pantry ☕"],
  waterCooler: ["Minum air biar fokus 💧"],
  sofa: ["Duduk santai sebentar 🛋️"],
  meeting: ["Sync singkat di ruang rapat 📊"],
  bookshelf: ["Baca dokumentasi arsitektur 📚"],
  whiteboard: ["Update papan kanban 📋"],
  wander: ["Nyapa tim sebentar 👋"],
};

export const AGENT_DIALOGUES: Record<string, Record<string, string[]>> = {
  pm: {
    dev: ["Sprint target kita deploy modul invoice!", "Prioritaskan PR rekonsiliasi GL ya!"],
    qa: ["Risko, ada bug regression di PR terbaru?", "Pastikan guard baseline tetap 11 ya!"],
    analyst: ["Lulu, bagaimana audit saldo historis O11?", "Semua trade account aman zero-diff!"],
    devops: ["Bimo, cluster staging siap untuk deploy?", "Monitor resource usage saat migration!"],
    whiteboard: ["Menyusun prioritas sprint 42 📋", "Update milestone Odoo 19 di board..."],
    tv: ["Nonton bola sambil mikir roadmap ⚽"],
    desk: ["Mengkoordinasi task & approval pipeline...", "Review requirement klien & milestone..."],
  },
  dev: {
    qa: ["Risko, diff PR #108 siap ditest!", "Test unit-nya udah gua update!"],
    dba: ["Deni, query balance move_line-nya udah di-index kan?"],
    devops: ["Bimo, container app sudah siap dibuild!"],
    coffee: ["Bikin espresso dulu biar coding lancar ☕", "Double shot espresso for peak performance!"],
    game: ["Ping pong dulu, otak butuh reboot 🏓"],
    desk: ["Writing clean code in VS Code 💻", "Refactoring migration logic..."],
  },
  qa: {
    dev: ["Pingot, PR #108 lolos semua test suite!", "Aman! Zero-diff GL vs Aging terkonfirmasi ✔"],
    security: ["Bagas, audit iron rules sudah hijau semua!"],
    meeting: ["Review hasil test coverage di meja meeting 📊"],
    desk: ["Running automated test suites 🧪", "Verifying edge cases & diff..."],
  },
  analyst: {
    pm: ["Zaki, analisa selisih data historis tuntas!", "Balance Sheet 2021 cocok 100%!"],
    dba: ["Deni, struktur tabel O19 sudah sinkron dengan O11."],
    desk: ["Auditing accounting ledger records 🗄️", "Verifying journal entries consistency..."],
  },
  devops: {
    dev: ["Pingot, build Docker image selesai dalam 42 detik!"],
    dba: ["Deni, volume persistent Postgres sudah di-backup."],
    server: ["Ganti kabel patch di rack 🔌", "Cluster sehat, uptime 42 hari 🐳"],
    desk: ["Monitoring Kubernetes cluster & Traefik SSL 🐳", "Optimizing container CPU & memory..."],
  },
  dba: {
    dev: ["Query plan sudah optimal dengan index baru!"],
    analyst: ["Tabel account_move_line sudah terverifikasi double-entry."],
    meeting: ["Diskusi kapasitas penyimpanan database di meja rapat."],
    desk: ["Running VACUUM ANALYZE & audit index 🗄️", "Verifying foreign key constraints..."],
  },
  security: {
    pm: ["Zaki, Balance Guard check baseline 11 valid & locked!"],
    qa: ["Semua akses endpoint JSON-RPC aman dan tervalidasi."],
    balcony: ["Patroli integritas sistem dari rooftop 🛡️"],
    whiteboard: ["Checklist Iron Rules: 4/4 Enforced 🔒"],
    desk: ["Scanning security vulnerabilities & token leaks 🛡️", "Auditing permission and credentials..."],
  },
  designer: {
    pm: ["Zaki, desain command center 2 lantai sudah siap!"],
    dev: ["Pingot, token desain & CSS sudah diekspor ke Tailwind."],
    balcony: ["Cari inspirasi visual di rooftop 🎨"],
    tv: ["Sketching wireframe sambil nonton ✏️"],
    desk: ["Crafting isometric UI components in Figma 🎨", "Polishing design system & colors..."],
  },
};

export function getRandomDialogue(role: string, context: string): string {
  const rolePool = AGENT_DIALOGUES[role] ?? AGENT_DIALOGUES.dev;
  const list = rolePool[context] ?? GENERIC_DIALOGUES[context] ?? rolePool.desk ?? ["Fokus kerja 🚀"];
  return list[Math.floor(Math.random() * list.length)];
}

// Turns backend feed events into "go here, say this" directives for the 3D agents.
// Kept free of runtime imports so `node activity.check.ts` can exercise it directly.
import type { FeedEvent } from "@/lib/types";

// spotId is an OfficeSpot id (see AgentBehavior.ts) or "break" = any free relax spot.
export interface Activity {
  spotId: string;
  text: string;
}

export interface AgentDirective extends Activity {
  key: number;
}

// Tool → where the agent goes. Unlisted tools fall back to their desk.
const CHATTER_VARIANTS: Record<string, string[]> = {
  dev_write: [
    "✍️ Ngetik kode, minimalis tanpa overengineering",
    "💻 Lagi bedah bug di fungsi inti",
    "⚡ Refactor dikit biar lebih clean dan ringkas",
    "🔨 Nambahin unit test sebelum commit",
    "🧼 Bersihin orphan import & dead code",
    "🧩 Ngerangkai logika baru sesuai spesifikasi PM",
    "⚙️ Nambal logic error, ga usah bikin class baru",
    "🧪 Nulis assert sederhana buat ngetes fungsi",
    "📐 Rapihin struktur file biar ga bloated",
    "🎯 Fix tuntas satu fungsi, ga senggol file lain",
  ],
  dev_read: [
    "🔎 Cek alur fungsi dan dependensi",
    "📖 Membaca codebase biar ga salah senggol",
    "🧐 Analisis struktur data dan tipe TypeScript",
    "🔍 Nelusuri jejak eksekusi dari input ke output",
    "👀 Cek kontrak API di modul seberang",
    "📑 Baca implementasi lama sebelum diubah",
    "🧭 Orientasi arsitektur pakai referensi resmi",
    "🔬 Teliti edge case di data flow",
    "💡 Pahami logika bisnis sebelum ketik apa pun",
    "📜 Cek riwayat perubahan di git log",
  ],
  qa: [
    "🧪 Menjalankan test suite lokal...",
    "🔍 Sisir diff: nyari edge case yang jebol",
    "📋 Validasi input boundary & linting",
    "🛡️ Pastiin ga ada regresi sebelum merge",
    "🚦 Eksekusi automated web check via Playwright",
    "💥 Coba lempar payload aneh, tahan banting ga?",
    "🕵️ Audit console error dan network fail",
    "📊 Verifikasi apakah kriteria sukses terpenuhi",
    "🚨 Ada error nyempil nih, balikin ke dev!",
    "✅ Semua skenario hijau, lulus uji fakta",
  ],
  trader: [
    "📈 Pantau orderbook & volume flow IHSG",
    "📊 Analisis candlestick BTC & resistance level",
    "⚖️ Hitung risk/reward ratio sebelum entry",
    "📉 Setup stop-loss aman, modal tetap terjaga",
    "💹 IHSG sideways, fokus scalping ticker likuid",
    "🕯️ Breakout konfirmasi volume gede, siap eksekusi",
    "🪙 Cek funding rate & open interest crypto",
    "🎯 Entry bertahap, disiplin ga fomo",
    "🛡️ Risk limit harian tercapai, amankan floating profit",
    "📉 Tarik garis Fibonacci retracement di chart H4",
  ],
  finance: [
    "💰 Rekonsiliasi jurnal double-entry & GL",
    "📑 Audit pembukuan & aging AR/AP",
    "🧮 Cek kalkulasi pajak & pembulatan valuta",
    "📊 Sinkronisasi neraca saldo dengan sub-ledger",
    "🧾 Verifikasi invoice masuk vs bukti potong",
    "🔍 Cek selisih pencatatan kas kecil",
    "⚖️ Pastiin debit dan kredit balance sempurna",
    "📈 Hitung realisasi cashflow kuartal ini",
    "🛡️ Pastikan audit trail ERP tidak terputus",
    "📋 Rekonsiliasi mutasi rekening koran",
  ],
  devops: [
    "🖥️ Build container multi-stage, pantau RAM",
    "⚙️ Cek status service Docker & volume",
    "🚀 Verifikasi healthcheck deployment",
    "🔒 Audit environment variable, no secret leaks",
    "📦 Kompres docker image layer biar ramping",
    "🔄 Validasi pipeline CI/CD lokal",
    "🛡️ Hardening user permission di container",
    "📉 Pantau resource limit & OOM killer",
    "🧩 Cek kompatibilitas docker-compose",
    "✅ Service up & running di port lokal",
  ],
  infra: [
    "🌡️ Monitor suhu CPU & VRAM Omarchy",
    "🌐 Inspeksi routing jaringan & DNS lokal",
    "💾 Verifikasi backup snapshot storage",
    "⚡ Cek status driver GPU dual-system",
    "🧹 Bersihkan zombie process di sistem",
    "📶 Uji latensi gateway lokal & DNS lookup",
    "🔌 Monitor konsumsi daya & throttled cores",
    "🛠️ Cek status user systemd service",
    "📦 Pastikan disk space root masih lega",
    "🛡️ Audit open ports & firewall rules",
  ],
  scribe: [
    "📝 Sinkronkan catatan penting ke Obsidian Vault",
    "🕸️ Perbarui graf wikilinks di Graphify",
    "📚 Rapikan dokumentasi arsitektur",
    "💡 Abadikan lessons learned sesi barusan",
    "🗂️ Tautkan catatan baru ke index Knowledge/",
    "🧹 Bersihkan catatan usang biar graf ga berantakan",
    "📑 Tulis ADR ringkas buat keputusan sistem",
    "🧠 Hubungkan konsep baru dengan note terdahulu",
    "✨ Polish format markdown anti-slop",
    "📖 Catat alur troubleshooting biar ga lupa besok",
  ],
  uiux: [
    "🎨 Poles responsive layout & spacing Tailwind",
    "📐 Cek hierarki visual & aksesibilitas warna",
    "✨ Halusin micro-interaction di UI",
    "📱 Uji viewport mobile vs layar ultrawide",
    "🔤 Pastikan font scaling & leading proporsional",
    "👁️ Cek kontras teks di dark mode",
    "🧱 Susun grid layout biar rapi dan clean",
    "🚫 Buang margin/padding liar yang bikin layout shift",
    "🪄 Rapikan animasi transisi biar ga patah-patah",
    "👌 Pastiin tombol & form gampang di-tap",
  ],
  pm: [
    "📋 Pecah scope fitur jadi task konkret",
    "🧭 Atur prioritas antrian kerja di orch",
    "🎯 Jaga batasan scope biar ga melebar ke mana-mana",
    "⏳ Estimasi dependensi antar-role",
    "🧩 Klarifikasi kriteria 'done' sebelum jalan",
    "🚫 Tolak fitur spekulatif: YAGNI!",
    "🚦 Pantau kelancaran pipeline tim",
    "📌 Review progress milestone di roadmap",
    "🤝 Pastiin handoff antar agent mulus",
    "📝 Rumuskan task baru dengan kriteria uji jelas",
  ],
  analyst: [
    "🌐 Riset dokumentasi & studi kelayakan",
    "💡 Petakan kebutuhan arsitektur baru",
    "🔬 Bedah referensi sistem legacy",
    "📊 Kumpulkan data dukung sebelum ambil keputusan",
    "🧐 Identifikasi potensi bottleneck sistem",
    "🗺️ Bikin diagram alur data sederhana",
    "🔎 Cek edge case yang mungkin luput dari PM",
    "⚖️ Bandingkan trade-off dua alternatif solusi",
    "📑 Rangkum fakta teknis tanpa asumsi liar",
    "🧭 Klarifikasi kebutuhan non-fungsional",
  ],
};

function pickVariant(category: string, fallback: string): string {
  const pool = CHATTER_VARIANTS[category];
  if (!pool || pool.length === 0) return fallback;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function activityFor(role: string, ev: FeedEvent): Activity {
  const desk = `desk-${role}`;
  const prefix = `${ev.tool_name}: `;
  const detail = ev.summary?.startsWith(prefix) ? ev.summary.slice(prefix.length) : ev.summary !== ev.tool_name ? ev.summary : "";
  const say = (category: string, fallback: string) => {
    if (detail) return `${fallback.split(" ")[0]} ${detail}`;
    return pickVariant(category, fallback);
  };

  if (ev.event_type === "SubagentStop") {
    const relaxPhrases = [
      "✅ Tugas selesai, rehat dulu ngopi ☕",
      "🎉 Beres! Santai sejenak di sofa",
      "☕ Kelar juga task ini, chill bentar",
      "🛋️ Tarik napas dulu sebelum task berikutnya",
    ];
    return { spotId: "break", text: relaxPhrases[Math.floor(Math.random() * relaxPhrases.length)] };
  }
  if (ev.event_type === "SubagentStart") {
    return { spotId: desk, text: detail ? `🚀 ${detail}` : `🚀 Siap eksekusi tugas baru` };
  }

  // Role-specific highlights
  if (role === "trader") {
    return { spotId: desk, text: say("trader", "📈 Menganalisis market & chart") };
  }
  if (role === "finance") {
    return { spotId: desk, text: say("finance", "💰 Audit rekonsiliasi GL") };
  }
  if (role === "scribe") {
    return { spotId: "whiteboard", text: say("scribe", "📝 Dokumentasi Obsidian Vault") };
  }
  if (role === "uiux" || role === "designer") {
    return { spotId: desk, text: say("uiux", "🎨 Review tampilan antarmuka") };
  }

  switch (ev.tool_name) {
    case "Edit":
    case "MultiEdit":
    case "Write":
    case "NotebookEdit":
      return { spotId: desk, text: say("dev_write", "✍️ Menulis kode") };
    case "Read":
    case "Grep":
    case "Glob":
    case "LS":
      return { spotId: desk, text: say("dev_read", "🔎 Membaca kode") };
    case "WebFetch":
    case "WebSearch":
      return { spotId: "bookshelf", text: say("analyst", "🌐 Riset dokumentasi") };
    case "Bash":
      if (role === "devops" || role === "dba") {
        return { spotId: "server-rack", text: say("devops", "🖥️ Menjalankan command di server") };
      }
      if (role === "infra") {
        return { spotId: "server-rack", text: say("infra", "🌡️ Cek performa server") };
      }
      if (role === "qa") {
        return { spotId: desk, text: say("qa", "🧪 Menjalankan test suite") };
      }
      return { spotId: desk, text: detail ? `⌨️ ${detail}` : "⌨️ Menjalankan command" };
    case "TodoWrite":
      return { spotId: "whiteboard", text: say("pm", "📋 Update todo list") };
    case "Agent":
    case "Task":
      return { spotId: "whiteboard", text: say("pm", "🧭 Mendelegasikan tugas") };
    default:
      return { spotId: desk, text: detail ? `💻 ${detail}` : "💻 Bekerja fokus" };
  }
}

export interface FeedCursor {
  lastKey: string | null; // null = nothing seen yet (history is skipped on first sync)
  lastActiveAt: Record<string, number>;
  // Agent that just finished (SubagentStop) or delegated (Agent/Task); the next
  // agent to wake up is assumed to be receiving that work.
  pendingHandoff: { from: string; at: number } | null;
}

export const EMPTY_CURSOR: FeedCursor = { lastKey: null, lastActiveAt: {}, pendingHandoff: null };

const IDLE_GAP_MS = 45_000; // matches backend idle threshold
const HANDOFF_WINDOW_MS = 60_000;
const eventKey = (e: FeedEvent) => `${e.timestamp}|${e.subagent_type}|${e.event_type}|${e.tool_name}|${e.summary}`;

export function processFeed(
  cursor: FeedCursor,
  feed: FeedEvent[],
  displayName: (role: string) => string,
  knownRoles: ReadonlySet<string>,
): { cursor: FeedCursor; activities: Record<string, Activity> } {
  const activities: Record<string, Activity> = {};
  const lastKey = feed.length ? eventKey(feed[feed.length - 1]) : "";
  if (cursor.lastKey === null) return { cursor: { ...cursor, lastKey }, activities };

  let start = feed.findLastIndex((e) => eventKey(e) === cursor.lastKey) + 1;
  // ponytail: cursor event trimmed out of the 200-item feed (or backend restarted) → only replay the tail
  if (start === 0 && cursor.lastKey !== "") start = Math.max(0, feed.length - 10);

  const lastActiveAt = { ...cursor.lastActiveAt };
  let pending = cursor.pendingHandoff;

  for (const ev of feed.slice(start)) {
    const role = ev.subagent_type;
    const at = Date.parse(ev.timestamp) || Date.now();
    const wasIdle = !(role in lastActiveAt) || at - lastActiveAt[role] > IDLE_GAP_MS;
    lastActiveAt[role] = at;

    const act = activityFor(role, ev);
    if (wasIdle && pending && pending.from !== role && at - pending.at < HANDOFF_WINDOW_MS && knownRoles.has(role)) {
      activities[pending.from] = { spotId: `visit-${role}`, text: `📦 Handoff ke ${displayName(role)}` };
      activities[role] = { spotId: act.spotId === "break" ? `desk-${role}` : act.spotId, text: `📥 Terima tugas dari ${displayName(pending.from)}` };
      pending = null;
    } else {
      activities[role] = act;
    }

    if (ev.event_type === "SubagentStop" || ev.tool_name === "Agent" || ev.tool_name === "Task") pending = { from: role, at };
  }

  return { cursor: { lastKey, lastActiveAt, pendingHandoff: pending }, activities };
}

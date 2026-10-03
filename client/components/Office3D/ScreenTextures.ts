"use client";

import * as THREE from "three";

// Cache generated textures so we don't recreate them every render
const textureCache: Record<string, THREE.CanvasTexture> = {};

export function getScreenTexture(role: string): THREE.CanvasTexture {
  if (textureCache[role]) return textureCache[role];

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 300;
  const ctx = canvas.getContext("2d");
  if (ctx) drawBase(ctx, role);

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  textureCache[role] = texture;
  return texture;
}

function drawBase(ctx: CanvasRenderingContext2D, role: string) {
  // Normalize role from multi-agent prefix (e.g. hermes-trader -> trader)
  const normRole = role.replace(/^(hermes|claude|codex|agy)-/, "");

  switch (normRole) {
    case "trader":
      return drawTradingView(ctx);
    case "finance":
      return drawFinanceDashboard(ctx);
    case "infra":
      return drawInfraMonitoring(ctx);
    case "scribe":
      return drawObsidianGraphEditor(ctx);
    case "uiux":
    case "designer":
      return drawFigmaCanvas(ctx);
    case "omarchy":
      return drawLinuxHtop(ctx);
    case "qa":
      return drawGitHubAndTerminal(ctx);
    case "pm":
    case "lead":
      return drawKanbanBoard(ctx);
    case "analyst":
      return drawDatabaseAnalytics(ctx);
    case "devops":
      return drawDevOpsDashboard(ctx);
    case "dba":
      return drawPostgresEditor(ctx);
    case "security":
      return drawSecurityGuard(ctx);
    default:
      return drawVSCode(ctx);
  }
}

// Repaints a desk monitor with a live "recent activity" panel over the role's app.
export function updateScreenActivity(role: string, lines: string[], working: boolean) {
  const texture = getScreenTexture(role);
  const ctx = (texture.image as HTMLCanvasElement).getContext("2d");
  if (!ctx) return;
  drawBase(ctx, role);
  if (lines.length > 0) {
    ctx.fillStyle = "rgba(2,6,23,0.94)";
    ctx.fillRect(0, 196, 512, 104);
    ctx.fillStyle = working ? "#22c55e" : "#f59e0b";
    ctx.beginPath();
    ctx.arc(16, 212, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "bold 11px monospace";
    ctx.fillText(working ? "LIVE • WORKING" : "IDLE", 28, 216);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "11px monospace";
    lines.slice(-4).forEach((line, i) => {
      ctx.fillText(line.length > 70 ? line.slice(0, 69) + "…" : line, 12, 236 + i * 17);
    });
  }
  texture.needsUpdate = true;
}

// Helper for window controls
function drawWindowHeader(ctx: CanvasRenderingContext2D, title: string, bg = "#1e1e2e") {
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, 512, 24);

  // Window dots
  ctx.fillStyle = "#ff5f56";
  ctx.beginPath();
  ctx.arc(14, 12, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffbd2e";
  ctx.beginPath();
  ctx.arc(28, 12, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#27c93f";
  ctx.beginPath();
  ctx.arc(42, 12, 5, 0, Math.PI * 2);
  ctx.fill();

  // Title
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px monospace";
  ctx.fillText(title, 200, 16);
}

// 1. DEV: VS Code Dark Theme
function drawVSCode(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(0, 0, 512, 300);
  drawWindowHeader(ctx, "app.ts - VS Code", "#252526");

  // Sidebar
  ctx.fillStyle = "#333333";
  ctx.fillRect(0, 24, 38, 276);
  ctx.fillStyle = "#252526";
  ctx.fillRect(38, 24, 85, 276);

  ctx.fillStyle = "#9cdcfe";
  ctx.font = "9px monospace";
  ctx.fillText("EXPLORER", 44, 40);
  ctx.fillStyle = "#cccccc";
  ctx.fillText("📄 main.go", 48, 58);
  ctx.fillText("📄 route.ts", 48, 74);
  ctx.fillText("📄 schema.sql", 48, 90);

  // Editor Lines
  const lines = [
    { text: "import { AgencyCore } from '@agency/core';", col: "#c586c0" },
    { text: "export async function syncLedger() {", col: "#569cd6" },
    { text: "  const balance = await getGuardCheck();", col: "#dcdcaa" },
    { text: "  if (balance !== 11) throw new Error();", col: "#ce9178" },
    { text: "  return reconcileNativeLines({ diff: 0 });", col: "#4ec9b0" },
    { text: "}", col: "#d4d4d4" },
  ];

  ctx.font = "11px monospace";
  lines.forEach((l, idx) => {
    ctx.fillStyle = "#5a5a5a";
    ctx.fillText(String(idx + 1).padStart(2, " "), 135, 52 + idx * 22);
    ctx.fillStyle = l.col;
    ctx.fillText(l.text, 160, 52 + idx * 22);
  });

  // Terminal Bottom
  ctx.fillStyle = "#181818";
  ctx.fillRect(123, 200, 389, 100);
  ctx.fillStyle = "#4ade80";
  ctx.font = "10px monospace";
  ctx.fillText("✓ [TEST] All 48 unit tests PASSED (0.42s)", 135, 225);
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("⚡ [BUILD] Turbopack compiled in 142ms", 135, 245);
}

// 2. QA: GitHub PR & Pytest Runner
function drawGitHubAndTerminal(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, 512, 300);
  drawWindowHeader(ctx, "PR #108: Fix Zero-Diff Guard", "#161b22");

  // PR Header
  ctx.fillStyle = "#238636";
  ctx.beginPath();
  ctx.roundRect(16, 36, 90, 22, 4);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 10px sans-serif";
  ctx.fillText("✔ Open PR #108", 22, 51);

  ctx.fillStyle = "#e6edf3";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("reconcile: tally 100% 5 Trade COA and guard = 11", 115, 52);

  // Check List
  const checks = [
    { ok: true, name: "balance-guard-check (baseline 11)" },
    { ok: true, name: "bs-2021-verification (100% tally)" },
    { ok: true, name: "no-artificial-write-offs rule" },
    { ok: true, name: "playwright e2e regression suite" },
  ];

  checks.forEach((c, idx) => {
    ctx.fillStyle = "#238636";
    ctx.font = "bold 12px monospace";
    ctx.fillText("✓", 25, 95 + idx * 24);
    ctx.fillStyle = "#e6edf3";
    ctx.font = "11px monospace";
    ctx.fillText(c.name, 45, 95 + idx * 24);
  });

  // Test Run Result Bar
  ctx.fillStyle = "#161b22";
  ctx.fillRect(16, 205, 480, 80);
  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 12px monospace";
  ctx.fillText("TEST SUITE: 100% PASSED", 30, 235);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px monospace";
  ctx.fillText("Coverage: 98.4% | Memory: 112MB | Duration: 2.1s", 30, 255);
}

// 3. PM: Kanban Sprint Board
function drawKanbanBoard(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 512, 300);
  drawWindowHeader(ctx, "Sprint 42: Odoo Revamp Roadmap", "#1e293b");

  const cols = [
    { title: "TODO", color: "#64748b" },
    { title: "IN PROGRESS", color: "#38bdf8" },
    { title: "REVIEW", color: "#facc15" },
    { title: "DONE (100%)", color: "#4ade80" },
  ];

  cols.forEach((col, idx) => {
    const cx = 14 + idx * 122;
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.roundRect(cx, 36, 114, 250, 6);
    ctx.fill();

    ctx.fillStyle = col.color;
    ctx.font = "bold 10px sans-serif";
    ctx.fillText(col.title, cx + 8, 52);

    // Cards
    for (let c = 0; c < 2; c++) {
      ctx.fillStyle = "#334155";
      ctx.beginPath();
      ctx.roundRect(cx + 6, 62 + c * 52, 102, 44, 4);
      ctx.fill();

      ctx.fillStyle = "#f8fafc";
      ctx.font = "9px sans-serif";
      ctx.fillText(`Task #${idx * 2 + c + 1}`, cx + 12, 78 + c * 52);
      ctx.fillStyle = "#94a3b8";
      ctx.font = "8px monospace";
      ctx.fillText("Priority: High", cx + 12, 94 + c * 52);
    }
  });
}

// 4. ANALYST: PostgreSQL Data Analytics
function drawDatabaseAnalytics(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#090d16";
  ctx.fillRect(0, 0, 512, 300);
  drawWindowHeader(ctx, "PostgreSQL: odoo19_db Ledger Audit", "#111827");

  // Chart area
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(20, 40, 230, 110);
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 10px monospace";
  ctx.fillText("LEDGER BALANCE AUDIT (2021-2026)", 30, 58);

  // Bar chart
  const heights = [35, 60, 48, 75, 52, 68];
  heights.forEach((h, i) => {
    ctx.fillStyle = i === 3 ? "#10b981" : "#0284c7";
    ctx.fillRect(35 + i * 32, 140 - h, 20, h);
  });

  // Query Result Table
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(265, 40, 230, 110);
  ctx.fillStyle = "#facc15";
  ctx.font = "bold 9px monospace";
  ctx.fillText("ACCOUNT_PARTIAL_RECONCILE", 275, 58);

  ctx.fillStyle = "#e2e8f0";
  ctx.font = "8px monospace";
  ctx.fillText("ID    DEBIT_MOVE   CREDIT_MOVE  AMOUNT", 275, 78);
  ctx.fillText("31615 125270       18331        Rp 133,2M", 275, 96);
  ctx.fillText("47078 140352       31985        Rp 27.468", 275, 114);
  ctx.fillText("55303 263295       86099        $135.585", 275, 132);

  // Bottom Status
  ctx.fillStyle = "#064e3b";
  ctx.fillRect(20, 165, 475, 115);
  ctx.fillStyle = "#34d399";
  ctx.font = "bold 11px monospace";
  ctx.fillText("✔ AUDIT RESULT: ZERO-GAP CONFIRMED (DIFF = 0.00)", 35, 200);
  ctx.fillStyle = "#a7f3d0";
  ctx.font = "10px monospace";
  ctx.fillText("Balance Guard = 11 | BS 2021 Matched: 100% | 5 Trade COA OK", 35, 225);
}

// 5. DEVOPS: Docker Desktop & K8s Pod Monitor
function drawDevOpsDashboard(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 512, 300);
  drawWindowHeader(ctx, "Docker & Kubernetes Cluster - Production", "#1e293b");

  // Containers List
  const containers = [
    { name: "odoo19-production", cpu: "2.4%", mem: "1.2GB", status: "RUNNING" },
    { name: "postgres-timescale", cpu: "1.1%", mem: "4.8GB", status: "RUNNING" },
    { name: "redis-cache-cluster", cpu: "0.2%", mem: "256MB", status: "RUNNING" },
    { name: "traefik-ssl-gateway", cpu: "0.4%", mem: "180MB", status: "RUNNING" },
  ];

  ctx.fillStyle = "#0284c7";
  ctx.font = "bold 11px monospace";
  ctx.fillText("CONTAINER STACK (DOCKER COMPOSE)", 20, 52);

  containers.forEach((c, idx) => {
    const y = 70 + idx * 42;
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.roundRect(20, y, 472, 34, 4);
    ctx.fill();

    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(36, y + 17, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "bold 11px monospace";
    ctx.fillText(c.name, 52, y + 21);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "10px monospace";
    ctx.fillText(`CPU: ${c.cpu}  |  RAM: ${c.mem}`, 260, y + 21);

    ctx.fillStyle = "#38bdf8";
    ctx.fillText(c.status, 410, y + 21);
  });

  // Cluster Health Footer
  ctx.fillStyle = "#064e3b";
  ctx.fillRect(20, 248, 472, 40);
  ctx.fillStyle = "#4ade80";
  ctx.font = "bold 10px monospace";
  ctx.fillText("CLUSTER STATUS: HEALTHY  •  UPTIME: 42 DAYS  •  SSL: VALID", 35, 272);
}

// 6. DBA: PostgreSQL Query Editor
function drawPostgresEditor(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#0b1120";
  ctx.fillRect(0, 0, 512, 300);
  drawWindowHeader(ctx, "pgAdmin 4 - PostgreSQL 16 @ localhost:5432", "#1e293b");

  // Query editor
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(16, 36, 480, 80);
  ctx.fillStyle = "#facc15";
  ctx.font = "10px monospace";
  ctx.fillText("SELECT move_id, SUM(debit - credit) as balance", 28, 56);
  ctx.fillText("FROM account_move_line WHERE account_id = '1050000.01'", 28, 74);
  ctx.fillText("GROUP BY move_id HAVING SUM(debit - credit) != 0 LIMIT 10;", 28, 92);

  // Result Grid
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(16, 126, 480, 160);

  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 10px monospace";
  ctx.fillText("QUERY RESULT: 0 rows returned in 12.4ms (Tally Clean!)", 28, 146);

  ctx.fillStyle = "#475569";
  ctx.fillRect(28, 158, 456, 1);

  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 12px monospace";
  ctx.fillText("✔ ZERO UNBALANCED MOVEMENTS DETECTED", 28, 190);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px monospace";
  ctx.fillText("Active connections: 14/100 | Cache hit ratio: 99.8%", 28, 215);
  ctx.fillText("Auto-vacuum: idle | Replica lag: 0.0s", 28, 235);
}

// 7. SECURITY: Security Scanner & Balance Guard
function drawSecurityGuard(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#180608";
  ctx.fillRect(0, 0, 512, 300);
  drawWindowHeader(ctx, "Security Guard & Integrity Auditor", "#450a0a");

  // Shield Icon & Status
  ctx.fillStyle = "#ef4444";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("🛡️ BALANCE GUARD INTEGRITY AUDIT", 24, 55);

  const audits = [
    { title: "Baseline Unbalance Guard", val: "11 (LOCKED & SAFE)", ok: true },
    { title: "Pre-2021 Cutoff Rule", val: "STRICT COMPLIANT", ok: true },
    { title: "Zero Artificial Write-offs", val: "VERIFIED ZERO DUMMY", ok: true },
    { title: "Credentials / Token Leak Scan", val: "NO LEAKS DETECTED", ok: true },
  ];

  audits.forEach((a, i) => {
    const y = 72 + i * 40;
    ctx.fillStyle = "#2d0e12";
    ctx.beginPath();
    ctx.roundRect(24, y, 464, 32, 4);
    ctx.fill();

    ctx.fillStyle = a.ok ? "#22c55e" : "#ef4444";
    ctx.font = "bold 11px monospace";
    ctx.fillText("✔ " + a.title, 38, y + 20);

    ctx.fillStyle = "#fecaca";
    ctx.fillText(a.val, 310, y + 20);
  });

  ctx.fillStyle = "#15803d";
  ctx.fillRect(24, 240, 464, 45);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px monospace";
  ctx.fillText("SECURITY SHIELD STATUS: ALL 4 IRON RULES ENFORCED", 40, 267);
}

// 8. DESIGNER: Figma UI & Design System Canvas
function drawFigmaCanvas(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(0, 0, 512, 300);
  drawWindowHeader(ctx, "Figma - Agency UI Design System v2", "#2c2c2c");

  // Canvas Toolbar
  ctx.fillStyle = "#2c2c2c";
  ctx.fillRect(0, 24, 40, 276);
  ctx.fillStyle = "#a855f7";
  ctx.fillText("❖", 14, 50);

  // Artboards
  const boards = [
    { name: "3D Command Center", x: 60, y: 45, w: 125, h: 80, col: "#0f172a" },
    { name: "Agent Dossier Modal", x: 200, y: 45, w: 125, h: 80, col: "#1e1b4b" },
    { name: "Color Palette", x: 340, y: 45, w: 125, h: 80, col: "#18181b" },
  ];

  boards.forEach((b) => {
    ctx.fillStyle = b.col;
    ctx.beginPath();
    ctx.roundRect(b.x, b.y, b.w, b.h, 4);
    ctx.fill();

    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x, b.y, b.w, b.h);

    ctx.fillStyle = "#e2e8f0";
    ctx.font = "8px sans-serif";
    ctx.fillText(b.name, b.x + 8, b.y + 16);
  });

  // Color Swatches
  const colors = ["#7c3aed", "#10b981", "#ea580c", "#0ea5e9", "#0d9488", "#2563eb", "#dc2626", "#a855f7"];
  colors.forEach((c, idx) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(75 + idx * 46, 165, 14, 0, Math.PI * 2);
    ctx.fill();
  });

  // Bottom status
  ctx.fillStyle = "#3b0764";
  ctx.fillRect(50, 210, 430, 75);
  ctx.fillStyle = "#e9d5ff";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("Design Tokens & Isometric Component Library", 65, 235);
  ctx.fillStyle = "#c084fc";
  ctx.font = "10px sans-serif";
  ctx.fillText("Typography: JetBrains Mono & Inter  •  Auto-Layout: Enabled", 65, 258);
}


// 9. TRADER: TradingView Candlestick Chart & Order Book
function drawTradingView(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#0c0d14";
  ctx.fillRect(0, 0, 512, 300);
  drawWindowHeader(ctx, "TradingView Pro - BTC/USDT & BBCA Live", "#131722");

  // Chart Header
  ctx.fillStyle = "#22c55e";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("BTC/USDT  $68,420.50  +4.82%", 16, 44);

  // Candlesticks
  const candles = [
    { o: 150, c: 130, h: 120, l: 160 },
    { o: 130, c: 110, h: 100, l: 135 },
    { o: 110, c: 140, h: 105, l: 150 },
    { o: 140, c: 120, h: 110, l: 145 },
    { o: 120, c: 90, h: 80, l: 130 },
    { o: 90, c: 80, h: 70, l: 100 },
    { o: 80, c: 105, h: 75, l: 115 },
    { o: 105, c: 65, h: 60, l: 110 },
    { o: 65, c: 55, h: 50, l: 75 },
    { o: 55, c: 70, h: 48, l: 80 },
    { o: 70, c: 45, h: 40, l: 75 },
  ];

  candles.forEach((cd, i) => {
    const x = 30 + i * 26;
    const isUp = cd.c < cd.o; // inverted y coords
    const color = isUp ? "#22c55e" : "#ef4444";
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x + 7, cd.h);
    ctx.lineTo(x + 7, cd.l);
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.fillRect(x, Math.min(cd.o, cd.c), 14, Math.max(4, Math.abs(cd.c - cd.o)));
  });

  // Moving Average Lines
  ctx.strokeStyle = "#eab308";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(35, 140);
  ctx.bezierCurveTo(120, 110, 200, 85, 300, 55);
  ctx.stroke();

  // Order Book Panel (Right side)
  ctx.fillStyle = "#131722";
  ctx.fillRect(330, 24, 182, 276);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 9px monospace";
  ctx.fillText("ORDER BOOK (LIVE)", 340, 42);

  // Asks (Red)
  ctx.fillStyle = "#ef4444";
  ctx.fillText("68,450.00   1.24 BTC", 340, 60);
  ctx.fillText("68,440.00   0.85 BTC", 340, 76);
  ctx.fillText("68,430.00   3.10 BTC", 340, 92);

  // Spread
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("SPREAD: $10.50 (0.015%)", 340, 110);

  // Bids (Green)
  ctx.fillStyle = "#22c55e";
  ctx.fillText("68,420.00   2.45 BTC", 340, 128);
  ctx.fillText("68,410.00   4.12 BTC", 340, 144);
  ctx.fillText("68,400.00   8.90 BTC", 340, 160);

  // Bottom Volume Bar
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(0, 165, 330, 31);
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(35, 175, 12, 21);
  ctx.fillRect(61, 180, 12, 16);
  ctx.fillStyle = "#ef4444";
  ctx.fillRect(87, 170, 12, 26);
  ctx.fillStyle = "#22c55e";
  ctx.fillRect(113, 168, 12, 28);
  ctx.fillRect(139, 160, 12, 36);
}

// 10. FINANCE: Financial Balance Sheet & Quarterly Analytics
function drawFinanceDashboard(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#0f172a";
  ctx.fillRect(0, 0, 512, 300);
  drawWindowHeader(ctx, "Finance Studio - Cash Flow & Revenue Analytics", "#1e293b");

  // Summary Metrics
  const metrics = [
    { label: "Q3 REVENUE", val: "$1,420,800", color: "#10b981" },
    { label: "NET BURN", val: "-$84,200", color: "#f59e0b" },
    { label: "RUNWAY", val: "22 Months", color: "#38bdf8" },
  ];

  metrics.forEach((m, idx) => {
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.roundRect(16 + idx * 160, 36, 150, 48, 6);
    ctx.fill();

    ctx.fillStyle = "#94a3b8";
    ctx.font = "8px sans-serif";
    ctx.fillText(m.label, 26 + idx * 160, 52);

    ctx.fillStyle = m.color;
    ctx.font = "bold 13px monospace";
    ctx.fillText(m.val, 26 + idx * 160, 72);
  });

  // Table rows
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(16, 96, 480, 95);
  ctx.fillStyle = "#64748b";
  ctx.font = "bold 9px monospace";
  ctx.fillText("CATEGORY                BUDGET       ACTUAL       VARIANCE", 26, 112);

  const rows = [
    { cat: "Cloud Infrastructure", b: "$45,000", a: "$38,400", v: "+14.6%", ok: true },
    { cat: "Engineering & AI Ops", b: "$120,000", a: "$114,200", v: "+4.8%", ok: true },
    { cat: "Marketing / Growth", b: "$30,000", a: "$31,500", v: "-5.0%", ok: false },
  ];

  rows.forEach((r, idx) => {
    const y = 132 + idx * 20;
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "9px monospace";
    ctx.fillText(r.cat.padEnd(24) + r.b.padEnd(13) + r.a.padEnd(13), 26, y);
    ctx.fillStyle = r.ok ? "#10b981" : "#ef4444";
    ctx.fillText(r.v, 390, y);
  });
}

// 11. INFRA: Cluster Topology & Prometheus Metrics
function drawInfraMonitoring(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#030712";
  ctx.fillRect(0, 0, 512, 300);
  drawWindowHeader(ctx, "Infra Cluster - Prometheus & Kubernetes Nodes", "#111827");

  // Node Clusters
  const nodes = [
    { name: "k8s-master-01", cpu: 42, ram: 68, status: "READY" },
    { name: "k8s-worker-01", cpu: 85, ram: 78, status: "BUSY" },
    { name: "k8s-worker-02", cpu: 28, ram: 45, status: "READY" },
  ];

  nodes.forEach((n, idx) => {
    ctx.fillStyle = "#111827";
    ctx.beginPath();
    ctx.roundRect(16 + idx * 160, 36, 150, 80, 6);
    ctx.fill();

    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(28 + idx * 160, 52, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#f3f4f6";
    ctx.font = "bold 9px monospace";
    ctx.fillText(n.name, 38 + idx * 160, 56);

    // CPU bar
    ctx.fillStyle = "#4b5563";
    ctx.fillRect(28 + idx * 160, 70, 126, 6);
    ctx.fillStyle = n.cpu > 80 ? "#ef4444" : "#06b6d4";
    ctx.fillRect(28 + idx * 160, 70, (126 * n.cpu) / 100, 6);

    ctx.fillStyle = "#9ca3af";
    ctx.font = "8px monospace";
    ctx.fillText(`CPU: ${n.cpu}%    RAM: ${n.ram}%`, 28 + idx * 160, 92);
  });

  // Traffic Chart
  ctx.fillStyle = "#111827";
  ctx.fillRect(16, 126, 480, 65);
  ctx.strokeStyle = "#06b6d4";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(26, 175);
  ctx.lineTo(80, 160);
  ctx.lineTo(150, 145);
  ctx.lineTo(220, 168);
  ctx.lineTo(300, 138);
  ctx.lineTo(400, 155);
  ctx.lineTo(480, 135);
  ctx.stroke();
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 8px monospace";
  ctx.fillText("Ingress Traffic: 12.8 Gbps • HTTP 200 OK 99.98%", 26, 140);
}

// 12. SCRIBE: Obsidian Knowledge Vault & Graph
function drawObsidianGraphEditor(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#18181b";
  ctx.fillRect(0, 0, 512, 300);
  drawWindowHeader(ctx, "Obsidian Vault - Graphify & Documentation Steward", "#27272a");

  // Left document tree
  ctx.fillStyle = "#27272a";
  ctx.fillRect(0, 24, 130, 276);
  ctx.fillStyle = "#a1a1aa";
  ctx.font = "9px sans-serif";
  ctx.fillText("📁 Projects", 10, 44);
  ctx.fillText("  📄 Odoo Revamp", 14, 60);
  ctx.fillText("  📄 Agency Center", 14, 76);
  ctx.fillText("📁 Knowledge", 10, 96);
  ctx.fillText("  📄 PostgreSQL", 14, 112);
  ctx.fillText("  📄 Multi-Agent", 14, 128);

  // Main Editor
  ctx.fillStyle = "#f4f4f5";
  ctx.font = "bold 12px sans-serif";
  ctx.fillText("# Multi-Agent Architecture Standard", 145, 48);

  ctx.fillStyle = "#a1a1aa";
  ctx.font = "10px monospace";
  ctx.fillText("Status: [[Knowledge/Architecture]] • Tags: #orchestrator", 145, 68);
  ctx.fillText("All subagents synchronize through `orch` CLI and unified", 145, 88);
  ctx.fillText("task queue stored at `~/Documents/Obsidian Vault/`.", 145, 104);

  // Mini Constellation Graph in bottom right
  ctx.fillStyle = "#09090b";
  ctx.beginPath();
  ctx.roundRect(320, 115, 175, 76, 6);
  ctx.fill();

  ctx.strokeStyle = "rgba(168, 85, 247, 0.4)";
  ctx.beginPath();
  ctx.moveTo(350, 150);
  ctx.lineTo(400, 135);
  ctx.lineTo(450, 160);
  ctx.lineTo(410, 175);
  ctx.closePath();
  ctx.stroke();

  // Nodes
  const pts = [
    { x: 350, y: 150, c: "#8b5cf6" },
    { x: 400, y: 135, c: "#06b6d4" },
    { x: 450, y: 160, c: "#f43f5e" },
    { x: 410, y: 175, c: "#10b981" },
  ];
  pts.forEach((p) => {
    ctx.fillStyle = p.c;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fill();
  });
}

// 13. OMARCHY: Linux Htop & Sysinfo Terminal
function drawLinuxHtop(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#0f0f14";
  ctx.fillRect(0, 0, 512, 300);
  drawWindowHeader(ctx, "faris@omarchy: htop (Arch Linux 7.2)", "#1a1a24");

  // Core Bars
  for (let c = 0; c < 8; c++) {
    const y = 35 + c * 14;
    ctx.fillStyle = "#38bdf8";
    ctx.font = "bold 8px monospace";
    ctx.fillText(`${c + 1} [`, 12, y);

    const pct = 15 + ((c * 27) % 65);
    ctx.fillStyle = "#22c55e";
    ctx.fillRect(32, y - 7, pct, 8);
    ctx.fillStyle = "#64748b";
    ctx.fillRect(32 + pct, y - 7, 80 - pct, 8);
    ctx.fillStyle = "#f8fafc";
    ctx.fillText(`] ${pct}%`, 116, y);
  }

  // Sys info right side
  ctx.fillStyle = "#a855f7";
  ctx.font = "bold 10px monospace";
  ctx.fillText("OS: Omarchy Linux x86_64", 230, 45);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "9px monospace";
  ctx.fillText("Kernel: 7.2.5-3-omarchy", 230, 62);
  ctx.fillText("Uptime: 4 days, 16:32", 230, 78);
  ctx.fillText("Tasks: 284, 12 running", 230, 94);
  ctx.fillText("Mem: 8.42 GiB / 31.2 GiB", 230, 110);
  ctx.fillText("Wayland Compositor: Hyprland", 230, 126);
}

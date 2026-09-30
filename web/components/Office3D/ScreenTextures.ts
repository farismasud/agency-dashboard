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

  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    textureCache[role] = fallback;
    return fallback;
  }

  switch (role) {
    case "dev":
      drawVSCode(ctx);
      break;
    case "qa":
      drawGitHubAndTerminal(ctx);
      break;
    case "pm":
      drawKanbanBoard(ctx);
      break;
    case "analyst":
      drawDatabaseAnalytics(ctx);
      break;
    default:
      drawVSCode(ctx);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  textureCache[role] = texture;
  return texture;
}

// --- 1. DEV: VS CODE DARK THEME ---
function drawVSCode(ctx: CanvasRenderingContext2D) {
  // Background
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(0, 0, 512, 300);

  // Top Window Bar
  ctx.fillStyle = "#323233";
  ctx.fillRect(0, 0, 512, 24);
  // Mac Window Dots
  ctx.fillStyle = "#ff5f56";
  ctx.beginPath();
  ctx.arc(14, 12, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffbd2e";
  ctx.beginPath();
  ctx.arc(30, 12, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#27c93f";
  ctx.beginPath();
  ctx.arc(46, 12, 5, 0, Math.PI * 2);
  ctx.fill();

  // Tab
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(70, 4, 140, 20);
  ctx.fillStyle = "#e2e8f0";
  ctx.font = "11px monospace";
  ctx.fillText("account_move.py", 85, 18);

  // Left Sidebar (File Explorer)
  ctx.fillStyle = "#252526";
  ctx.fillRect(0, 24, 110, 256);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px sans-serif";
  ctx.fillText("EXPLORER", 10, 42);
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("▼ models", 14, 60);
  ctx.fillStyle = "#cbd5e1";
  ctx.fillText("  • account_move.py", 18, 76);
  ctx.fillText("  • partner.py", 18, 92);
  ctx.fillText("  • partial_rec.py", 18, 108);
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("▶ controllers", 14, 126);
  ctx.fillText("▶ tests", 14, 142);

  // Editor Area with Code
  ctx.fillStyle = "#1e1e1e";
  ctx.fillRect(110, 24, 402, 256);

  // Line Numbers
  ctx.fillStyle = "#858585";
  ctx.font = "11px monospace";
  for (let i = 1; i <= 12; i++) {
    ctx.fillText(`${i}`, 118, 38 + i * 18);
  }

  // Code Lines (Syntax Highlighting)
  const codeLines = [
    { text: "from odoo import models, fields, api", color: "#c586c0" },
    { text: "", color: "" },
    { text: "class AccountMove(models.Model):", color: "#4ec9b0" },
    { text: "    _inherit = 'account.move'", color: "#9cdcfe" },
    { text: "", color: "" },
    { text: "    @api.multi", color: "#dcdcaa" },
    { text: "    def action_post(self):", color: "#dcdcaa" },
    { text: "        # Verify baseline unbalance guard", color: "#6a9955" },
    { text: "        self.guard_balance_check()", color: "#dcdcaa" },
    { text: "        res = super().action_post()", color: "#9cdcfe" },
    { text: "        return res", color: "#c586c0" },
  ];

  codeLines.forEach((line, idx) => {
    if (!line.text) return;
    ctx.fillStyle = line.color;
    ctx.font = "11px monospace";
    ctx.fillText(line.text, 142, 38 + (idx + 1) * 18);
  });

  // Bottom Status Bar
  ctx.fillStyle = "#007acc";
  ctx.fillRect(0, 280, 512, 20);
  ctx.fillStyle = "#ffffff";
  ctx.font = "10px monospace";
  ctx.fillText("⎇ main*  •  Python 3.11  •  UTF-8  •  Spaces: 4", 10, 294);
}

// --- 2. QA: GITHUB PR & AUTOMATED TEST RUNNER ---
function drawGitHubAndTerminal(ctx: CanvasRenderingContext2D) {
  // Background
  ctx.fillStyle = "#0d1117";
  ctx.fillRect(0, 0, 512, 300);

  // Top GitHub PR Bar
  ctx.fillStyle = "#161b22";
  ctx.fillRect(0, 0, 512, 42);
  ctx.fillStyle = "#238636";
  ctx.beginPath();
  ctx.roundRect(12, 10, 56, 22, 4);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("✔ Open", 20, 25);

  ctx.fillStyle = "#f0f6fc";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("PR #108: Fix partial reconcile precision & tally", 78, 25);

  // Checks passed banner
  ctx.fillStyle = "#1f2937";
  ctx.fillRect(12, 50, 488, 30);
  ctx.fillStyle = "#3fb950";
  ctx.font = "bold 11px monospace";
  ctx.fillText("✔ All checks have passed (18 successful checks)", 24, 70);

  // Terminal Runner Section Below
  ctx.fillStyle = "#05080d";
  ctx.fillRect(12, 88, 488, 200);

  ctx.fillStyle = "#8b949e";
  ctx.font = "11px monospace";
  ctx.fillText("$ pytest tests/test_migration_integrity.py -v", 24, 110);

  const testResults = [
    { name: "test_gl_vs_aging_5_trade_accounts ...", status: "PASSED", color: "#3fb950" },
    { name: "test_unbalance_baseline_equals_11 ...", status: "PASSED", color: "#3fb950" },
    { name: "test_recompute_residual_line_id ...", status: "PASSED", color: "#3fb950" },
    { name: "test_playwright_e2e_invoice_flow ...", status: "PASSED", color: "#3fb950" },
    { name: "test_zero_gap_partner_allocations ...", status: "PASSED", color: "#3fb950" },
  ];

  testResults.forEach((t, i) => {
    ctx.fillStyle = "#c9d1d9";
    ctx.fillText(t.name, 24, 134 + i * 22);
    ctx.fillStyle = t.color;
    ctx.font = "bold 11px monospace";
    ctx.fillText(`[${t.status}]`, 420, 134 + i * 22);
  });

  ctx.fillStyle = "#3fb950";
  ctx.font = "bold 12px monospace";
  ctx.fillText("================ 18 passed in 1.48s ================", 90, 265);
}

// --- 3. PM: KANBAN SPRINT DASHBOARD ---
function drawKanbanBoard(ctx: CanvasRenderingContext2D) {
  // Background
  ctx.fillStyle = "#090d16";
  ctx.fillRect(0, 0, 512, 300);

  // Header
  ctx.fillStyle = "#111827";
  ctx.fillRect(0, 0, 512, 36);
  ctx.fillStyle = "#a855f7";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("📋 Agency Sprint Board · Q4 Migration", 14, 23);

  ctx.fillStyle = "#10b981";
  ctx.font = "bold 11px sans-serif";
  ctx.fillText("88% Completed", 410, 23);

  // 3 Columns: Backlog, In Progress, Done
  const cols = [
    { title: "TO DO (3)", x: 12, color: "#38bdf8" },
    { title: "IN PROGRESS (2)", x: 178, color: "#facc15" },
    { title: "DONE (8)", x: 344, color: "#4ade80" },
  ];

  cols.forEach((col) => {
    // Col Header
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(col.x, 44, 156, 26);
    ctx.fillStyle = col.color;
    ctx.font = "bold 11px sans-serif";
    ctx.fillText(col.title, col.x + 8, 61);

    // Col Background
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(col.x, 74, 156, 216);
  });

  // Sample Cards
  const cards = [
    { col: 0, y: 82, title: "Deploy to Prod", tag: "Ops", tagColor: "#38bdf8" },
    { col: 0, y: 136, title: "Doc Handover", tag: "Docs", tagColor: "#94a3b8" },
    { col: 1, y: 82, title: "Playwright E2E", tag: "QA", tagColor: "#f59e0b" },
    { col: 1, y: 136, title: "Refactor APR", tag: "Dev", tagColor: "#10b981" },
    { col: 2, y: 82, title: "Zero-Diff Tally", tag: "Done", tagColor: "#10b981" },
    { col: 2, y: 136, title: "Restore Kas 1010", tag: "Done", tagColor: "#10b981" },
    { col: 2, y: 190, title: "BS 2021 Alignment", tag: "Done", tagColor: "#10b981" },
  ];

  cards.forEach((c) => {
    const x = cols[c.col].x + 6;
    ctx.fillStyle = "#1e293b";
    ctx.beginPath();
    ctx.roundRect(x, c.y, 144, 46, 6);
    ctx.fill();

    ctx.fillStyle = "#f8fafc";
    ctx.font = "11px sans-serif";
    ctx.fillText(c.title, x + 8, c.y + 18);

    ctx.fillStyle = c.tagColor;
    ctx.font = "bold 9px monospace";
    ctx.fillText(`[${c.tag}]`, x + 8, c.y + 36);
  });
}

// --- 4. ANALYST: DATABASE & DATA CHARTS ---
function drawDatabaseAnalytics(ctx: CanvasRenderingContext2D) {
  // Background
  ctx.fillStyle = "#0a0f1d";
  ctx.fillRect(0, 0, 512, 300);

  // Top Nav
  ctx.fillStyle = "#131b2e";
  ctx.fillRect(0, 0, 512, 32);
  ctx.fillStyle = "#38bdf8";
  ctx.font = "bold 13px sans-serif";
  ctx.fillText("🗄️ PostgreSQL Analytics · odoo11ict", 14, 21);

  // Left SQL Query Box
  ctx.fillStyle = "#050811";
  ctx.fillRect(12, 40, 488, 64);
  ctx.fillStyle = "#a5b4fc";
  ctx.font = "11px monospace";
  ctx.fillText("SELECT account_code, SUM(debit) as deb, SUM(credit) as cred", 20, 58);
  ctx.fillText("FROM account_move_line WHERE date < '2021-01-01'", 20, 76);
  ctx.fillStyle = "#34d399";
  ctx.fillText("GROUP BY account_code HAVING SUM(debit - credit) != 0; -- Net 0 OK", 20, 94);

  // Data Table Grid
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(12, 114, 488, 22);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "bold 10px monospace";
  ctx.fillText("ACCOUNT         DEBIT (IDR)        CREDIT (IDR)      DIFF", 24, 129);

  const rows = [
    { acc: "1050000.01", deb: "42,891,200.00", cred: "42,891,200.00", diff: "0.00 (Tally)" },
    { acc: "2010000.01", deb: "18,440,150.00", cred: "18,440,150.00", diff: "0.00 (Tally)" },
    { acc: "1010000.04", deb: "0.00", cred: "0.00", diff: "0.00 (Clean)" },
  ];

  rows.forEach((r, idx) => {
    ctx.fillStyle = idx % 2 === 0 ? "#0f172a" : "#131d35";
    ctx.fillRect(12, 138 + idx * 24, 488, 22);
    ctx.fillStyle = "#e2e8f0";
    ctx.font = "11px monospace";
    ctx.fillText(`${r.acc}     ${r.deb}     ${r.cred}`, 24, 153 + idx * 24);
    ctx.fillStyle = "#10b981";
    ctx.font = "bold 11px monospace";
    ctx.fillText(r.diff, 385, 153 + idx * 24);
  });

  // Chart Bars at bottom
  ctx.fillStyle = "#1e293b";
  ctx.fillRect(12, 220, 488, 70);
  ctx.fillStyle = "#94a3b8";
  ctx.font = "10px sans-serif";
  ctx.fillText("Cumulative Reconciliation Progress:", 20, 234);

  // Bar
  ctx.fillStyle = "#0284c7";
  ctx.fillRect(20, 246, 450, 18);
  ctx.fillStyle = "#10b981";
  ctx.fillRect(20, 246, 450 * 0.98, 18);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 10px sans-serif";
  ctx.fillText("99.999% Reconciled", 200, 259);
}

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
export function activityFor(role: string, ev: FeedEvent): Activity {
  const desk = `desk-${role}`;
  // Hook summaries look like "Bash: npm test"; show "⌨️ npm test" (fallback's emoji + detail).
  const prefix = `${ev.tool_name}: `;
  const detail = ev.summary?.startsWith(prefix) ? ev.summary.slice(prefix.length) : ev.summary !== ev.tool_name ? ev.summary : "";
  const say = (fallback: string) => (detail ? `${fallback.split(" ")[0]} ${detail}` : fallback);

  if (ev.event_type === "SubagentStop") return { spotId: "break", text: "✅ Tugas selesai, rehat dulu ☕" };
  if (ev.event_type === "SubagentStart") return { spotId: desk, text: say("🚀 Mulai tugas baru") };

  switch (ev.tool_name) {
    case "Edit":
    case "MultiEdit":
    case "Write":
    case "NotebookEdit":
      return { spotId: desk, text: say("✍️ Menulis kode") };
    case "Read":
    case "Grep":
    case "Glob":
    case "LS":
      return { spotId: desk, text: say("🔎 Membaca kode") };
    case "WebFetch":
    case "WebSearch":
      return { spotId: "bookshelf", text: say("🌐 Riset dokumentasi") };
    case "Bash":
      return role === "devops" || role === "dba"
        ? { spotId: "server-rack", text: say("🖥️ Menjalankan command di server") }
        : { spotId: desk, text: say("⌨️ Menjalankan command") };
    case "TodoWrite":
      return { spotId: "whiteboard", text: say("📋 Update todo list") };
    case "Agent":
    case "Task":
      return { spotId: "whiteboard", text: say("🧭 Mendelegasikan tugas") };
    default:
      return { spotId: desk, text: say("💻 Bekerja") };
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

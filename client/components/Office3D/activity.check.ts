// Run: node web/components/Office3D/activity.check.ts
import assert from "node:assert/strict";
import { activityFor, EMPTY_CURSOR, processFeed } from "./activity.ts";
import type { FeedEvent } from "../../lib/types.ts";

const ev = (role: string, sec: number, tool = "", event_type = "PreToolUse"): FeedEvent => ({
  subagent_type: role,
  event_type,
  tool_name: tool,
  summary: tool,
  timestamp: new Date(Date.UTC(2026, 0, 1, 0, 0, sec)).toISOString(),
});
const roles = new Set(["dev", "qa", "devops"]);
const name = (r: string) => r.toUpperCase();

// First sync skips history.
const history = [ev("dev", 0, "Edit")];
let { cursor, activities } = processFeed(EMPTY_CURSOR, history, name, roles);
assert.deepEqual(activities, {});

// New events map to spots; devops Bash goes to the server rack.
let feed = [...history, ev("devops", 1, "Bash"), ev("dev", 2, "WebSearch")];
({ cursor, activities } = processFeed(cursor, feed, name, roles));
assert.equal(activities.devops.spotId, "server-rack");
assert.equal(activities.dev.spotId, "bookshelf");
assert.equal(activityFor("dev", { ...ev("dev", 3, "Bash"), summary: "Bash: npm test" }).text, "⌨️ npm test");

// Nothing new → no activities.
({ activities } = processFeed(cursor, feed, name, roles));
assert.deepEqual(activities, {});

// dev finishes, qa wakes up shortly after → handoff dev → qa.
feed = [...feed, ev("dev", 5, "", "SubagentStop"), ev("qa", 8, "Read")];
({ cursor, activities } = processFeed(cursor, feed, name, roles));
assert.equal(activities.dev.spotId, "visit-qa");
assert.equal(activities.qa.spotId, "desk-qa");
assert.match(activities.qa.text, /DEV/);
assert.equal(cursor.pendingHandoff, null);

// A stop with nobody picking up → the finished agent takes a break.
feed = [...feed, ev("qa", 20, "", "SubagentStop")];
({ activities } = processFeed(cursor, feed, name, roles));
assert.equal(activities.qa.spotId, "break");

console.log("activity.check: ok");

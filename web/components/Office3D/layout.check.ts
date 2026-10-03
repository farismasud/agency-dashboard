// Run: node web/components/Office3D/layout.check.ts
import assert from "node:assert/strict";
import { ROLE_LABEL, ROLE_RING_COLOR, TOOL_LEAD_STYLE, isGuest } from "./layout.ts";

// Every non-Claude tool lead is labelled, coloured and seated at a hot desk.
for (const role of ["codex-lead", "agy-lead", "hermes-lead"]) {
  const style = TOOL_LEAD_STYLE[role];
  assert.ok(style, `${role} missing from TOOL_LEAD_STYLE`);
  assert.equal(ROLE_LABEL[role], style.label);
  assert.equal(ROLE_RING_COLOR[role], style.color);
  assert.equal(isGuest(role), true);
}

// Tool leads must stay visually distinct from each other and from the Claude lead.
const colors = [ROLE_RING_COLOR.lead, ...Object.values(TOOL_LEAD_STYLE).map((s) => s.color)];
assert.equal(new Set(colors).size, colors.length);

// Claude's own lead is untouched.
assert.equal(ROLE_LABEL.lead, "Lead");
assert.equal(isGuest("lead"), false);

console.log("layout.check: ok");

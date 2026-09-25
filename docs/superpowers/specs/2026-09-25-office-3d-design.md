# Office 3D View — Design Spec

Date: 2026-09-25

## Intent

Replace the flat SVG/pixel-sprite "office" visualization (built earlier the
same day, judged "jelek bgt" / not close enough to the user's reference) with
a real 3D scene using three.js, so the agent-activity dashboard actually
looks like the reference screenshots: a room with walls/depth, low-poly 3D
character models, simple 3D furniture, and floating name/status bubbles.

**Reference:** user-provided screenshots of a "Ripple10"-style dashboard
(react-three-fiber-class rendering, rigged low-poly characters, real 3D desk
objects, coffee machine, water dispenser, whiteboards, fixed isometric-ish
camera with occasional zoomed views).

## Non-goals (this iteration)

- Not full parity with every prop in the reference (coffee machine, water
  dispenser, whiteboard content, meeting table, wall art) — furniture scope
  is deliberately minimal (see below). Richer set decks are a follow-up.
- Not orbit/zoom camera controls — camera is fixed for this iteration.
- Not skeletal walk/idle animation clips — the sourced character models are
  static meshes; movement is via JS-driven position tweening, not embedded
  animations.
- Not a custom-modeled/generated 3D asset — no 3D-model-generation tool is
  available in this environment; all assets are sourced from an existing
  open-license pack (see Assets).

## Architecture

```
web/components/Office3D/
  ├── Scene.tsx          — <Canvas>, fixed camera, lighting, floor + walls
  ├── CharacterModel.tsx — loads/clones the Kenney GLB, per-frame position
  │                        lerp (desk <-> break-area) + idle bob
  ├── DeskProp.tsx       — primitive-geometry desk + chair + monitor per role
  └── Office.tsx         — entry point; same external contract as before

web/components/Office.tsx  — DELETED, replaced by Office3D/Office.tsx
                              (or re-exported from there to avoid touching
                              the import in app/kerja/page.tsx — decided at
                              plan time, whichever keeps the diff smaller)
```

`Office3D/Office.tsx` keeps the exact same prop contract as the component it
replaces: `{ agents: Record<string, AgentState> }` (from `web/lib/types.ts`,
unchanged). `web/app/kerja/page.tsx` requires no changes beyond the import
path if the file moves.

## Library choice

**`@react-three/fiber` + `@react-three/drei`** (new dependencies), not
vanilla three.js. Rationale: the app is React/Next.js already; R3F lets the
scene be declared as JSX driven by the existing `agents` state, and `drei`
supplies `useGLTF` (model loading) and `<Html>` (HTML/CSS overlay anchored to
a 3D position — used for the name tag / status bubble, replacing the
existing DOM-positioned bubble with a 3D-anchored one that reads identically
in Tailwind).

## Assets

**Characters:** Kenney **"Mini Characters"** pack — verified during
brainstorming by actually downloading and inspecting the zip (not assumed
from search results): CC0 license, GLB format, 6 female + 6 male model
variants (`character-female-a..f.glb`, `character-male-a..f.glb`), ~250KB
each, static (non-animated) meshes. One female and one male model are loaded
once via `useGLTF` and reused across all four agent instances via `drei`'s
`<Clone>` (avoids re-parsing the GLB per instance). Role color differentiation
is applied by overriding the cloned mesh's material color at runtime
(`material.color.set(...)`), not by swapping models.

Attribution recorded in `web/public/office3d/ATTRIBUTION.md` (CC0, credit
appreciated but not required), same pattern as the earlier sprite assets.

**Furniture and room:** built from three.js **primitive geometries**
(`BoxGeometry` for desks/monitors, `CylinderGeometry` for chairs,
`PlaneGeometry` for floor/walls, cone+cylinder for plants) with solid-color
materials — no external furniture asset is sourced. This was chosen
deliberately (furniture scope = minimal, confirmed with the user) to avoid
the extra asset-hunting and OBJ/MTL-loader setup a matching furniture pack
would need, and it still reads as coherent "low-poly blocky" furniture
consistent with the character models' style.

## Components

### `Scene.tsx`
- `<Canvas>` wrapper, fixed `PerspectiveCamera` at an isometric-ish downward
  angle (no `OrbitControls` this iteration).
- Ambient + one directional light (soft shadows optional, skip if it adds
  meaningful complexity — plain lighting is an acceptable v1).
- Floor (large `PlaneGeometry`, wood-tone material) + two back walls
  (vertical `PlaneGeometry`s) for depth, matching the reference's
  room-with-walls read instead of the previous flat 2D floor.

### `DeskProp.tsx`
- Static-per-role desk group: `BoxGeometry` desk + `BoxGeometry` monitor +
  `CylinderGeometry` chair, positioned once per role (`pm`/`analyst`/`dev`/
  `qa`), same four fixed desk slots as the current `DESK_POS` map (ported
  as 3D `[x, z]` coordinates instead of CSS percentages).

### `CharacterModel.tsx`
- Props: `agent: AgentState`.
- Loads (via shared cache) the male or female GLB per a fixed per-role
  mapping (same `ROLE_SPRITE`-equivalent assignment as the sprite version),
  clones it, overrides material color per `ROLE_COLOR`.
- `useFrame`: lerps the character's position toward the desk position (when
  `status === "working"`) or a shared break-area slot (when `"idle"`), plus
  a small sine-wave Y-offset while working (replaces the CSS `agency-bob`
  animation).
- Renders a `drei` `<Html>` anchored above the model: the status bubble
  (`last_action` while working, "☕ Istirahat" while idle) and the
  `display_name · role` label — same content and Tailwind classes as the
  current sprite version's bubble/label.

### `Office.tsx`
- Reads `agents`, renders `<Scene>` plus one `<CharacterModel>` per agent
  entry, keyed by `subagent_type`.
- No `agents` → renders nothing (parent page already guards with
  `{project && (...)}`, matching current behavior).

## Data Flow

Identical to the current app: `useAgencySocket` → `RoomState` → `agents`
prop → this component. The only change is internal to the component: instead
of CSS `left`/`top`/`transition` on absolutely-positioned DOM nodes, position
updates now feed a per-frame `lerp` target inside `useFrame`, decoupling
"new websocket data arrived" (a React re-render) from "the character visibly
moves smoothly" (a continuous per-frame tween) — a websocket update changes
where the tween is heading, not an instant jump.

## Performance

Adding `three` + `@react-three/fiber` + `@react-three/drei` adds roughly
600-900KB gzipped to the `/kerja` route's JS bundle. Next.js code-splits per
route, so this cost is paid only on `/kerja`, not on other pages. The two
GLB character models (~250KB each) load lazily when the canvas mounts and
are cached by the browser afterward. The scene itself (4 low-poly characters
+ primitive-geometry furniture, no complex materials or large instance
counts) is trivially cheap to render on any GPU capable of running a modern
browser. This is a localhost, single-user tool — bundle size is not treated
as a page-speed-critical constraint the way it would be for a public site.

## Error Handling

- GLB fails to load (network hiccup, moved/missing file): `useGLTF` is
  wrapped in a `Suspense`/error boundary; on failure, render a plain colored
  box in place of the character model rather than crashing the whole
  `/kerja` page.
- No project selected: `<Canvas>` is not mounted at all (existing guard in
  `app/kerja/page.tsx` is unchanged).
- WebGL unavailable (very old browser / disabled): feature-detect before
  mounting `<Canvas>` and show a plain text fallback ("3D view tidak
  didukung di browser ini") instead of an uncaught exception.

## Testing

No frontend test framework exists in this project (established in the
original plan) and this change doesn't introduce one — `tsc --noEmit`
remains the only automated check. **Unlike every other frontend change made
so far**, the actual visual correctness of a WebGL/three.js scene cannot be
approximated by curl, a Node script, or any tool available in this
environment — canvas rendering only happens in a real browser. The
golden-path verification for this component is therefore **entirely
dependent on the user reviewing a live screenshot**; the implementer should
say this plainly rather than claiming visual verification that didn't
happen.

## Open Questions for Implementation

- Whether `Office.tsx` is replaced in place (same path) or moved under
  `Office3D/` with the old path re-exporting it — pick whichever keeps
  `app/kerja/page.tsx`'s import unchanged and the diff smaller; decide at
  plan-writing time, not here.
- Exact camera position/FOV/angle numbers — tune during implementation
  against a live screenshot; the spec fixes the *approach* (fixed camera,
  isometric-ish downward angle), not exact numeric values.
- Whether basic shadows are worth the added complexity — treat as optional
  polish, not a requirement; skip if it complicates the first working
  version.

# Agency Dashboard — Design Spec

Date: 2026-09-25

## Intent

Visualisasi live, isometric-style "kantor" yang nampilin aktivitas real sub-agent
Claude Code (pm/analyst/dev/qa, global di `~/.claude/agents/`) sambil mereka
ngerjain task di project mana pun. Terinspirasi tampilan "Ripple10" (screenshot
referensi user): avatar per role, live activity feed, roadmap/progress panel,
counter token/plan.

**Bukan** demo/dummy — data harus dari aktivitas sub-agent beneran, real-time.

## Non-goals (v1)

- Bukan true 3D (three.js) — cukup 2.5D/isometric CSS/SVG, lebih ringan.
- Bukan histori permanen — state in-memory, reset kalau backend restart.
- Bukan multi-user/auth — single user, localhost.
- Bukan token accounting presisi — field token count best-effort/opsional, skip
  kalau data gak tersedia dari hook payload.
- Bukan agent movement/AI beneran — avatar cuma toggle status "Kerja"/"Istirahat",
  bukan pathfinding/animasi jalan kompleks.

## Architecture

```
Project mana pun → Claude Code hook (global, ~/.claude/settings.json)
                       │ POST JSON event (fire-and-forget, exit 0 even on failure)
                       ▼
        agency-dashboard backend (Go/Gin, localhost)
           - in-memory state per project path ("room")
           - websocket hub, broadcast on state change
           - fsnotify watch ROADMAP.md per project aktif
           - idle-timeout ticker (agent -> "Istirahat" kalau gak ada event N detik)
                       │ ws broadcast + REST snapshot
                       ▼
        agency-dashboard frontend (Next.js, /kerja)
           - room selector (per project)
           - isometric office view (avatar per subagent_type)
           - live activity feed (kiri)
           - roadmap/progress panel (kanan, parse ROADMAP.md)
```

Hook dipasang sekali secara global (`~/.claude/settings.json`), bukan per-project
— otomatis nempel ke project mana pun user kerja pakai Claude Code.

## Location

Project baru di `/home/faris/Faris/Kerja/agency-dashboard/` (bukan digabung ke
`obsidian-dashboard` — beda concern & ritme data: vault fs-watch lambat vs
live agent event deras). Pola stack sama dengan `obsidian-dashboard` (Gin + Next.js)
biar konsisten dan familiar buat maintenance.

## Components

### 1. Hook script (`~/.claude/hooks/agency-notify.sh`)

- Terpasang di `~/.claude/settings.json` untuk event `PostToolUse`,
  `SubagentStop`, `Stop`, `SessionStart`.
- Baca payload JSON dari stdin yang dikirim Claude Code hook runtime.
- **Field mapping exact harus diverifikasi ke dokumentasi hooks resmi saat
  implementasi** (nama field seperti `hook_event_name`, `tool_name`,
  `tool_input`, `cwd`, `subagent_type` perlu dicek, bukan diasumsikan dari
  memori training).
- POST ke `http://localhost:<PORT>/events`, timeout pendek (~1-2s), gagal =
  diam & exit 0. Hook tidak boleh pernah memblokir kerja Claude Code.

### 2. Backend (Go/Gin) — `agency-dashboard/api/`

- `POST /events` — terima event, update/buat `RoomState` by project path.
- `GET /ws` — websocket, broadcast diff state ke client yang subscribe room.
- `GET /rooms/:project` — snapshot state awal (dipakai saat frontend connect
  pertama kali / refresh).
- `GET /rooms` — list project yang punya room aktif (buat room selector).
- fsnotify watcher: baca ulang `ROADMAP.md` di root tiap project yang lagi
  ada room aktif, parse jadi progress data.
- Idle ticker: tiap ~30s, cek `AgentState.last_event_at`; kalau lewat
  threshold, set status `idle`.
- State in-memory, struct kira-kira:
  ```go
  type RoomState struct {
      Project  string
      Agents   map[string]*AgentState // key: subagent_type
      Feed     []Event                // capped, misal 200 terbaru
      Roadmap  *RoadmapData           // nil kalau ROADMAP.md gak ada
  }
  type AgentState struct {
      SubagentType string
      DisplayName  string // random, assigned sekali per subagent_type per room
      Status       string // "working" | "idle"
      LastAction   string
      LastEventAt  time.Time
  }
  ```

### 3. Frontend (Next.js) — `agency-dashboard/web/`

- Route `/kerja`: room selector di atas (dropdown/tab), lalu isometric office
  view, live feed panel (kiri), roadmap panel (kanan) — layout mengikuti
  referensi screenshot user.
- Avatar: sprite/CSS per `subagent_type` (pm/analyst/dev/qa), posisi preset per
  role (bukan pathfinding), badge status, bubble text `last_action` singkat.
- Websocket client dengan auto-reconnect (backend bisa restart kapan saja).
- Roadmap panel render progress bar per modul dari `RoadmapData`, hidden kalau
  null.

## Data Flow & Event Schema

1. Claude Code fire hook event → hook script kirim POST.
2. Backend cari/buat room by `project`; cari/buat `AgentState` by
   `subagent_type` (assign display name random kalau baru); append ke `Feed`;
   set status `working`, update `LastAction`/`LastEventAt`.
3. Backend broadcast diff ke ws client yang subscribe room tsb.
4. Frontend update avatar + prepend ke live feed list.
5. Idle ticker backend set `idle` kalau agent gak ada event baru dalam N detik
   — bukan dari hook, murni timeout server-side.

Payload event (`POST /events`), field exact perlu verifikasi implementasi:

```json
{
  "project": "/home/faris/Faris/Kerja/odoo-revamp",
  "subagent_type": "dev",
  "event_type": "tool_use",
  "tool_name": "Edit",
  "summary": "Edit models/account_move.py",
  "timestamp": "2026-09-25T11:12:29+07:00"
}
```

## Error Handling

- Hook POST gagal (backend mati/timeout) → hook diam, exit 0. Prioritas utama:
  jangan pernah ganggu kerja Claude Code demi dashboard.
- Backend restart → state in-memory hilang (v1 gak butuh histori permanen);
  frontend reconnect ws, backend re-scan `ROADMAP.md` project aktif.
- Payload malformed → backend log & skip, jangan crash.
- Project tanpa `ROADMAP.md` → panel roadmap kosong/hidden, bukan error.

## Testing

- Backend: unit test util murni pakai `go test` (idle-timeout calc, roadmap
  markdown parser, random-name assignment). Endpoint dites manual
  (`curl`/`websocat`) saat dev — tanpa integration test framework di v1.
- Hook script: 1 manual test — sample JSON stdin → cek POST nyampe ke dummy
  listener.
- Frontend: tanpa test framework baru; golden-path manual — jalanin dev
  server, trigger event dari sub-agent asli, verifikasi avatar/feed/roadmap
  update live.
- End-to-end sanity (paling penting): jalanin PM agent breakdown task kecil di
  1 project real → pastikan kantor muncul, agent kerja, event masuk, roadmap
  kebaca dari file asli.

## Open Questions for Implementation

- Exact Claude Code hook stdin schema per event type (`PostToolUse`,
  `SubagentStop`, `Stop`, `SessionStart`) — verifikasi ke dokumentasi resmi,
  bukan tebakan.
- Port default backend (hindari bentrok dengan `obsidian-dashboard` yang
  pakai 8080/3000) — sarankan 8090/3090 atau serupa, dikonfirmasi saat plan.

# Multi-Agent Visibility (Sub-proyek A)

Tanggal: 2026-10-03
Status: draft, menunggu review Faris

## Latar belakang

Dashboard saat ini hanya melihat aktivitas Claude Code lewat `hooks/agency-notify.sh`.
Codex, agy (Antigravity) dan Hermes tidak muncul di kantor 3D. Sistem multi-agent
Faris (`orch`, role, antrian task) dikembangkan bertahap; ini sub-proyek pertama dari
empat (A visibilitas, B chain otomatis, C konteks bersama, D worker otomatis).

## Tujuan

Agent dari Claude, Codex, agy dan Hermes tampil di kantor 3D dengan avatar lead
masing-masing, berdasarkan event live dari tool mereka.

## Di luar lingkup

- Dashboard tetap **monitor-only**: tidak ada dispatch, approve, atau stop dari UI.
- Chain otomatis (B), konteks bersama (C), worker otomatis (D).
- Identitas berbasis role `orch` (hanya tool asal yang dibedakan).

## Kondisi saat ini

- `api/events.go`: `EventPayload{project, subagent_type, event_type, tool_name, summary, timestamp}`.
- `api/store.go`: agent di-key per `subagent_type` dalam satu room (project). Tidak ada
  field tool asal, sehingga dua "lead" dari tool berbeda di project yang sama tabrakan.
- `hooks/agency-notify.sh`: hook Claude; berisi sanitasi secret, pembentukan summary,
  payload, curl (`-m 2`), selalu `exit 0`, dukung `AGENCY_DRY_RUN`. Tes: `agency-notify.check.sh`.
- Hermes: `~/.hermes/config.yaml` punya `hooks:` (`pre_tool_call`, `on_session_end`) dan
  sudah memuat hook `graphify hook-guard` milik Faris.
- Codex: mendukung hook dengan mekanisme trust. Format payload belum diverifikasi.
- agy: `--help` tidak menyebut hook. Mendukung `--print --output-format stream-json`.

## Desain

### 1. Kontrak event dan backend

- `EventPayload` mendapat field opsional `agent` (`claude|codex|agy|hermes`).
  Kosong atau tidak ada berarti `claude`. Hook Claude yang sudah terpasang tidak perlu diubah.
- Nilai `agent` di luar daftar di atas ditolak dengan 400 (hindari label liar di UI).
- `store.go`: key agent menjadi `agent + ":" + subagent_type`.
  Dua lead dari tool berbeda dalam satu room tidak tabrakan.
- `AgentState` dan `RoomState` JSON membawa `agent` agar web bisa membedakan.
- Kompatibilitas: snapshot/ws lama yang tanpa `agent` dibaca sebagai `claude`.

### 2. Emitter bersama `hooks/agency-emit.sh` (baru)

Input lewat env: `AGENT`, `PROJECT`, `SUBAGENT_TYPE`, `EVENT_TYPE`, `TOOL_NAME`, `DETAIL`, `LAST_MSG`.

Memegang semua logika yang kini ada di `agency-notify.sh`:
- sanitasi secret (bearer/basic, key=value kredensial, userinfo URL, string token panjang) untuk `Bash`,
- potong detail 80 karakter, `LAST_MSG` 120 karakter, bentuk `SUMMARY`,
- bangun JSON dengan `jq`, `curl -m 2`, selalu `exit 0`, dukung `AGENCY_DRY_RUN`,
- `SUBAGENT_TYPE` kosong menjadi `lead`.

Satu tempat untuk aturan keamanan; semua tool mewarisinya.

### 3. Adapter per tool (tipis, hanya menerjemahkan)

| Adapter | Pemicu | Catatan |
|---|---|---|
| `agency-notify.sh` | Hook Claude (sudah terpasang) | Diubah jadi adapter: parse payload Claude, panggil emitter dengan `AGENT=claude`. Perilaku keluaran identik. |
| `agency-notify-hermes.sh` | `pre_tool_call`, `on_session_end` di `~/.hermes/config.yaml` | Petakan `terminal`/`execute_code` ke `Bash`, `read_file` ke `Read`, `search_files` ke `Grep`. |
| `agency-notify-codex.sh` | Hook Codex | Format payload dan pemetaan tool diverifikasi di awal plan. Dipasang lewat jalur resmi hook trust, bukan `--dangerously-bypass-hook-trust`. |
| agy | Lihat di bawah | Fallback bertingkat. |

**agy, urutan keputusan (spike di awal plan):**
1. Cek apakah agy atau extension di `~/.antigravity` punya titik hook.
2. Jika tidak: wrapper di sekitar `agy -p --output-format stream-json` yang mem-parse event.
3. Jika tidak ada yang layak: agy ditunda dan dicatat sebagai batas di dokumen ini.
   agy tidak dijanjikan ikut rilis pertama.

### 4. Instalasi `hooks/install.sh`

- Idempoten. Mencetak diff perubahan config sebelum menulis; tidak menimpa hook lain
  (mis. `graphify hook-guard`, `obsidian-check.sh`).
- Mendukung `--dry-run`.
- Menyentuh `~/.claude/settings.json`, `~/.hermes/config.yaml`, config hook Codex.
  Karena ini file di luar repo, jalankan hanya setelah Faris menyetujui diff.

### 5. Web

- Avatar lead diberi warna dan label kecil per tool (Claude, Codex, agy, Hermes) dari `AgentState.agent`.
- Hot desk/guest dan bubble aktivitas yang ada tidak berubah perilaku.

### Penanganan error

- Semua adapter dan emitter fail-silent: backend mati, `jq` atau `curl` hilang, payload tidak terduga,
  semuanya berakhir `exit 0` tanpa menghambat agent.
- Backend menolak `agent` tidak dikenal (400) dan tidak panik pada payload kosong.

## Pengujian

- Go: `events_test.go` dan `store_test.go`.
  - Dua lead beda tool dalam satu room tidak tabrakan.
  - Event lama tanpa `agent` menjadi `claude`.
  - `agent` tidak dikenal ditolak.
- Shell (pola `AGENCY_DRY_RUN`, offline):
  - `agency-emit.check.sh`: secret tersamar, field `agent` terisi, `lead` default.
  - `agency-notify.check.sh` (yang ada) tetap lulus tanpa perubahan ekspektasi.
  - `*.check.sh` per adapter Hermes dan Codex dengan payload contoh nyata.
- Web: `tsc` bersih, E2E manual: event dari tiap tool menghasilkan avatar lead terpisah.

## Risiko

- Format hook Codex bisa berbeda dari dugaan: diverifikasi pertama di plan.
- Mengubah `agency-notify.sh` menyentuh hook yang sedang aktif global: refaktor harus dibuktikan
  identik lewat tes sebelum dipasang.
- agy mungkin tidak bisa dihook: sudah ada jalur keluar (poin 3 di atas).

## Kriteria sukses

1. Event dari Hermes dan Codex tampil sebagai lead terpisah di kantor 3D, project yang sama dengan Claude.
2. Hook Claude lama tetap bekerja tanpa konfigurasi ulang.
3. Tidak ada secret mentah yang terkirim ke backend dari tool mana pun.
4. Status agy terdokumentasi: terpasang atau ditunda dengan alasan.

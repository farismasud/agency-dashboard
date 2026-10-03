# Orch Chain Otomatis (Sub-proyek B)

Tanggal: 2026-10-04
Status: disetujui di chat (desain bagian 1-3), Faris menyatakan tidak perlu persetujuan tambahan selama sesi ini

## Latar belakang

`orch` adalah skrip bash kecil (`~/.local/bin/orch`, tidak ter-versi) di atas antrian task berbasis folder
`Orchestrator/tasks/{todo,doing,done}` di vault Obsidian, dipakai Claude, Codex, agy, Hermes.
`orch done` hanya menambah bagian `## Result` dan memindahkan file. Follow-up (qa, reviewer, scribe) dibuat
manual dan aturan "qa/reviewer/appsec bukan agent yang mengerjakan task itu" hanya tertulis di ROLES.md.
Ini sub-proyek B dari empat (A visibilitas sudah selesai; C konteks bersama; D worker otomatis).

## Tujuan

1. Saat task selesai, task lanjutan dibuat otomatis menurut aturan yang bisa diedit.
2. Aturan agent-beda untuk `qa`, `reviewer`, `appsec` ditegakkan di `orch claim`.
3. `orch` ter-versi dan bisa di-rollback tanpa mengubah perilaku `orch` yang live saat branch berpindah.

## Di luar lingkup

- Agent yang otomatis mengambil task (D). Konteks bersama antar task (C).
- Rantai kondisional berdasarkan hasil (mis. qa gagal), prioritas, tenggat.
- Perubahan dashboard.

## Desain

### 1. Format task

Front-matter task mendapat baris baru, ditulis saat task dibuat otomatis:

- `chain`: id task akar rantai (task akar: id-nya sendiri).
- `parent`: id task yang memicunya.
- `source_agent`: agent yang menyelesaikan task induk.

`orch done` menambah `done_by: <agent>` pada task yang diselesaikan. Task lama tanpa field ini dianggap
akar tanpa batasan claim, sehingga kompatibel mundur.

### 2. Konfigurasi `Orchestrator/chains.txt`

Satu baris per role, `role<TAB>follow1,follow2`, format yang sama dengan `roles.txt`. Default:

```
frontend	qa,reviewer
backend	qa,reviewer
odoo	qa,reviewer
data	qa,reviewer
uiux	qa,reviewer
devops	qa,reviewer
infra	qa,reviewer
```

Role yang tidak terdaftar (pm, analyst, architect, qa, reviewer, docs, scribe, appsec, secops, pentest, grc)
tidak memicu follow-up.

### 3. `orch done <id> <agent> <summary>`

1. Menolak (exit 1, pesan "sudah selesai") bila task sudah ada di `done/`, agar follow-up tidak terduplikasi.
2. Perilaku lama: tambah `## Result`, tambah `done_by`, pindah ke `done/`, catat di `log.md`.
3. Untuk tiap follow-up di `chains.txt` untuk role task itu: buat task baru (`chain`, `parent`,
   `source_agent` terisi). Badannya memuat judul induk, ringkasan hasil, dan `orch show <id induk>`.
   Role yang tidak ada di `roles.txt` memberi peringatan di stderr dan dilewati; `done` tetap berhasil.
4. **Scribe sekali di akhir rantai:** bila role task bukan `scribe`, tidak ada task lain berstatus
   `todo`/`doing` dengan `chain` yang sama, dan belum ada task `scribe` di chain itu (di folder mana pun),
   buat satu task `scribe` (badan: daftar seluruh task rantai dan ringkasan hasilnya).
   Task `scribe` yang selesai tidak memicu apa-apa (anti loop).
5. Log `CHAIN <child> after <parent>` untuk tiap task yang dibuat.

### 4. `orch claim <agent> [role]`

Task dengan role `qa`, `reviewer`, atau `appsec` dilewati bila `source_agent` sama dengan agent yang meng-claim.
Bila semua kandidat dilewati, keluaran tetap `no task` (exit 1). Tidak ada override.

### 5. Pengiriman

Di repo: `orch/orch` (sumber), `orch/chains.txt` (default), `orch/orch.check.sh` (tes), `orch/install.sh`.
`install.sh` membackup `~/.local/bin/orch` ke `orch.bak-<tanggal>`, menyalin skrip baru, dan menyalin
`chains.txt` ke vault hanya bila belum ada (tidak menimpa hasil edit Faris). Yang dipakai agent adalah
salinan di `~/.local/bin`, bukan file repo, jadi pindah branch tidak mengubah perilaku `orch` live.
`install.sh --check` hanya membandingkan salinan live dengan sumber repo dan melapor `ok`/`BEDA`, tanpa menulis apa pun.
`ROLES.md` di vault mendapat satu bagian pendek tentang rantai dan aturan claim.

## Penanganan error

- Kegagalan membuat follow-up (role salah ketik, disk penuh) tidak membatalkan `done`: peringatan di stderr.
- `orch` tidak pernah menghapus file task; hanya membuat, menambah, dan memindah.
- `chains.txt` hilang: tidak ada follow-up dari konfigurasi, aturan scribe tetap jalan.

## Pengujian

`orch/orch.check.sh` dengan `ORCH_HOME` sementara (tidak menyentuh vault asli):

- done pada task `backend` membuat 2 task (`qa`, `reviewer`) dengan `chain`/`parent`/`source_agent` benar.
- scribe dibuat sekali, hanya setelah qa dan reviewer selesai; qa selesai saat reviewer terbuka tidak memicu scribe.
- `analyst` tunggal selesai langsung memicu satu scribe; scribe selesai tidak memicu apa-apa.
- `orch claim` oleh agent pengerja tidak mendapat task `qa`-nya, agent lain mendapat.
- role di `chains.txt` yang tidak dikenal: peringatan, `done` tetap exit 0.
- `done` dua kali pada task yang sama: kedua gagal, tidak ada follow-up ganda.
- task format lama (tanpa field baru) tetap bisa di-claim dan di-done.
- `install.sh` membackup, menyalin, dan tidak menimpa `chains.txt` yang sudah ada.

## Risiko

- Dua agent menyelesaikan task rantai yang sama bersamaan bisa membuat dua scribe (lock hanya `mv`,
  seperti keputusan `orch` yang sudah ada). Tolerable untuk 4 agent; tambah `flock` bila terlihat.
- Salinan live bisa tertinggal dari repo bila `install.sh` lupa dijalankan; `install.sh --check`
  membandingkan keduanya.

## Kriteria sukses

1. `orch done` pada task `backend` menghasilkan task `qa` dan `reviewer`, lalu satu `scribe` setelah keduanya selesai.
2. Agent yang mengerjakan task tidak bisa meng-claim `qa`/`reviewer`/`appsec` dari task itu.
3. Task format lama dan perintah lama (`new`, `ls`, `show`, `roles`) berperilaku sama.
4. `orch` ter-versi di repo dengan tes yang lulus.

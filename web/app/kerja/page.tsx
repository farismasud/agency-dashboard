"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { RoomSelector } from "@/components/RoomSelector";
import { Feed } from "@/components/Feed";
import { Roadmap } from "@/components/Roadmap";
import { useAgencySocket } from "@/lib/useAgencySocket";

const Office = dynamic(() => import("@/components/Office").then((mod) => mod.Office), {
  ssr: false,
  loading: () => (
    <div className="rounded-lg border border-amber-200 h-[440px] flex items-center justify-center text-neutral-500 text-sm">
      Memuat ruangan 3D...
    </div>
  ),
});

export default function KerjaPage() {
  const [project, setProject] = useState<string | null>(null);
  const room = useAgencySocket(project);

  return (
    <main className="min-h-screen bg-neutral-50 text-neutral-900 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Ruang Kerja Tim</h1>
        <RoomSelector selected={project} onSelect={setProject} />
      </div>

      {!project && <div className="text-neutral-500">Pilih project untuk lihat aktivitas.</div>}

      {project && (
        <div className="grid grid-cols-[250px_1fr_300px] gap-4">
          <Feed events={room?.feed ?? []} />
          <Office agents={room?.agents ?? {}} />
          <Roadmap data={room?.roadmap ?? null} />
        </div>
      )}
    </main>
  );
}

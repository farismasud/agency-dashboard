"use client";

import { useEffect, useState } from "react";

const BACKEND_URL = process.env.NEXT_PUBLIC_AGENCY_HTTP_URL || "http://localhost:8090";

export function RoomSelector({
  selected,
  onSelect,
}: {
  selected: string | null;
  onSelect: (project: string) => void;
}) {
  const [projects, setProjects] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function fetchRooms() {
      try {
        const res = await fetch(`${BACKEND_URL}/rooms`);
        const data = await res.json();
        if (!cancelled) setProjects(data.projects || []);
      } catch {
        // backend down: leave list as-is
      }
    }

    fetchRooms();
    const interval = setInterval(fetchRooms, 4000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (projects.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-zinc-500 font-mono bg-zinc-900/80 px-3 py-1.5 rounded-lg border border-zinc-800">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
        <span>Menunggu aktivitas agen...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        className="appearance-none bg-zinc-900/90 text-zinc-200 text-xs font-mono font-medium rounded-lg px-3 py-1.5 pr-8 border border-zinc-700/80 focus:outline-none focus:border-cyan-500 transition-colors shadow-inner cursor-pointer"
        value={selected ?? ""}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="" disabled className="bg-zinc-900 text-zinc-500">
          -- Pilih Project Room --
        </option>
        {projects.map((p) => {
          const shortName = p.split("/").filter(Boolean).slice(-2).join("/");
          return (
            <option key={p} value={p} className="bg-zinc-900 text-zinc-200">
              📁 {shortName || p}
            </option>
          );
        })}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-zinc-400">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}

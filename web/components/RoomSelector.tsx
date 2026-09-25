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
        // backend down: leave list as-is, try again next poll
      }
    }

    fetchRooms();
    const interval = setInterval(fetchRooms, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  if (projects.length === 0) {
    return <div className="text-sm text-gray-500">Belum ada aktivitas agent terdeteksi.</div>;
  }

  return (
    <select
      className="border rounded px-2 py-1"
      value={selected ?? ""}
      onChange={(e) => onSelect(e.target.value)}
    >
      <option value="" disabled>
        Pilih project
      </option>
      {projects.map((p) => (
        <option key={p} value={p}>
          {p}
        </option>
      ))}
    </select>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import type { RoomState } from "./types";

const BACKEND_HOST = process.env.NEXT_PUBLIC_AGENCY_WS_HOST || "localhost:8090";

export function useAgencySocket(project: string | null): RoomState | null {
  const [room, setRoom] = useState<RoomState | null>(null);
  const reconnectDelay = useRef(1000);

  useEffect(() => {
    if (!project) {
      setRoom(null);
      return;
    }

    let ws: WebSocket | null = null;
    let closedByEffect = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const url = `ws://${BACKEND_HOST}/ws?project=${encodeURIComponent(project!)}`;
      ws = new WebSocket(url);

      ws.onmessage = (evt) => {
        try {
          const data = JSON.parse(evt.data) as RoomState;
          setRoom(data);
        } catch {
          // malformed frame: ignore, wait for next message
        }
      };

      ws.onopen = () => {
        reconnectDelay.current = 1000;
      };

      ws.onclose = () => {
        // Stale data (e.g. after a backend restart) is worse than showing
        // nothing: clear immediately rather than freezing the last state.
        setRoom(null);
        if (closedByEffect) return;
        reconnectTimer = setTimeout(connect, reconnectDelay.current);
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 15000);
      };

      // No onerror handler: per the WebSocket spec, a connection error
      // always transitions to closed and fires onclose on its own, which
      // already handles clearing state and scheduling a reconnect. Calling
      // ws.close() again from onerror is redundant and was observed to
      // cause a recursive dispatch loop under repeated connection-refused
      // errors (fast reconnect against a backend that's still down).
    }

    connect();

    return () => {
      closedByEffect = true;
      clearTimeout(reconnectTimer);
      ws?.close();
    };
  }, [project]);

  return room;
}

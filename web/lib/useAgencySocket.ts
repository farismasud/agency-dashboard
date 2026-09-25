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
        if (closedByEffect) return;
        reconnectTimer = setTimeout(connect, reconnectDelay.current);
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 15000);
      };

      ws.onerror = () => {
        ws?.close();
      };
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

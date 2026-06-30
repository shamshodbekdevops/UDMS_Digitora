import { useEffect, useRef, useState, useCallback } from "react";

export type WsStatus = "connecting" | "connected" | "disconnected";

interface UseWebSocketOptions {
  onMessage: (data: unknown) => void;
  enabled?: boolean;
}

export function useWebSocket(url: string, { onMessage, enabled = true }: UseWebSocketOptions) {
  const [status, setStatus] = useState<WsStatus>("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const backoffRef = useRef(1000);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!enabled || !mountedRef.current) return;

    setStatus("connecting");
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      backoffRef.current = 1000;
      setStatus("connected");
    };

    ws.onmessage = (evt) => {
      try {
        onMessage(JSON.parse(evt.data as string));
      } catch {
        // ignore malformed packets
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setStatus("disconnected");
      // Exponential backoff: 1s → 2s → 4s → 8s → 30s max
      const delay = Math.min(backoffRef.current, 30_000);
      backoffRef.current = Math.min(backoffRef.current * 2, 30_000);
      retryRef.current = setTimeout(connect, delay);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [url, enabled, onMessage]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { status };
}

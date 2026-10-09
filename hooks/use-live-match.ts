import { useEffect, useState, useRef } from 'react';

const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws';

export interface WSMessage {
  type: string;
  match_id?: string;
  payload: any;
  timestamp?: number;
}

export function useLiveMatch(matchId: string | null) {
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!matchId) return;

    const wsUrl = `${WS_BASE_URL}/matches/${matchId}`;
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data: WSMessage = JSON.parse(event.data);
        setLastMessage(data);
      } catch (err) {
        console.error('Failed to parse WebSocket message', err);
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [matchId]);

  return { isConnected, lastMessage };
}

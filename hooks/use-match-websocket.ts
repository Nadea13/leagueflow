import { useEffect, useRef, useState, useCallback } from "react";
import { Match, MatchEvent } from "@/types";

export interface MatchWebSocketCallbacks {
    onScoreUpdate?: (data: { match_id: string; home_score: number; away_score: number; status: string }) => void;
    onMatchEvent?: (data: { event: MatchEvent }) => void;
    onMatchEventDelete?: (data: { event_id: string; match_id: string }) => void;
    onMatchUpdate?: (data: { match: Match }) => void;
    onStatusChange?: (data: { match_id: string; status: string }) => void;
    onStandingsSync?: (data: unknown) => void;
}

function getWebSocketUrl(matchId: string): string {
    if (typeof window === "undefined") return "";

    const envWs = process.env.NEXT_PUBLIC_WS_URL;
    if (envWs) {
        let base = envWs.endsWith("/") ? envWs.slice(0, -1) : envWs;
        if (base.endsWith("/ws")) {
            base = base.slice(0, -3);
        }
        return `${base}/ws/matches/${matchId}`;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    if (apiUrl) {
        try {
            const parsed = new URL(apiUrl);
            const protocol = parsed.protocol === "https:" ? "wss:" : "ws:";
            return `${protocol}//${parsed.host}/ws/matches/${matchId}`;
        } catch (_) {}
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.hostname;
    return `${protocol}//${host}:8080/ws/matches/${matchId}`;
}

export function useMatchWebSocket(matchId: string, callbacks: MatchWebSocketCallbacks = {}) {
    const [isConnected, setIsConnected] = useState(false);
    const callbacksRef = useRef(callbacks);
    callbacksRef.current = callbacks;

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const retryCountRef = useRef(0);
    const isDestroyedRef = useRef(false);

    const connectRef = useRef<() => void>(() => {});

    const connect = useCallback(() => {
        if (!matchId || typeof window === "undefined" || isDestroyedRef.current) return;

        // Clean existing
        if (wsRef.current) {
            try {
                wsRef.current.close();
            } catch (_) {}
            wsRef.current = null;
        }

        const url = getWebSocketUrl(matchId);
        if (!url) return;

        try {
            const socket = new WebSocket(url);
            wsRef.current = socket;

            socket.onopen = () => {
                if (isDestroyedRef.current) {
                    socket.close();
                    return;
                }
                setIsConnected(true);
                retryCountRef.current = 0;
            };

            socket.onclose = () => {
                setIsConnected(false);
                if (!isDestroyedRef.current) {
                    // Exponential backoff reconnect
                    const delay = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 10000);
                    retryCountRef.current += 1;
                    if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = setTimeout(() => connectRef.current(), delay);
                }
            };

            socket.onerror = (err) => {
                console.warn("[WebSocket] Match socket error:", err);
                try {
                    socket.close();
                } catch (_) {}
            };

            socket.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    const { type, payload } = message;
                    const cbs = callbacksRef.current;

                    switch (type) {
                        case "score_update":
                            cbs.onScoreUpdate?.(payload);
                            break;
                        case "match_event":
                            cbs.onMatchEvent?.(payload);
                            break;
                        case "match_event_delete":
                            cbs.onMatchEventDelete?.(payload);
                            break;
                        case "match_update":
                            cbs.onMatchUpdate?.(payload);
                            break;
                        case "status_change":
                            cbs.onStatusChange?.(payload);
                            break;
                        case "standings_sync":
                            cbs.onStandingsSync?.(payload);
                            break;
                        default:
                            break;
                    }
                } catch (e) {
                    console.error("[WebSocket] Failed to parse message:", e);
                }
            };
        } catch (err) {
            console.error("[WebSocket] Failed to initiate connection:", err);
            const delay = Math.min(1000 * Math.pow(1.5, retryCountRef.current), 10000);
            retryCountRef.current += 1;
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = setTimeout(() => connectRef.current(), delay);
        }
    }, [matchId]);

    connectRef.current = connect;

    useEffect(() => {
        isDestroyedRef.current = false;
        connect();

        return () => {
            isDestroyedRef.current = true;
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
            if (wsRef.current) {
                try {
                    wsRef.current.close();
                } catch (_) {}
                wsRef.current = null;
            }
        };
    }, [connect]);

    return {
        isConnected,
        reconnect: connect
    };
}

import { useEffect, useRef, useState, useCallback } from 'react';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

// In dev, the CRA proxy (setupProxy.js) forwards /ws → localhost:8080/ws.
// In Docker production, REACT_APP_WS_URL overrides to ws://localhost:8080/ws directly.
const WS_URL = process.env.REACT_APP_WS_URL ||
  `${window.location.protocol}//${window.location.host}/ws`;
const MAX_MESSAGES = 100;

/**
 * useWebSocket — STOMP over SockJS, auto-reconnects every 3s on disconnect.
 * Returns { messages, connected, lastMessage }.
 *
 * Design choices:
 * - clientRef stores the STOMP client (not state) to avoid re-render loops.
 * - lastMessage drives App.jsx state updates via a single useEffect.
 * - messages array is prepend-ordered (newest first), capped at MAX_MESSAGES.
 */
export function useWebSocket(onEvent) {
  const clientRef  = useRef(null);
  const onEventRef = useRef(onEvent);
  const [connected,    setConnected]   = useState(false);
  const [messages,     setMessages]    = useState([]);
  const [lastMessage,  setLastMessage] = useState(null);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  const onMessage = useCallback((frame) => {
    try {
      const msg = JSON.parse(frame.body);
      setLastMessage(msg);
      setMessages(prev => [msg, ...prev].slice(0, MAX_MESSAGES));
      if (onEventRef.current) {
        onEventRef.current(msg);
      }
    } catch (e) {
      console.error('[WS] Failed to parse message:', e);
    }
  }, []);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      reconnectDelay: 3000,
      onConnect: () => {
        console.log('[WS] Connected to', WS_URL);
        setConnected(true);
        client.subscribe('/topic/events', onMessage);
      },
      onDisconnect: () => {
        console.log('[WS] Disconnected — will retry in 3s');
        setConnected(false);
      },
      onStompError: (frame) => {
        console.error('[WS] STOMP error:', frame.headers?.message);
        setConnected(false);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
    };
  }, [onMessage]);

  return { messages, connected, lastMessage };
}

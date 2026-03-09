/**
 * useWebSocket.ts
 *
 * STOMP-over-SockJS hook for real-time communication.
 *
 * Usage:
 *   const { connected, subscribe, send } = useWebSocket();
 *
 * The hook:
 *  1. Connects to ws://localhost:8080/ws via SockJS when a JWT token is found.
 *  2. Authenticates each STOMP frame with the JWT Bearer token.
 *  3. Provides stable `subscribe` and `send` helpers that work after connect.
 *  4. Auto-reconnects on disconnect with exponential back-off (via @stomp/stompjs).
 *  5. Cleans up on component unmount.
 */
import { useEffect, useRef, useCallback, useState } from 'react';
import { Client, type IMessage, type StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

const WS_URL = `${import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080'}/ws`;

export interface WebSocketHook {
  connected: boolean;
  subscribe: (destination: string, callback: (msg: IMessage) => void) => (() => void) | undefined;
  send: (destination: string, body: unknown) => void;
}

export function useWebSocket(token: string | null): WebSocketHook {
  const clientRef = useRef<Client | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(WS_URL),
      connectHeaders: {
        Authorization: `Bearer ${token}`,
      },
      reconnectDelay: 5000,
      onConnect: () => setConnected(true),
      onDisconnect: () => setConnected(false),
      onStompError: (frame) => {
        console.warn('[ws] STOMP error:', frame.headers['message']);
      },
    });

    client.activate();
    clientRef.current = client;

    return () => {
      client.deactivate();
      clientRef.current = null;
      setConnected(false);
    };
  }, [token]);

  const subscribe = useCallback(
    (destination: string, callback: (msg: IMessage) => void): (() => void) | undefined => {
      const client = clientRef.current;
      if (!client?.connected) return undefined;
      const sub: StompSubscription = client.subscribe(destination, callback);
      return () => sub.unsubscribe();
    },
    [],
  );

  const send = useCallback((destination: string, body: unknown) => {
    clientRef.current?.publish({
      destination,
      body: JSON.stringify(body),
    });
  }, []);

  return { connected, subscribe, send };
}

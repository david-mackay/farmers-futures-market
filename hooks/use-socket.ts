'use client';

import { useEffect, useRef } from 'react';
import { getSocket } from '@/lib/socket-client';
import type { ServerToClientEvents } from '@/shared/types';

type EventName = keyof ServerToClientEvents;

export function useSocketEvent<E extends EventName>(
  event: E,
  handler: ServerToClientEvents[E]
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const socket = getSocket();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wrapper = (...args: any[]) => (handlerRef.current as any)(...args);
    (socket as any).on(event, wrapper);
    return () => { (socket as any).off(event, wrapper); };
  }, [event]);
}

export function useSocket() {
  return getSocket();
}

'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useSocket } from './socket-context';
import { getBatchPresence } from './presence-api';
import type { PresenceResponse } from '@mega/shared';

interface PresenceContextValue {
  presenceMap: Map<string, PresenceResponse>;
  trackUsers: (userIds: string[]) => void;
}

const PresenceContext = createContext<PresenceContextValue>({
  presenceMap: new Map(),
  trackUsers: () => {},
});

export function PresenceProvider({ children }: { children: React.ReactNode }) {
  const { socket, isConnected } = useSocket();
  const [presenceMap, setPresenceMap] = useState<Map<string, PresenceResponse>>(new Map());
  const trackedUsersRef = useRef<Set<string>>(new Set());
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const trackUsers = useCallback((userIds: string[]) => {
    let hasNew = false;
    for (const id of userIds) {
      if (!trackedUsersRef.current.has(id)) {
        trackedUsersRef.current.add(id);
        hasNew = true;
      }
    }

    if (hasNew) {
      // Debounce batch fetch
      if (fetchTimeoutRef.current) clearTimeout(fetchTimeoutRef.current);
      fetchTimeoutRef.current = setTimeout(async () => {
        const ids = Array.from(trackedUsersRef.current);
        if (ids.length === 0) return;
        try {
          const results = await getBatchPresence(ids);
          setPresenceMap((prev) => {
            const next = new Map(prev);
            for (const r of results) {
              next.set(r.userId, r);
            }
            return next;
          });
        } catch (error) {
          console.error('Failed to fetch batch presence:', error);
        }
      }, 200);
    }
  }, []);

  useEffect(() => {
    if (!socket || !isConnected) return;

    const handlePresenceUpdate = (data: PresenceResponse) => {
      setPresenceMap((prev) => {
        const next = new Map(prev);
        next.set(data.userId, data);
        return next;
      });
    };

    socket.on('presence:update', handlePresenceUpdate);

    return () => {
      socket.off('presence:update', handlePresenceUpdate);
    };
  }, [socket, isConnected]);

  return (
    <PresenceContext.Provider value={{ presenceMap, trackUsers }}>
      {children}
    </PresenceContext.Provider>
  );
}

export function usePresence() {
  return useContext(PresenceContext);
}

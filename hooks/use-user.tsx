'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '@/shared/types';
import { api, setCurrentUserId } from '@/lib/api-client';
import { useAppKitAccount } from '@reown/appkit/react';
import { appkitProjectId } from '@/config/appkit-config';

interface UserContextType {
  user: User | null;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  refreshUser: async () => {},
  loading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAppKitAccount();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appkitProjectId) {
      setUser(null);
      setCurrentUserId(null);
      if (typeof window !== 'undefined') localStorage.removeItem('currentUserId');
      setLoading(false);
      return;
    }
    if (!isConnected || !address) {
      setUser(null);
      setCurrentUserId(null);
      if (typeof window !== 'undefined') localStorage.removeItem('currentUserId');
      setLoading(false);
      return;
    }
    setLoading(true);
    api
      .post<User>('/api/auth/session', { address })
      .then((appUser) => {
        setUser(appUser);
        setCurrentUserId(appUser.id);
        if (typeof window !== 'undefined') localStorage.setItem('currentUserId', appUser.id);
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [isConnected, address]);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    const updated = await api.get<User>(`/api/users/${user.id}`);
    setUser(updated);
  }, [user]);

  return (
    <UserContext.Provider value={{ user, refreshUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

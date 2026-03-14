'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '@/shared/types';
import { api, setCurrentUserId } from '@/lib/api-client';

interface UserContextType {
  user: User | null;
  users: User[];
  switchUser: (id: string) => void;
  refreshUser: () => Promise<void>;
  loading: boolean;
}

const UserContext = createContext<UserContextType>({
  user: null,
  users: [],
  switchUser: () => {},
  refreshUser: async () => {},
  loading: true,
});

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<User[]>('/api/users').then((allUsers) => {
      setUsers(allUsers);
      const savedId = typeof window !== 'undefined' ? localStorage.getItem('currentUserId') : null;
      const initial = savedId ? allUsers.find(u => u.id === savedId) : allUsers[0];
      if (initial) {
        setUser(initial);
        setCurrentUserId(initial.id);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const switchUser = useCallback((id: string) => {
    const found = users.find(u => u.id === id);
    if (found) {
      setUser(found);
      setCurrentUserId(found.id);
      if (typeof window !== 'undefined') localStorage.setItem('currentUserId', id);
    }
  }, [users]);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    const updated = await api.get<User>(`/api/users/${user.id}`);
    setUser(updated);
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
  }, [user]);

  return (
    <UserContext.Provider value={{ user, users, switchUser, refreshUser, loading }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { User } from '@/shared/types';
import { api, setCurrentUserId } from '@/lib/api-client';
import { useAppKitAccount } from '@reown/appkit/react';
import { appkitProjectId } from '@/config/appkit-config';

interface SessionResponse {
  user: User;
  signupBonusSent?: boolean;
}

interface UserContextType {
  user: User | null;
  refreshUser: () => Promise<void>;
  loading: boolean;
  showSignupBonusModal: boolean;
  dismissSignupBonusModal: () => void;
}

const SIGNUP_BONUS_DISMISSED_KEY = 'ffm_signup_bonus_dismissed';

const UserContext = createContext<UserContextType>({
  user: null,
  refreshUser: async () => {},
  loading: true,
  showSignupBonusModal: false,
  dismissSignupBonusModal: () => {},
});

export function UserProvider({ children }: { children: ReactNode }) {
  const { address, isConnected } = useAppKitAccount();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSignupBonusModal, setShowSignupBonusModal] = useState(false);

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
      .post<SessionResponse>('/api/auth/session', { address })
      .then((data) => {
        const appUser = data.user;
        setUser(appUser);
        setCurrentUserId(appUser.id);
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentUserId', appUser.id);
          const dismissed = sessionStorage.getItem(SIGNUP_BONUS_DISMISSED_KEY);
          if (data.signupBonusSent && !dismissed) setShowSignupBonusModal(true);
        } else if (data.signupBonusSent) {
          setShowSignupBonusModal(true);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, [isConnected, address]);

  const refreshUser = useCallback(async () => {
    if (!user) return;
    const updated = await api.get<User>(`/api/users/${user.id}`);
    setUser(updated);
  }, [user]);

  const dismissSignupBonusModal = useCallback(() => {
    setShowSignupBonusModal(false);
    if (typeof window !== 'undefined') sessionStorage.setItem(SIGNUP_BONUS_DISMISSED_KEY, '1');
  }, []);

  return (
    <UserContext.Provider
      value={{
        user,
        refreshUser,
        loading,
        showSignupBonusModal,
        dismissSignupBonusModal,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  return useContext(UserContext);
}

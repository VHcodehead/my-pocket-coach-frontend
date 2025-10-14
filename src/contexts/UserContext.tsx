// Global user context for storing profile data across the app
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI } from '../services/api';
import { UserProfile } from '../types';

interface UserContextType {
  profile: UserProfile | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      console.log('[USER_CONTEXT] Loading user profile');
      const response = await authAPI.me();

      if (response.success && response.data) {
        // Backend returns { data: { user: { ... } } }, extract the user
        const userData = response.data.user || response.data;
        setProfile(userData);
        console.log('[USER_CONTEXT] Profile loaded:', userData.email);
      } else {
        console.log('[USER_CONTEXT] No authenticated user');
        setProfile(null);
      }
    } catch (error) {
      console.error('[USER_CONTEXT] Error loading profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const refreshProfile = async () => {
    setLoading(true);
    await loadProfile();
  };

  return (
    <UserContext.Provider value={{ profile, loading, refreshProfile }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}

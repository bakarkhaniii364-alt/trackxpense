import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { Session, User } from '@supabase/supabase-js';
import * as StorageService from '../services/storage';

export const useAuth = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(() => {
    return localStorage.getItem('tx_guest_mode') === 'true';
  });

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session) {
        if (localStorage.getItem('tx_guest_mode') === 'true') {
          localStorage.setItem('tx_needs_migration', 'true');
        }
        setIsGuest(false);
        localStorage.removeItem('tx_guest_mode');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const continueAsGuest = () => {
    setIsGuest(true);
    localStorage.setItem('tx_guest_mode', 'true');
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    await StorageService.clearAppData();
    setIsGuest(false);
    localStorage.removeItem('tx_guest_mode');
    window.location.reload();
  };

  return {
    session,
    user,
    loading,
    isGuest,
    continueAsGuest,
    signOut,
    isAuthenticated: !!session || isGuest
  };
};

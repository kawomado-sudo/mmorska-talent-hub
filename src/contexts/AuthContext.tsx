import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseAuth, supabasePublic } from '@/integrations/supabase/client';

interface UserProfile {
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'recruiter' | 'viewer';
  has_hr_access: boolean;
  avatar_url?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signInWithAzure: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession]   = useState<Session | null>(null);
  const [user, setUser]         = useState<User | null>(null);
  const [profile, setProfile]   = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin]   = useState(false);
  const [loading, setLoading]   = useState(true);

  const loadProfile = async (userId: string, email: string) => {
    try {
      // KROK 1 — sanity check: czy pracownik aktywny?
      const { data: member } = await supabasePublic
        .from('team_members_public')
        .select('full_name, avatar_url, active')
        .eq('auth_user_id', userId)
        .maybeSingle();

      if (!member || member.active !== true) {
        setProfile({ full_name: email.split('@')[0], email, role: 'viewer', has_hr_access: false });
        return;
      }

      // KROK 2 — rola z hr.hr_user_access
      const { data: accessData } = await supabase
        .from('hr_user_access')
        .select('role, active')
        .eq('auth_user_id', userId)
        .maybeSingle();

      const hasHrAccess = !!accessData && accessData.active === true;
      const role = (hasHrAccess ? accessData.role : 'viewer') as UserProfile['role'];

      setProfile({
        full_name:     member.full_name || email.split('@')[0],
        email,
        avatar_url:    member.avatar_url ?? undefined,
        role,
        has_hr_access: hasHrAccess,
      });
      setIsAdmin(role === 'admin' || role === 'manager');
    } catch (e) {
      console.error('loadProfile error:', e);
      setProfile({ full_name: email.split('@')[0], email, role: 'viewer', has_hr_access: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000);

    // supabaseAuth (bez schema override) — poprawna obsługa sesji OAuth
    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange((_event, newSession) => {
      clearTimeout(timeout);
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setTimeout(() => loadProfile(newSession.user.id, newSession.user.email ?? ''), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    supabaseAuth.auth.getSession().then(({ data: { session: s } }) => {
      if (!s) {
        clearTimeout(timeout);
        setLoading(false);
      }
    });

    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  const signInWithAzure = async () => {
    await supabaseAuth.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: window.location.origin + '/jobs',
        scopes: 'openid profile email',
      },
    });
  };

  const signOut = async () => {
    await supabaseAuth.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin, loading, signInWithAzure, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

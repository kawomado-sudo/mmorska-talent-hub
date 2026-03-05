import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase, supabaseCore } from '@/integrations/supabase/client';

interface UserProfile {
  full_name: string;
  email: string;
  avatar_url?: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  has_hr_access: boolean;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isAdmin: false,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string, email: string) => {
    const { data: roleData } = await supabaseCore
      .from('team_members_public')
      .select('full_name, avatar_url, role')
      .eq('auth_user_id', userId)
      .maybeSingle();

    const role = (roleData?.role ?? 'user') as UserProfile['role'];
    setProfile({
      full_name: roleData?.full_name || email.split('@')[0],
      email,
      avatar_url: roleData?.avatar_url ?? undefined,
      role,
      has_hr_access: true,
    });
    setIsAdmin(role === 'admin' || role === 'manager');
    setLoading(false);
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id, session.user.email ?? '');
      } else {
        setProfile(null);
        setIsAdmin(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadProfile(session.user.id, session.user.email ?? '');
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user ?? null, profile, isAdmin, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { createClient } from '@supabase/supabase-js';

const supabasePublic = createClient(
  "https://opdpjplccytlzadjpdsd.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9wZHBqcGxjY3l0bHphZGpwZHNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzMDMwMTIsImV4cCI6MjA3Njg3OTAxMn0.-E7lNQ_tMRPg7ImwNgJIJa1WSUZOJLp_glmWtFix7VE",
  { db: { schema: 'public' } }
);

interface UserProfile {
  full_name: string;
  email: string;
  role: string;
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
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (userId: string, email: string) => {
    try {
      const { data: member } = await supabasePublic
        .from('team_members_public')
        .select('full_name, avatar_url, role, active')
        .eq('auth_user_id', userId)
        .maybeSingle();

      const hasAccess = !!member && member.active === true;
      const role = member?.role ?? 'user';

      setProfile({
        full_name: member?.full_name || email.split('@')[0],
        email,
        avatar_url: member?.avatar_url ?? undefined,
        role,
        has_hr_access: hasAccess,
      });
      setIsAdmin(role === 'admin' || role === 'manager');
    } catch (e) {
      setProfile({ full_name: email.split('@')[0], email, role: 'user', has_hr_access: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 5000);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, newSession) => {
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
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!s) setLoading(false);
    });
    return () => { clearTimeout(timeout); subscription.unsubscribe(); };
  }, []);

  const signInWithAzure = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: { redirectTo: window.location.origin + '/jobs', scopes: 'openid profile email' },
    });
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <AuthContext.Provider value={{ session, user, profile, isAdmin, loading, signInWithAzure, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabaseAuth } from '@/integrations/supabase/client';
import { hrApi } from '@/lib/hr-api';

const ADMIN_EMAILS = ['support@mmorska.pl', 'dobrochna.mankowska@mmorska.pl'];

interface UserProfile {
  full_name: string;
  email: string;
  role: 'admin' | 'manager' | 'recruiter' | 'reviewer' | 'viewer';
  has_hr_access: boolean;
  is_reviewer: boolean;
  avatar_url?: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  isAdmin: boolean;
  isReviewer: boolean;
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
  const [isReviewer, setIsReviewer] = useState(false);
  const [loading, setLoading]   = useState(true);

  const loadProfile = async (userId: string, email: string) => {
    try {
      // Pobierz dane z team_members_public
      const { data: member } = await supabaseAuth
        .from('team_members_public')
        .select('full_name, avatar_url, active')
        .eq('auth_user_id', userId)
        .maybeSingle();

      const fullName = member?.full_name || email.split('@')[0];
      const avatarUrl = member?.avatar_url ?? undefined;

      // Sprawdź czy admin (hardcoded lista)
      const emailLower = email.toLowerCase();
      if (ADMIN_EMAILS.includes(emailLower)) {
        setProfile({
          full_name: fullName,
          email,
          avatar_url: avatarUrl,
          role: 'admin',
          has_hr_access: true,
          is_reviewer: false,
        });
        setIsAdmin(true);
        setIsReviewer(false);
        return;
      }

      // Nie-admin → sprawdź czy recenzent
      let reviewerFlag = false;
      try {
        const reviewerCheck = await hrApi('check_is_reviewer');
        reviewerFlag = reviewerCheck?.is_reviewer === true;
      } catch {
        // Ignore
      }

      setIsReviewer(reviewerFlag);
      setIsAdmin(false);
      setProfile({
        full_name: fullName,
        email,
        avatar_url: avatarUrl,
        role: reviewerFlag ? 'reviewer' : 'viewer',
        has_hr_access: reviewerFlag,
        is_reviewer: reviewerFlag,
      });
    } catch (e) {
      console.error('loadProfile error:', e);
      setProfile({ full_name: email.split('@')[0], email, role: 'viewer', has_hr_access: false, is_reviewer: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => setLoading(false), 8000);

    const { data: { subscription } } = supabaseAuth.auth.onAuthStateChange((_event, newSession) => {
      clearTimeout(timeout);
      setSession(newSession);
      setUser(newSession?.user ?? null);
      if (newSession?.user) {
        setTimeout(() => loadProfile(newSession.user.id, newSession.user.email ?? ''), 0);
      } else {
        setProfile(null);
        setIsAdmin(false);
        setIsReviewer(false);
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
    <AuthContext.Provider value={{ session, user, profile, isAdmin, isReviewer, loading, signInWithAzure, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import morskaLogo from '@/assets/mmorska-logo.png';

const Login = () => {
  const { session, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Ładowanie...</div>
      </div>
    );
  }

  if (session) {
    return <Navigate to="/jobs" replace />;
  }

  const handleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'azure',
      options: {
        redirectTo: window.location.origin + '/jobs',
      },
    });
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8">
        <img src={morskaLogo} alt="MMorska logo" className="h-16 w-auto" />
        <Button onClick={handleLogin} size="lg" className="gap-2">
          <svg viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5">
            <rect x="1" y="1" width="9" height="9" fill="currentColor" opacity="0.8"/>
            <rect x="11" y="1" width="9" height="9" fill="currentColor" opacity="0.6"/>
            <rect x="1" y="11" width="9" height="9" fill="currentColor" opacity="0.6"/>
            <rect x="11" y="11" width="9" height="9" fill="currentColor" opacity="0.4"/>
          </svg>
          Zaloguj przez Microsoft
        </Button>
      </div>
    </div>
  );
};

export default Login;

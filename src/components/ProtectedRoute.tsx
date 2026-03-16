import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, loading, profile } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Ładowanie...</div>
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // Czekaj na załadowanie profilu
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Ładowanie profilu...</div>
      </div>
    );
  }

  // Blokuj użytkowników bez dostępu HR
  if (!profile.has_hr_access) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <h1 className="font-heading text-2xl font-bold text-foreground">Brak dostępu</h1>
        <p className="text-muted-foreground text-center max-w-md">
          Nie masz uprawnień do korzystania z tej aplikacji. Skontaktuj się z administratorem, aby uzyskać dostęp.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};

import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const AppLayout = () => {
  const { signOut, isReviewer, isAdmin } = useAuth();

  const navItems = [
    { to: '/jobs', label: 'Ogłoszenia', icon: Briefcase, visible: true },
    { to: '/settings', label: 'Ustawienia', icon: Settings, visible: isAdmin },
  ].filter((item) => item.visible);

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="flex h-14 items-center gap-2 border-b border-sidebar-border px-4">
          <span className="font-heading text-lg font-bold text-sidebar-foreground">MMorska Talent Hub</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent/50'
                }`
              }
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-sidebar-border p-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={signOut}
            className="w-full justify-start gap-2 text-sidebar-foreground"
          >
            <LogOut className="h-4 w-4" />
            Wyloguj
          </Button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
};

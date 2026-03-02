import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  LayoutDashboard, 
  PlusCircle, 
  FileText, 
  FolderOpen, 
  Users, 
  Megaphone, 
  Layers,
  BarChart3, 
  Settings, 
  ChevronLeft,
  ChevronRight,
  LogOut,
  Shield,
  CalendarDays,
  Star,
  ClipboardList
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { logout } from '@/lib/auth';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuthOptional } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  roles?: string[];
}

const mainNavItems: NavItem[] = [
  { label: 'Tableau de bord', icon: LayoutDashboard, href: '/' },
  { label: 'Soumettre une requête', icon: PlusCircle, href: '/submit' },
  { label: 'Mes requêtes', icon: FileText, href: '/tickets' },
  { label: 'Calendrier', icon: CalendarDays, href: '/calendar' },
  { label: 'Pôles', icon: Layers, href: '/poles' },
  { label: 'Documents', icon: FolderOpen, href: '/documents' },
  { label: 'Délégués', icon: Users, href: '/delegates' },
  { label: 'Communication', icon: Megaphone, href: '/communication' },
  { label: 'Notation des entreprises', icon: Star, href: '/notations-entreprises' },
];

const adminNavItems: NavItem[] = [
  { label: 'Rapports', icon: BarChart3, href: '/reports', roles: ['admin', 'super_admin'] },
  { label: 'Administration', icon: Shield, href: '/admin', roles: ['admin', 'super_admin'] },
  { label: 'Modèles d\'activité', icon: ClipboardList, href: '/admin/activite-templates', roles: ['admin', 'super_admin'] },
];

const bottomNavItems: NavItem[] = [
  { label: 'Paramètres', icon: Settings, href: '/settings' },
];

interface AppSidebarProps {
  isCollapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function AppSidebar({ isCollapsed, onCollapsedChange }: AppSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuthOptional();
  const userRole = auth?.profile?.role;

  const visibleAdminNavItems = adminNavItems.filter(
    (item) => !item.roles || (userRole && item.roles.includes(userRole))
  );

  const handleLogout = async () => {
    try {
      await logout();
      auth?.setProfile(null);
    } finally {
      navigate('/login');
    }
  };

  const isActive = (href: string) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  const renderNavItem = (item: NavItem) => {
    const Icon = item.icon;
    const active = isActive(item.href);

    const linkContent = (
      <NavLink
        to={item.href}
        className={cn(
          'sidebar-item',
          active && 'sidebar-item-active'
        )}
      >
        <Icon className={cn('w-5 h-5 shrink-0', active && 'text-sidebar-primary')} />
        {!isCollapsed && (
          <span className="truncate">{item.label}</span>
        )}
      </NavLink>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.href} delayDuration={0}>
          <TooltipTrigger asChild>
            {linkContent}
          </TooltipTrigger>
          <TooltipContent side="right" className="font-medium">
            {item.label}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <div key={item.href}>{linkContent}</div>;
  };

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen flex flex-col',
        'bg-sidebar text-sidebar-foreground',
        'border-r border-sidebar-border',
        'transition-all duration-300 ease-in-out',
        isCollapsed ? 'w-16' : 'w-64'
      )}
      style={{ background: 'var(--gradient-sidebar)' }}
    >
      {/* Logo */}
      <div className={cn(
        'flex items-center h-16 px-4 border-b border-sidebar-border',
        isCollapsed ? 'justify-center' : 'justify-between'
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
              <img
                src="/secea-logo.svg"
                alt="S.N.E.C.E.A"
                className="w-4 h-4"
              />
            </div>
            <span className="font-semibold text-sidebar-foreground">S.N.E.C.E.A</span>
          </div>
        )}
        {isCollapsed && (
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center">
            <img
              src="/secea-logo.svg"
              alt="S.N.E.C.E.A"
              className="w-4 h-4"
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {mainNavItems.map(renderNavItem)}
        
        <Separator className="my-4 bg-sidebar-border" />
        
        {visibleAdminNavItems.map(renderNavItem)}
      </nav>

      {/* Bottom section */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        {bottomNavItems.map(renderNavItem)}
        
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
              onClick={handleLogout}
            >
              <LogOut className="w-5 h-5 shrink-0" />
              {!isCollapsed && <span>Déconnexion</span>}
            </button>
          </TooltipTrigger>
          {isCollapsed && (
            <TooltipContent side="right" className="font-medium">
              Déconnexion
            </TooltipContent>
          )}
        </Tooltip>
      </div>

      {/* Collapse button */}
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          'absolute -right-3 top-20 w-6 h-6 rounded-full',
          'bg-sidebar-accent border border-sidebar-border',
          'hover:bg-sidebar-primary hover:text-sidebar-primary-foreground',
          'transition-colors duration-200'
        )}
        onClick={() => onCollapsedChange(!isCollapsed)}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </Button>
    </aside>
  );
}

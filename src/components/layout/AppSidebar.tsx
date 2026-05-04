import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
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
  ChevronDown,
  LogOut,
  Shield,
  CalendarDays,
  CalendarCheck,
  Star,
  ClipboardList,
  Building2,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth, useAcl } from '@/contexts/AuthContext';
import type { Feature } from '@/lib/acl';
import { fetchMyActivityTypes } from '@/lib/api/activityTypes';

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  /** La feature ACL correspondante (filtrée automatiquement) */
  feature?: Feature;
}

const mainNavItems: NavItem[] = [
  { label: 'Tableau de bord', icon: LayoutDashboard, href: '/', feature: 'dashboard' },
  { label: 'Soumettre une requête', icon: PlusCircle, href: '/submit', feature: 'submit_request' },
  { label: 'Mes requêtes', icon: FileText, href: '/tickets', feature: 'tickets' },
  { label: 'Requêtes internes', icon: ClipboardList, href: '/internal-tickets', feature: 'internal_tickets' },
  { label: 'Calendrier', icon: CalendarDays, href: '/calendar', feature: 'calendar' },
  { label: 'Pôles', icon: Layers, href: '/poles', feature: 'poles' },
  { label: 'Bureau Exécutif', icon: Building2, href: '/bureau', feature: 'admin' },
  { label: 'Documents', icon: FolderOpen, href: '/documents', feature: 'documents' },
  { label: 'Délégués', icon: Users, href: '/delegates', feature: 'delegates' },
  { label: 'Communication', icon: Megaphone, href: '/communication', feature: 'communication' },
  { label: 'Notation entreprises', icon: Star, href: '/company-ratings', feature: 'company_ratings' },
];

const adminNavItems: NavItem[] = [
  { label: 'Rapports', icon: BarChart3, href: '/reports', feature: 'reports' },
  { label: 'Administration', icon: Shield, href: '/admin', feature: 'admin' },
];

const bottomNavItems: NavItem[] = [
  { label: 'Paramètres', icon: Settings, href: '/settings', feature: 'admin' },
];

interface AppSidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (value: boolean) => void;
}

export function AppSidebar({ isCollapsed, setIsCollapsed }: AppSidebarProps) {
  const [activitiesOpen, setActivitiesOpen] = useState(false);
  const location = useLocation();
  const { logout } = useAuth();
  const { can } = useAcl();

  /** Filtre les items selon l'ACL */
  const filterByAcl = (items: NavItem[]) =>
    items.filter((item) => !item.feature || can(item.feature));

  const visibleMainItems = filterByAcl(mainNavItems);
  const visibleAdminItems = filterByAcl(adminNavItems);

  const showActivities = can('activities');
  const { data: myActivityTypes = [] } = useQuery({
    queryKey: ['my-activity-types'],
    queryFn: fetchMyActivityTypes,
    staleTime: 5 * 60 * 1000,
    enabled: showActivities,
  });

  const activitiesActive = location.pathname.startsWith('/activities');

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
        'flex items-center border-b border-sidebar-border',
        isCollapsed ? 'justify-center h-16 px-2' : 'justify-between h-20 px-4'
      )}>
        {!isCollapsed && (
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0 border border-white/15">
              <img
                src="/snecea-logo.svg"
                alt="S.N.E.C.E.A"
                className="w-7 h-7"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
            </div>
            <div className="min-w-0">
              <p className="font-black text-sm tracking-widest text-sidebar-foreground leading-none">
                S.N.E.C.E.A
              </p>
              <p className="text-[9px] text-sidebar-foreground/50 leading-tight mt-0.5 truncate">
                Syndicat des Cadres d'Assurances
              </p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center border border-white/15 cursor-default">
                <img
                  src="/snecea-logo.svg"
                  alt="S.N.E.C.E.A"
                  className="w-6 h-6"
                  style={{ filter: 'brightness(0) invert(1)' }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-semibold">
              S.N.E.C.E.A
            </TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {visibleMainItems.map(renderNavItem)}

        {/* Activités — dynamic submenu (masqué temporairement) */}
        {false && showActivities && (
          <>
            {isCollapsed ? (
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <NavLink
                    to="/activities"
                    className={cn('sidebar-item', activitiesActive && 'sidebar-item-active')}
                  >
                    <CalendarCheck className={cn('w-5 h-5 shrink-0', activitiesActive && 'text-sidebar-primary')} />
                  </NavLink>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-medium">
                  Activités
                </TooltipContent>
              </Tooltip>
            ) : (
              <div>
                <button
                  onClick={() => setActivitiesOpen(!activitiesOpen)}
                  className={cn('sidebar-item w-full justify-between', activitiesActive && 'sidebar-item-active')}
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <CalendarCheck className={cn('w-5 h-5 shrink-0', activitiesActive && 'text-sidebar-primary')} />
                    <span className="truncate">Activités</span>
                  </span>
                  <ChevronDown className={cn(
                    'w-4 h-4 shrink-0 transition-transform duration-200',
                    activitiesOpen && 'rotate-180'
                  )} />
                </button>
                {activitiesOpen && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-sidebar-border pl-2">
                    <NavLink
                      to="/activities"
                      end
                      className={({ isActive }) =>
                        cn('sidebar-item text-sm py-1.5', isActive && 'sidebar-item-active')
                      }
                    >
                      <span className="truncate">Toutes</span>
                    </NavLink>
                    {myActivityTypes.map((at) => (
                      <NavLink
                        key={at.id}
                        to={`/activities/${at.code}`}
                        className={({ isActive }) =>
                          cn('sidebar-item text-sm py-1.5', isActive && 'sidebar-item-active')
                        }
                      >
                        <span className="truncate">{at.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
        
        {visibleAdminItems.length > 0 && (
          <>
            <Separator className="my-4 bg-sidebar-border" />
            {visibleAdminItems.map(renderNavItem)}
          </>
        )}
      </nav>

      {/* Bottom section */}
      <div className="p-2 border-t border-sidebar-border space-y-1">
        {filterByAcl(bottomNavItems).map(renderNavItem)}
        
        <Tooltip delayDuration={0}>
          <TooltipTrigger asChild>
            <button
              onClick={logout}
              className="sidebar-item w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
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
        onClick={() => setIsCollapsed(!isCollapsed)}
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

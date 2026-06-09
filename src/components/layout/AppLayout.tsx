import { useState } from 'react';
import { Outlet, useOutletContext } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';

type LayoutContext = {
  setSidebarCollapsed: (v: boolean) => void;
};

export function AppLayout() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div className={`${isCollapsed ? 'pl-16' : 'pl-64'} transition-all duration-300`}>
        <TopBar />
        <main className="p-6">
          <Outlet context={{ setSidebarCollapsed: setIsCollapsed } satisfies LayoutContext} />
        </main>
      </div>
    </div>
  );
}

export function useLayoutContext() {
  return useOutletContext<LayoutContext>();
}

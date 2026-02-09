import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import { PERMISSIONS } from "@/lib/acl";
import Dashboard from "@/pages/Dashboard";
import SubmitRequest from "@/pages/SubmitRequest";
import TicketsList from "@/pages/TicketsList";
import TicketDetail from "@/pages/TicketDetail";
import Calendar from "@/pages/Calendar";
import Poles from "@/pages/Poles";
import Delegates from "@/pages/Delegates";
import Documents from "@/pages/Documents";
import Communication from "@/pages/Communication";
import Settings from "@/pages/Settings";
import Admin from "@/pages/Admin";
import Reports from "@/pages/Reports";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Auth routes (public) */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected app routes — ACL-gated */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                {/* Accessible à tous les authentifiés */}
                <Route path="/" element={<Dashboard />} />
                <Route path="/tickets" element={<TicketsList />} />
                <Route path="/tickets/:id" element={<TicketDetail />} />
                <Route path="/delegates" element={<Delegates />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/communication" element={<Communication />} />
                <Route path="/settings" element={<Settings />} />

                {/* Soumission de requête — pas hr_liaison ni auditor */}
                <Route element={<ProtectedRoute allowedRoles={PERMISSIONS.submit_request} />}>
                  <Route path="/submit" element={<SubmitRequest />} />
                </Route>

                {/* Calendrier — pas auditor */}
                <Route element={<ProtectedRoute allowedRoles={PERMISSIONS.calendar} />}>
                  <Route path="/calendar" element={<Calendar />} />
                </Route>

                {/* Pôles — admin, syndic_admin, pole_manager, pole_member, auditor */}
                <Route element={<ProtectedRoute allowedRoles={PERMISSIONS.poles} />}>
                  <Route path="/poles" element={<Poles />} />
                </Route>

                {/* Rapports — management + auditor */}
                <Route element={<ProtectedRoute allowedRoles={PERMISSIONS.reports} />}>
                  <Route path="/reports" element={<Reports />} />
                </Route>

                {/* Administration — super_admin + syndic_admin */}
                <Route element={<ProtectedRoute allowedRoles={PERMISSIONS.admin} />}>
                  <Route path="/admin" element={<Admin />} />
                </Route>
              </Route>
            </Route>
            
            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

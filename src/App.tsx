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
import Bureau from "@/pages/Bureau";
import Documents from "@/pages/Documents";
import Communication from "@/pages/Communication";
import Settings from "@/pages/Settings";
import Profile from "@/pages/Profile";
import Admin from "@/pages/Admin";
import Reports from "@/pages/Reports";
import MesActivites from "@/pages/MesActivites";
import CompanyRatings from "@/pages/CompanyRatings";
import InternalTickets from "@/pages/InternalTickets";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/NotFound";
import Cms from "@/pages/Cms";

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
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

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
                <Route path="/profile" element={<Profile />} />

                {/* Soumission de requête — accessible à tout utilisateur connecté */}
                <Route path="/submit" element={<SubmitRequest />} />

                {/* Calendrier — pas auditor */}
                <Route element={<ProtectedRoute allowedRoles={PERMISSIONS.calendar} />}>
                  <Route path="/calendar" element={<Calendar />} />
                </Route>

                {/* Pôles — admin, syndic_admin, pole_manager, pole_member, auditor */}
                <Route element={<ProtectedRoute allowedRoles={PERMISSIONS.poles} />}>
                  <Route path="/poles" element={<Poles />} />
                  <Route path="/bureau" element={<Bureau />} />
                </Route>

                {/* Activités — tous sauf auditor */}
                <Route element={<ProtectedRoute allowedRoles={PERMISSIONS.activities} />}>
                  <Route path="/activities" element={<MesActivites />} />
                  <Route path="/activities/:typeCode" element={<MesActivites />} />
                </Route>

                {/* Activités internes */}
                <Route element={<ProtectedRoute allowedRoles={PERMISSIONS.internal_tickets} />}>
                  <Route path="/internal-tickets" element={<InternalTickets />} />
                  <Route path="/internal-tickets/:id" element={<TicketDetail />} />
                </Route>

                <Route element={<ProtectedRoute allowedRoles={PERMISSIONS.company_ratings} />}>
                  <Route path="/company-ratings" element={<CompanyRatings />} />
                </Route>

                {/* Rapports — management + auditor */}
                <Route element={<ProtectedRoute allowedRoles={PERMISSIONS.reports} />}>
                  <Route path="/reports" element={<Reports />} />
                </Route>

                {/* Administration — super_admin + syndic_admin */}
                <Route element={<ProtectedRoute allowedRoles={PERMISSIONS.admin} />}>
                  <Route path="/admin" element={<Admin />} />
                  <Route path="/cms" element={<Cms />} />
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

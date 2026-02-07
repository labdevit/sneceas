import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/layout/AppLayout";
import Dashboard from "@/pages/Dashboard";
import SubmitRequest from "@/pages/SubmitRequest";
import TicketsList from "@/pages/TicketsList";
import TicketDetail from "@/pages/TicketDetail";
import Calendar from "@/pages/Calendar";
import Poles from "@/pages/Poles";
import Delegates from "@/pages/Delegates";
import Documents from "@/pages/Documents";
import Communication from "@/pages/Communication";
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
            
            {/* Protected app routes — any authenticated user */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/submit" element={<SubmitRequest />} />
                <Route path="/tickets" element={<TicketsList />} />
                <Route path="/tickets/:id" element={<TicketDetail />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/poles" element={<Poles />} />
                <Route path="/delegates" element={<Delegates />} />
                <Route path="/documents" element={<Documents />} />
                <Route path="/communication" element={<Communication />} />
                <Route path="/reports" element={<Reports />} />

                {/* Admin only */}
                <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
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

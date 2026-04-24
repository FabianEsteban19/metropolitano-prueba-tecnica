import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/lib/auth/AuthContext";
import { ProtectedRoute } from "@/lib/auth/ProtectedRoute";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLogin from "./pages/admin/AdminLogin.tsx";
import AdminRegister from "./pages/admin/AdminRegister.tsx";
import AdminLayout from "./pages/admin/AdminLayout.tsx";
import Dashboard from "./pages/admin/Dashboard.tsx";
import BusesPage from "./pages/admin/BusesPage.tsx";
import ReportesPage from "./pages/admin/ReportesPage.tsx";
import HistorialPage from "./pages/admin/HistorialPage.tsx";
import RutasPage from "./pages/admin/RutasPage.tsx";
import EstacionesPage from "./pages/admin/EstacionesPage.tsx";
import MonitoreoPage from "./pages/admin/MonitoreoPage.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/register" element={<AdminRegister />} />
            <Route
              path="/admin"
              element={
                <ProtectedRoute>
                  <AdminLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="buses" element={<BusesPage />} />
              <Route path="reportes" element={<ReportesPage />} />
              <Route path="historial" element={<HistorialPage />} />
              <Route path="rutas" element={<RutasPage />} />
              <Route path="estaciones" element={<EstacionesPage />} />
              <Route path="monitoreo" element={<MonitoreoPage />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;

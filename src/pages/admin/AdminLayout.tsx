import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Bus as BusIcon, FileBarChart2, History, Route as RouteIcon,
  MapPin, LogOut, Activity, ExternalLink, Menu, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { isSimulating, startSimulation, stopSimulation } from "@/lib/api/metropolitanoApi";

const NAV = [
  { to: "/admin",           label: "Dashboard",  icon: LayoutDashboard, end: true },
  { to: "/admin/buses",     label: "Buses",      icon: BusIcon },
  { to: "/admin/reportes",  label: "Reportes",   icon: FileBarChart2 },
  { to: "/admin/historial", label: "Historial",  icon: History },
  { to: "/admin/rutas",     label: "Rutas",      icon: RouteIcon },
  { to: "/admin/estaciones",label: "Estaciones", icon: MapPin },
];

const AdminLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [simOn, setSimOn] = useState(isSimulating());

  useEffect(() => { setOpen(false); }, [location.pathname]);

  const toggleSim = () => {
    if (simOn) { stopSimulation(); setSimOn(false); }
    else { startSimulation(3000); setSimOn(true); }
  };

  return (
    <div className="min-h-screen bg-muted/40 flex">
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-64 bg-secondary text-secondary-foreground flex flex-col transform transition-transform ${
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="px-5 py-5 border-b border-background/10 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
              <BusIcon className="w-4 h-4 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-display font-bold text-sm tracking-tight">METROPOLITANO</div>
              <div className="text-[10px] uppercase tracking-[0.2em] opacity-60">Admin</div>
            </div>
          </Link>
          <button onClick={() => setOpen(false)} className="lg:hidden p-1 rounded hover:bg-background/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV.map((item) => (
            <NavLink
              key={item.to} to={item.to} end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-smooth ${
                  isActive ? "bg-primary text-primary-foreground font-semibold shadow-md" : "hover:bg-background/10"
                }`
              }
            >
              <item.icon className="w-4 h-4" /> {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-background/10 space-y-2">
          <button
            onClick={toggleSim}
            className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-smooth ${
              simOn ? "bg-success/15 text-success border border-success/30" : "bg-background/10 hover:bg-background/15"
            }`}
          >
            <span className="flex items-center gap-2">
              <Activity className="w-4 h-4" /> Simulación
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${simOn ? "bg-success text-success-foreground" : "bg-muted-foreground/30"}`}>
              {simOn ? "ON" : "OFF"}
            </span>
          </button>

          <Link to="/" className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-background/10 transition-smooth">
            <ExternalLink className="w-4 h-4" /> Portal público
          </Link>

          <div className="px-3 py-2 rounded-lg bg-background/5 text-xs">
            <div className="font-semibold truncate">{user?.name}</div>
            <div className="opacity-60 truncate">{user?.email}</div>
            {user?.role && (
              <div className="mt-1 inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary uppercase tracking-wider font-bold">
                {user.role}
              </div>
            )}
          </div>

          <button
            onClick={() => { logout(); navigate("/admin/login"); }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm hover:bg-destructive/20 text-destructive-foreground/90 transition-smooth"
          >
            <LogOut className="w-4 h-4" /> Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 bg-background border-b border-border h-14 flex items-center px-4 gap-3">
          <button onClick={() => setOpen(true)} className="p-1">
            <Menu className="w-5 h-5" />
          </button>
          <span className="font-display font-bold">Metropolitano · Admin</span>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;

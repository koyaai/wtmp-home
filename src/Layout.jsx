import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import {
  LayoutDashboard,
  Users,
  Search,
  MousePointerClick,
  CalendarDays,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Settings,
  Menu,
  X,
  Blinds
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Command Center", icon: LayoutDashboard, page: "Dashboard", roles: ["admin", "leadership", "team_lead", "seo_specialist", "ppc_specialist", "social_media", "csm", "web_designer"] },
  { label: "Clients", icon: Users, page: "Clients", roles: ["admin", "leadership", "team_lead", "seo_specialist", "ppc_specialist", "social_media", "csm", "web_designer"] },
  { label: "SEO", icon: Search, page: "SEO", roles: ["admin", "leadership", "team_lead", "seo_specialist"] },
  { label: "PPC", icon: MousePointerClick, page: "PPC", roles: ["admin", "leadership", "team_lead", "ppc_specialist"] },
  { label: "Social Media", icon: CalendarDays, page: "SocialMedia", roles: ["admin", "leadership", "team_lead", "social_media"] },
  { label: "Lead Tracker", icon: TrendingUp, page: "Leads", roles: ["admin", "leadership", "team_lead", "csm"] },
];

export default function Layout({ children, currentPageName }) {
  const [user, setUser] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const userRole = user?.role || "admin";
  const visibleNav = navItems.filter(item => item.roles.includes(userRole));

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn("flex items-center gap-3 px-4 py-5 border-b border-white/10", collapsed && "justify-center px-2")}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center flex-shrink-0">
          <Blinds className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="text-white font-bold text-sm leading-tight">AgencyOS</p>
            <p className="text-blue-300 text-xs">Window Treatment Hub</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {visibleNav.map((item) => {
          const isActive = currentPageName === item.page;
          return (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150 group",
                isActive
                  ? "bg-white/15 text-white"
                  : "text-blue-200 hover:bg-white/10 hover:text-white",
                collapsed && "justify-center px-2"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={cn("w-5 h-5 flex-shrink-0", isActive ? "text-white" : "text-blue-300 group-hover:text-white")} />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
              {!collapsed && isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-300" />}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-2 pb-4 border-t border-white/10 pt-3 space-y-1">
        {user && (
          <div className={cn("flex items-center gap-3 px-3 py-2 rounded-lg", collapsed && "justify-center")}>
            <div className="w-7 h-7 rounded-full bg-blue-400 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">
                {user.full_name?.charAt(0) || user.email?.charAt(0) || "?"}
              </span>
            </div>
            {!collapsed && (
              <div className="min-w-0">
                <p className="text-white text-xs font-medium truncate">{user.full_name || user.email}</p>
                <p className="text-blue-300 text-xs capitalize">{userRole?.replace("_", " ")}</p>
              </div>
            )}
          </div>
        )}
        <button
          onClick={() => base44.auth.logout()}
          className={cn("w-full flex items-center gap-3 px-3 py-2 rounded-lg text-blue-200 hover:bg-white/10 hover:text-white transition-all", collapsed && "justify-center")}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span className="text-sm">Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col bg-gradient-to-b from-slate-900 to-slate-800 transition-all duration-300 flex-shrink-0",
          collapsed ? "w-16" : "w-56"
        )}
      >
        <SidebarContent />
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 translate-x-full w-5 h-10 bg-slate-800 rounded-r-lg flex items-center justify-center text-blue-300 hover:text-white transition-colors z-10"
          style={{ marginLeft: collapsed ? "4rem" : "14rem", transition: "margin-left 0.3s" }}
        >
          {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-56 bg-gradient-to-b from-slate-900 to-slate-800 flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200">
          <button onClick={() => setMobileOpen(true)} className="text-slate-600">
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center">
              <Blinds className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800 text-sm">AgencyOS</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <style>{`
        :root {
          --primary: 221 83% 53%;
          --primary-foreground: 0 0% 100%;
        }
      `}</style>
    </div>
  );
}
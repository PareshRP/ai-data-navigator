import { useState } from "react";
import { Outlet, NavLink, useLocation } from "react-router-dom";
import {
  Database,
  History,
  MessageSquare,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Zap,
  LogOut,
  User,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const NAV_ITEMS = [
  { to: "/",         icon: Database,     label: "Query Workspace", short: "QW" },
  { to: "/history",  icon: History,      label: "Query History",   short: "QH" },
  { to: "/prompts",  icon: MessageSquare,label: "Prompt History",  short: "PH" },
  { to: "/insights", icon: BarChart3,    label: "Insights",        short: "IN" },
  { to: "/settings", icon: Settings,     label: "Settings",        short: "ST" },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();

  const displayName =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    user?.email?.split("@")[0] ??
    "User";

  const avatarUrl = user?.user_metadata?.avatar_url as string | undefined;
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      {/* === Sidebar === */}
      <aside
        className={cn(
          "flex flex-col flex-shrink-0 border-r border-border transition-all duration-200",
          "bg-sidebar",
          collapsed ? "w-[52px]" : "w-[220px]"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex items-center gap-2.5 px-3 py-3.5 border-b border-sidebar-border",
            collapsed && "justify-center px-0"
          )}
        >
          <div className="flex-shrink-0 w-7 h-7 rounded-sm bg-primary flex items-center justify-center shadow-glow-cyan">
            <Zap size={14} className="text-primary-foreground" strokeWidth={2.5} />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-[13px] font-semibold tracking-tight text-foreground leading-none">
                Synthetix DB
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">v2.1.0</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-2 overflow-hidden">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => {
            const active =
              to === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(to);
            return (
              <NavLink
                key={to}
                to={to}
                className={cn(
                  "flex items-center gap-2.5 transition-snap",
                  "text-[12.5px] font-medium",
                  collapsed ? "px-0 justify-center py-2.5" : "px-3 py-2 mx-1 rounded-sm",
                  active
                    ? "bg-sidebar-accent text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
                title={collapsed ? label : undefined}
              >
                <Icon size={15} strokeWidth={active ? 2.5 : 1.8} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom: user + collapse */}
        <div className="border-t border-sidebar-border">
          {/* User profile */}
          {!collapsed && (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((o) => !o)}
                className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-sidebar-accent transition-snap group"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    className="w-6 h-6 rounded-full flex-shrink-0 object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary-dim border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-bold text-primary">{initials}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[11.5px] font-medium text-foreground truncate leading-none">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate mt-0.5">
                    {user?.email}
                  </p>
                </div>
                <ChevronDown size={11} className={cn("text-muted-foreground transition-transform flex-shrink-0", userMenuOpen && "rotate-180")} />
              </button>

              {/* User dropdown */}
              {userMenuOpen && (
                <div className="absolute bottom-full mb-1 left-2 right-2 panel-raised shadow-panel z-50 animate-fade-in">
                  <div className="p-2 border-b border-border">
                    <p className="text-[11px] font-semibold text-foreground truncate">{displayName}</p>
                    <p className="text-[10px] text-muted-foreground font-mono truncate">{user?.email}</p>
                  </div>
                  <button
                    onClick={() => { setUserMenuOpen(false); signOut(); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-destructive hover:bg-destructive/10 transition-snap rounded-sm"
                  >
                    <LogOut size={12} />
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Collapsed user avatar */}
          {collapsed && (
            <button
              onClick={() => signOut()}
              title="Sign Out"
              className="w-full flex items-center justify-center py-2.5 hover:bg-sidebar-accent transition-snap text-muted-foreground hover:text-destructive border-b border-sidebar-border"
            >
              <LogOut size={13} />
            </button>
          )}

          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "w-full flex items-center justify-center py-2.5 transition-snap",
              "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
              "border-t border-sidebar-border"
            )}
          >
            {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>
      </aside>

      {/* === Main Content === */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Outlet />
      </div>
    </div>
  );
}

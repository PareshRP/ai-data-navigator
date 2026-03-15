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
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/",         icon: Database,     label: "Query Workspace", short: "QW" },
  { to: "/history",  icon: History,      label: "Query History",   short: "QH" },
  { to: "/prompts",  icon: MessageSquare,label: "Prompt History",  short: "PH" },
  { to: "/insights", icon: BarChart3,    label: "Insights",        short: "IN" },
  { to: "/settings", icon: Settings,     label: "Settings",        short: "ST" },
];

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

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

        {/* Bottom: connection status + collapse toggle */}
        <div className="border-t border-sidebar-border">
          {!collapsed && (
            <div className="px-3 py-2">
              <div className="flex items-center gap-1.5">
                <Circle size={6} className="text-success fill-success" />
                <span className="text-[11px] text-muted-foreground font-mono truncate">
                  No connection
                </span>
              </div>
            </div>
          )}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={cn(
              "w-full flex items-center justify-center py-2.5 transition-snap",
              "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent",
              "border-t border-sidebar-border"
            )}
          >
            {collapsed ? (
              <ChevronRight size={13} />
            ) : (
              <ChevronLeft size={13} />
            )}
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

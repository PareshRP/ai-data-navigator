import { useState } from "react";
import {
  BarChart3, TrendingUp, PieChart, Activity,
  Users, ShoppingCart, Package, Zap,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "hsl(193, 85%, 54%)",
  "hsl(340, 85%, 60%)",
  "hsl(145, 60%, 45%)",
  "hsl(38, 90%, 55%)",
  "hsl(270, 70%, 65%)",
  "hsl(20, 80%, 60%)",
];

const ROLE_DATA = [
  { name: "user",   value: 45, count: 1823 },
  { name: "admin",  value: 25, count: 1012 },
  { name: "editor", value: 20, count:  810 },
  { name: "viewer", value: 10, count:  405 },
];

const SIGNUP_DATA = [
  { month: "Jan", signups: 180, active: 140 },
  { month: "Feb", signups: 220, active: 190 },
  { month: "Mar", signups: 310, active: 260 },
  { month: "Apr", signups: 280, active: 235 },
  { month: "May", signups: 360, active: 310 },
  { month: "Jun", signups: 420, active: 368 },
  { month: "Jul", signups: 380, active: 340 },
  { month: "Aug", signups: 450, active: 400 },
  { month: "Sep", signups: 520, active: 465 },
  { month: "Oct", signups: 490, active: 432 },
  { month: "Nov", signups: 580, active: 520 },
  { month: "Dec", signups: 640, active: 575 },
];

const CATEGORY_DATA = [
  { category: "Electronics", count: 142, avg_price: 299.99 },
  { category: "Apparel",     count: 210, avg_price:  49.95 },
  { category: "Books",       count: 380, avg_price:  19.99 },
  { category: "Home",        count:  95, avg_price: 124.50 },
  { category: "Sports",      count: 178, avg_price:  79.00 },
  { category: "Beauty",      count: 230, avg_price:  39.95 },
];

const ORDER_STATUS_DATA = [
  { status: "completed", value: 62 },
  { status: "pending",   value: 18 },
  { status: "shipped",   value: 14 },
  { status: "cancelled", value:  6 },
];

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: "hsl(220, 18%, 11%)",
  border: "1px solid hsl(220, 15%, 19%)",
  borderRadius: "4px",
  fontSize: "11px",
  fontFamily: "'Geist Mono', monospace",
  color: "hsl(210, 20%, 92%)",
};

type Tab = "overview" | "users" | "products" | "orders";

const STAT_CARDS = [
  { icon: Users,        label: "Total Users",     value: "4,050",  change: "+12.4%", up: true },
  { icon: ShoppingCart, label: "Orders (30d)",    value: "1,832",  change: "+8.1%",  up: true },
  { icon: Package,      label: "Low Stock Items", value: "7",      change: "-2",     up: false },
  { icon: Zap,          label: "Avg Query Time",  value: "87ms",   change: "-14%",   up: true },
];

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface flex-shrink-0">
        <BarChart3 size={15} className="text-primary" />
        <h1 className="text-[13px] font-semibold text-foreground">Insights & Visualization</h1>
        <span className="ai-badge ai-badge-pink ml-1">AI-Powered</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-4 border-b border-border bg-background flex-shrink-0">
        {(["overview", "users", "products", "orders"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={cn(
              "px-3 py-2 text-[12px] font-medium capitalize transition-snap border-b-2 -mb-px",
              activeTab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Stat cards */}
        <div className="grid grid-cols-4 gap-3">
          {STAT_CARDS.map(({ icon: Icon, label, value, change, up }) => (
            <div key={label} className="panel p-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10.5px] text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-[22px] font-semibold text-foreground font-mono mt-1 leading-none">{value}</p>
                </div>
                <div className="w-7 h-7 rounded-sm bg-primary-dim flex items-center justify-center">
                  <Icon size={13} className="text-primary" />
                </div>
              </div>
              <div className={cn("text-[11px] font-mono mt-2", up ? "text-success" : "text-destructive")}>
                {up ? "▲" : "▼"} {change} vs last period
              </div>
            </div>
          ))}
        </div>

        {/* Main charts grid */}
        <div className="grid grid-cols-2 gap-3">
          {/* Signup trend */}
          <div className="panel p-4 col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
                  <TrendingUp size={12} className="text-primary" />
                  User Growth — 2024
                </p>
                <p className="text-[10.5px] text-muted-foreground mt-0.5">Signups vs Active Users by month</p>
              </div>
              <span className="ai-badge ai-badge-cyan">Line Chart</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={SIGNUP_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 16%)" />
                <XAxis dataKey="month" tick={{ fontSize: 10, fontFamily: "Geist Mono", fill: "hsl(210, 10%, 45%)" }} />
                <YAxis tick={{ fontSize: 10, fontFamily: "Geist Mono", fill: "hsl(210, 10%, 45%)" }} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Legend wrapperStyle={{ fontSize: "11px", fontFamily: "Geist Mono" }} />
                <Line type="monotone" dataKey="signups" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} name="Signups" />
                <Line type="monotone" dataKey="active" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} name="Active" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Role distribution */}
          <div className="panel p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
                  <PieChart size={12} className="text-accent" />
                  Role Distribution
                </p>
                <p className="text-[10.5px] text-muted-foreground mt-0.5">Users by assigned role</p>
              </div>
              <span className="ai-badge ai-badge-pink">Pie Chart</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <RechartsPie>
                <Pie
                  data={ROLE_DATA}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="value"
                  label={({ name, value }) => `${name} ${value}%`}
                  labelLine={false}
                >
                  {ROLE_DATA.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={(v) => `${v}%`} />
              </RechartsPie>
            </ResponsiveContainer>
            <div className="mt-2 space-y-1">
              {ROLE_DATA.map((r, i) => (
                <div key={r.name} className="flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-sm" style={{ background: CHART_COLORS[i] }} />
                    <span className="text-foreground capitalize">{r.name}</span>
                  </div>
                  <span className="text-muted-foreground">{r.count.toLocaleString()} users</span>
                </div>
              ))}
            </div>
          </div>

          {/* Products by category */}
          <div className="panel p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
                  <Package size={12} className="text-success" />
                  Products by Category
                </p>
                <p className="text-[10.5px] text-muted-foreground mt-0.5">Count and avg price</p>
              </div>
              <span className="ai-badge ai-badge-success">Bar Chart</span>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={CATEGORY_DATA} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 16%)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 10, fontFamily: "Geist Mono", fill: "hsl(210, 10%, 45%)" }} />
                <YAxis dataKey="category" type="category" tick={{ fontSize: 10, fontFamily: "Geist Mono", fill: "hsl(210, 10%, 45%)" }} width={70} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[0, 2, 2, 0]} name="Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Order status */}
          <div className="panel p-4 col-span-2">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
                  <Activity size={12} className="text-warning" />
                  Order Status Breakdown
                </p>
                <p className="text-[10.5px] text-muted-foreground mt-0.5">Distribution across all statuses</p>
              </div>
              <span className="ai-badge ai-badge-warning">Bar Chart</span>
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={ORDER_STATUS_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 16%)" />
                <XAxis dataKey="status" tick={{ fontSize: 10, fontFamily: "Geist Mono", fill: "hsl(210, 10%, 45%)" }} />
                <YAxis tick={{ fontSize: 10, fontFamily: "Geist Mono", fill: "hsl(210, 10%, 45%)" }} />
                <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={(v) => `${v}%`} />
                <Bar dataKey="value" radius={[2, 2, 0, 0]} name="Share %">
                  {ORDER_STATUS_DATA.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI suggestions */}
        <div className="panel p-4 border-accent/20">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={13} className="text-accent" />
            <p className="text-[12px] font-semibold text-foreground">AI Chart Recommendations</p>
            <span className="ai-badge ai-badge-pink ml-1">3 Suggestions</span>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                title: "Revenue Cohort Analysis",
                desc: "Group users by signup month, plot avg revenue per cohort over time.",
                chart: "Heatmap",
                badge: "ai-badge-pink",
              },
              {
                title: "Order Funnel",
                desc: "Visualize drop-off rates from signup → first order → repeat purchase.",
                chart: "Funnel",
                badge: "ai-badge-cyan",
              },
              {
                title: "Stock Depletion Forecast",
                desc: "Project when low-stock items will hit zero based on last 30-day sales rate.",
                chart: "Area",
                badge: "ai-badge-warning",
              },
            ].map(({ title, desc, chart, badge }) => (
              <div key={title} className="bg-background rounded-sm border border-border p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`ai-badge ${badge}`}>{chart}</span>
                </div>
                <p className="text-[12px] text-foreground font-medium mb-1">{title}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{desc}</p>
                <button className="mt-2 text-[11px] text-primary font-mono hover:underline">
                  Generate query →
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

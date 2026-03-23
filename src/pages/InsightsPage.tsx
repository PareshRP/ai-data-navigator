import { useState, useMemo } from "react";
import {
  BarChart3, TrendingUp, PieChart, Activity,
  Zap, RefreshCw, Loader2,
} from "lucide-react";
import {
  BarChart, Bar, LineChart, Line, PieChart as RechartsPie, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { cn } from "@/lib/utils";
import { useQueryHistory, usePromptHistory } from "@/hooks/useQueryStore";

const CHART_COLORS = [
  "hsl(193, 85%, 54%)",
  "hsl(340, 85%, 60%)",
  "hsl(145, 60%, 45%)",
  "hsl(38, 90%, 55%)",
  "hsl(270, 70%, 65%)",
  "hsl(20, 80%, 60%)",
];

const CUSTOM_TOOLTIP_STYLE = {
  backgroundColor: "hsl(220, 18%, 11%)",
  border: "1px solid hsl(220, 15%, 19%)",
  borderRadius: "4px",
  fontSize: "11px",
  fontFamily: "'Geist Mono', monospace",
  color: "hsl(210, 20%, 92%)",
};

type Tab = "overview" | "queries" | "ai";

export default function InsightsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const queryHistory = useQueryHistory();
  const promptHistory = usePromptHistory();

  // ── Derived metrics ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = queryHistory.length;
    const success = queryHistory.filter((q) => q.status === "success").length;
    const errors = queryHistory.filter((q) => q.status === "error").length;
    const avgDuration = total > 0
      ? Math.round(queryHistory.reduce((s, q) => s + q.durationMs, 0) / total)
      : 0;
    const totalTokens = promptHistory.reduce((s, p) => s + p.inputTokens + p.outputTokens, 0);
    return { total, success, errors, avgDuration, totalTokens };
  }, [queryHistory, promptHistory]);

  // Queries per DB type
  const dbTypeDist = useMemo(() => {
    const map: Record<string, number> = {};
    queryHistory.forEach((q) => { map[q.dbType] = (map[q.dbType] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [queryHistory]);

  // Query duration trend (last 20)
  const durationTrend = useMemo(() =>
    queryHistory.slice(0, 20).reverse().map((q, i) => ({
      i: i + 1,
      ms: q.durationMs,
      label: q.table || "query",
    })),
    [queryHistory]
  );

  // Queries by schema.table
  const tableFreq = useMemo(() => {
    const map: Record<string, number> = {};
    queryHistory.forEach((q) => {
      const key = `${q.schema}.${q.table}`;
      if (key !== ".") map[key] = (map[key] ?? 0) + 1;
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => ({ name, count }));
  }, [queryHistory]);

  // AI action breakdown
  const aiActionDist = useMemo(() => {
    const map: Record<string, number> = {};
    promptHistory.forEach((p) => { map[p.action] = (map[p.action] ?? 0) + 1; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [promptHistory]);

  // Token usage by action
  const tokenByAction = useMemo(() => {
    const map: Record<string, number> = {};
    promptHistory.forEach((p) => {
      map[p.action] = (map[p.action] ?? 0) + p.inputTokens + p.outputTokens;
    });
    return Object.entries(map).map(([name, tokens]) => ({ name, tokens }));
  }, [promptHistory]);

  const isEmpty = queryHistory.length === 0 && promptHistory.length === 0;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface flex-shrink-0">
        <BarChart3 size={15} className="text-primary" />
        <h1 className="text-[13px] font-semibold text-foreground">Insights & Analytics</h1>
        <span className="ai-badge ai-badge-pink ml-1">Live Data</span>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 px-4 border-b border-border bg-background flex-shrink-0">
        {(["overview", "queries", "ai"] as Tab[]).map((t) => (
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
            {t === "ai" ? "AI Usage" : t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-4">
        {isEmpty && (
          <div className="flex flex-col items-center justify-center h-64 text-center gap-3">
            <div className="w-14 h-14 rounded-sm bg-surface border border-border flex items-center justify-center">
              <BarChart3 size={24} className="text-muted-foreground/30" />
            </div>
            <p className="text-[13px] font-semibold text-foreground">No data yet</p>
            <p className="text-[11.5px] text-muted-foreground max-w-xs leading-relaxed">
              Run queries and use AI actions in the workspace to see live analytics here.
            </p>
          </div>
        )}

        {!isEmpty && activeTab === "overview" && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "Total Queries", value: stats.total.toString(), sub: `${stats.success} success · ${stats.errors} errors` },
                { label: "Avg Duration", value: `${stats.avgDuration}ms`, sub: "per query" },
                { label: "AI Prompts", value: promptHistory.length.toString(), sub: "total requests" },
                { label: "Tokens Used", value: stats.totalTokens.toLocaleString(), sub: "total AI tokens" },
              ].map(({ label, value, sub }) => (
                <div key={label} className="panel p-3">
                  <p className="text-[10.5px] text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-[22px] font-semibold text-foreground font-mono mt-1 leading-none">{value}</p>
                  <p className="text-[10px] font-mono text-muted-foreground mt-1">{sub}</p>
                </div>
              ))}
            </div>

            {/* Duration trend */}
            {durationTrend.length > 1 && (
              <div className="panel p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[12px] font-semibold text-foreground flex items-center gap-1.5">
                      <TrendingUp size={12} className="text-primary" />
                      Query Duration Trend
                    </p>
                    <p className="text-[10.5px] text-muted-foreground mt-0.5">Last {durationTrend.length} queries</p>
                  </div>
                  <span className="ai-badge ai-badge-cyan">Line Chart</span>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={durationTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 16%)" />
                    <XAxis dataKey="i" tick={{ fontSize: 10, fontFamily: "Geist Mono", fill: "hsl(210, 10%, 45%)" }} />
                    <YAxis tick={{ fontSize: 10, fontFamily: "Geist Mono", fill: "hsl(210, 10%, 45%)" }} unit="ms" />
                    <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={(v) => [`${v}ms`, "Duration"]} />
                    <Line type="monotone" dataKey="ms" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} name="Duration (ms)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* DB type + table freq */}
            <div className="grid grid-cols-2 gap-3">
              {dbTypeDist.length > 0 && (
                <div className="panel p-4">
                  <p className="text-[12px] font-semibold text-foreground flex items-center gap-1.5 mb-3">
                    <PieChart size={12} className="text-accent" />
                    Queries by DB Type
                  </p>
                  <ResponsiveContainer width="100%" height={160}>
                    <RechartsPie>
                      <Pie data={dbTypeDist} cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                        dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                        {dbTypeDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
              )}

              {tableFreq.length > 0 && (
                <div className="panel p-4">
                  <p className="text-[12px] font-semibold text-foreground flex items-center gap-1.5 mb-3">
                    <Activity size={12} className="text-success" />
                    Most Queried Tables
                  </p>
                  <ResponsiveContainer width="100%" height={160}>
                    <BarChart data={tableFreq} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 16%)" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 10, fontFamily: "Geist Mono", fill: "hsl(210, 10%, 45%)" }} />
                      <YAxis dataKey="name" type="category" tick={{ fontSize: 9, fontFamily: "Geist Mono", fill: "hsl(210, 10%, 45%)" }} width={90} />
                      <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                      <Bar dataKey="count" fill={CHART_COLORS[0]} radius={[0, 2, 2, 0]} name="Queries" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </>
        )}

        {!isEmpty && activeTab === "queries" && (
          <>
            {/* Error rate */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Success Rate", value: stats.total > 0 ? `${Math.round((stats.success / stats.total) * 100)}%` : "—" },
                { label: "Error Rate", value: stats.total > 0 ? `${Math.round((stats.errors / stats.total) * 100)}%` : "—" },
                { label: "Avg Duration", value: `${stats.avgDuration}ms` },
              ].map(({ label, value }) => (
                <div key={label} className="panel p-3">
                  <p className="text-[10.5px] text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-[20px] font-semibold text-foreground font-mono mt-1">{value}</p>
                </div>
              ))}
            </div>

            {durationTrend.length > 0 && (
              <div className="panel p-4">
                <p className="text-[12px] font-semibold text-foreground flex items-center gap-1.5 mb-3">
                  <TrendingUp size={12} className="text-primary" />
                  Duration per Query (last 20)
                </p>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={durationTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 16%)" />
                    <XAxis dataKey="i" tick={{ fontSize: 10, fontFamily: "Geist Mono", fill: "hsl(210, 10%, 45%)" }} />
                    <YAxis tick={{ fontSize: 10, fontFamily: "Geist Mono", fill: "hsl(210, 10%, 45%)" }} unit="ms" />
                    <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} formatter={(v) => [`${v}ms`, "Duration"]} />
                    <Bar dataKey="ms" radius={[2, 2, 0, 0]} name="Duration (ms)">
                      {durationTrend.map((d, i) => (
                        <Cell key={i} fill={d.ms > 500 ? CHART_COLORS[1] : CHART_COLORS[0]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </>
        )}

        {!isEmpty && activeTab === "ai" && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Prompts", value: promptHistory.length.toString() },
                { label: "Total Tokens", value: stats.totalTokens.toLocaleString() },
                { label: "Avg Tokens/Req", value: promptHistory.length > 0 ? Math.round(stats.totalTokens / promptHistory.length).toString() : "—" },
              ].map(({ label, value }) => (
                <div key={label} className="panel p-3">
                  <p className="text-[10.5px] text-muted-foreground uppercase tracking-wider">{label}</p>
                  <p className="text-[20px] font-semibold text-foreground font-mono mt-1">{value}</p>
                </div>
              ))}
            </div>

            {aiActionDist.length > 0 && (
              <div className="grid grid-cols-2 gap-3">
                <div className="panel p-4">
                  <p className="text-[12px] font-semibold text-foreground flex items-center gap-1.5 mb-3">
                    <Zap size={12} className="text-accent" />
                    AI Actions Used
                  </p>
                  <ResponsiveContainer width="100%" height={180}>
                    <RechartsPie>
                      <Pie data={aiActionDist} cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                        dataKey="value" label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                        {aiActionDist.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>

                {tokenByAction.length > 0 && (
                  <div className="panel p-4">
                    <p className="text-[12px] font-semibold text-foreground flex items-center gap-1.5 mb-3">
                      <BarChart3 size={12} className="text-primary" />
                      Token Usage by Action
                    </p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={tokenByAction}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 15%, 16%)" />
                        <XAxis dataKey="name" tick={{ fontSize: 10, fontFamily: "Geist Mono", fill: "hsl(210, 10%, 45%)" }} />
                        <YAxis tick={{ fontSize: 10, fontFamily: "Geist Mono", fill: "hsl(210, 10%, 45%)" }} />
                        <Tooltip contentStyle={CUSTOM_TOOLTIP_STYLE} />
                        <Bar dataKey="tokens" fill={CHART_COLORS[0]} radius={[2, 2, 0, 0]} name="Tokens" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

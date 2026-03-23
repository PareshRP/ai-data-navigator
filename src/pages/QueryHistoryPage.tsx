import { useState } from "react";
import { History, Search, Copy, Play, ChevronDown, ChevronUp, Clock, Database, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQueryHistory } from "@/hooks/useQueryStore";
import { useNavigate } from "react-router-dom";

export default function QueryHistoryPage() {
  const history = useQueryHistory();
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterDb, setFilterDb] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const navigate = useNavigate();

  const filtered = history.filter((r) => {
    const matchSearch =
      r.query.toLowerCase().includes(search.toLowerCase()) ||
      r.table.toLowerCase().includes(search.toLowerCase()) ||
      r.connectionName.toLowerCase().includes(search.toLowerCase());
    const matchDb = filterDb === "all" || r.dbType === filterDb;
    const matchStatus = filterStatus === "all" || r.status === filterStatus;
    return matchSearch && matchDb && matchStatus;
  });

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface flex-shrink-0">
        <div className="flex items-center gap-2">
          <History size={15} className="text-primary" />
          <h1 className="text-[13px] font-semibold text-foreground">Query History</h1>
          <span className="ai-badge ai-badge-cyan ml-1">{history.length} queries</span>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-background flex-shrink-0 flex-wrap">
        <div className="flex items-center gap-1.5 flex-1 min-w-[200px] max-w-[360px] px-2.5 py-1.5 rounded-sm border border-border bg-surface">
          <Search size={11} className="text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search queries…"
            className="bg-transparent outline-none text-[12px] font-mono text-foreground placeholder:text-muted-foreground w-full"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
              <X size={10} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {["all", "postgresql", "mongodb"].map((v) => (
            <button
              key={v}
              onClick={() => setFilterDb(v)}
              className={cn(
                "px-2 py-1 rounded-sm text-[11px] font-mono transition-snap border",
                filterDb === v
                  ? "border-primary/40 bg-primary-dim text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {["all", "success", "error"].map((v) => (
            <button
              key={v}
              onClick={() => setFilterStatus(v)}
              className={cn(
                "px-2 py-1 rounded-sm text-[11px] font-mono transition-snap border",
                filterStatus === v
                  ? v === "error"
                    ? "border-destructive/40 bg-destructive/10 text-destructive"
                    : "border-primary/40 bg-primary-dim text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        {filtered.length > 0 ? (
          <table className="w-full border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                {["Time", "Connection", "Table", "Query", "Duration", "Rows", "Status"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground bg-surface border-b border-border">
                    {h}
                  </th>
                ))}
                <th className="px-3 py-2 bg-surface border-b border-border" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <>
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b border-border/40 hover:bg-primary/5 transition-snap cursor-pointer",
                      expanded === r.id && "bg-surface-raised"
                    )}
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                  >
                    <td className="px-3 py-2 text-[11.5px] font-mono text-muted-foreground whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Clock size={10} />
                        {formatDate(r.executedAt)}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("ai-badge", r.dbType === "postgresql" ? "ai-badge-cyan" : "ai-badge-pink")}>
                          {r.dbType === "postgresql" ? "PG" : "MDB"}
                        </span>
                        <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[100px]">{r.connectionName}</span>
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[12px] font-mono text-foreground">
                      <div className="flex items-center gap-1">
                        <Database size={10} className="text-muted-foreground" />
                        {r.schema}.{r.table}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-[12px] font-mono text-foreground max-w-[320px]">
                      <span className="truncate block">{r.query.split("\n")[0].substring(0, 80)}{r.query.length > 80 ? "…" : ""}</span>
                    </td>
                    <td className="px-3 py-2 text-[12px] font-mono text-success whitespace-nowrap">{r.durationMs}ms</td>
                    <td className="px-3 py-2 text-[12px] font-mono text-foreground">{r.rowCount}</td>
                    <td className="px-3 py-2">
                      <span className={cn(
                        "text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-sm border",
                        r.status === "success"
                          ? "ai-badge ai-badge-success"
                          : "bg-destructive/10 text-destructive border-destructive/30"
                      )}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {expanded === r.id ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
                    </td>
                  </tr>
                  {expanded === r.id && (
                    <tr key={`${r.id}-expanded`} className="bg-surface-raised border-b border-border">
                      <td colSpan={8} className="px-4 py-3">
                        <div className="space-y-2">
                          <pre className="code-editor text-[12px] p-3 rounded-sm border border-border bg-background overflow-x-auto whitespace-pre-wrap">
                            {r.query}
                          </pre>
                          {r.error && (
                            <div className="flex items-start gap-2 px-3 py-2 rounded-sm bg-destructive/10 border border-destructive/20 text-destructive text-[11.5px] font-mono">
                              <span className="font-semibold">ERROR:</span> {r.error}
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => navigator.clipboard.writeText(r.query)}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-snap"
                            >
                              <Copy size={10} /> Copy Query
                            </button>
                            <button
                              onClick={() => navigate("/")}
                              className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] bg-primary text-primary-foreground hover:opacity-90 transition-snap"
                            >
                              <Play size={10} /> Open Workspace
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
            <History size={24} className="text-muted-foreground/30" />
            <p className="text-[12px] text-muted-foreground">
              {history.length === 0
                ? "No queries executed yet. Run a query in the workspace to see history here."
                : "No queries match your search."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

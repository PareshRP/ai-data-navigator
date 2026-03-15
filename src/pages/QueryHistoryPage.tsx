import { useState } from "react";
import { History, Search, Copy, Play, ChevronDown, ChevronUp, Clock, Database, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface QueryRecord {
  id: string;
  query: string;
  dbType: "postgresql" | "mongodb";
  schema: string;
  table: string;
  executedAt: string;
  durationMs: number;
  rowCount: number;
  status: "success" | "error";
  error?: string;
}

const MOCK_HISTORY: QueryRecord[] = [
  {
    id: "qh1",
    query: "SELECT u.id, u.email, u.name, u.role FROM public.users u WHERE u.active = true ORDER BY u.created_at DESC LIMIT 50;",
    dbType: "postgresql", schema: "public", table: "users",
    executedAt: "2024-12-15T14:23:11Z", durationMs: 87, rowCount: 50, status: "success",
  },
  {
    id: "qh2",
    query: "WITH active_users AS (\n  SELECT id, email, name FROM public.users WHERE active = true\n)\nSELECT * FROM active_users ORDER BY name;",
    dbType: "postgresql", schema: "public", table: "users",
    executedAt: "2024-12-15T14:19:04Z", durationMs: 142, rowCount: 134, status: "success",
  },
  {
    id: "qh3",
    query: "SELECT p.name, p.price, p.stock FROM public.products p WHERE p.stock < 10 ORDER BY p.stock ASC;",
    dbType: "postgresql", schema: "public", table: "products",
    executedAt: "2024-12-15T13:55:30Z", durationMs: 55, rowCount: 7, status: "success",
  },
  {
    id: "qh4",
    query: "SELECT o.id, o.total, o.status, u.email FROM public.orders o JOIN public.users u ON u.id = o.user_id WHERE o.status = 'pending';",
    dbType: "postgresql", schema: "public", table: "orders",
    executedAt: "2024-12-15T13:30:00Z", durationMs: 203, rowCount: 22, status: "success",
  },
  {
    id: "qh5",
    query: "SELECT * FROM public.users WHERE id = 'invalid-uuid-format';",
    dbType: "postgresql", schema: "public", table: "users",
    executedAt: "2024-12-15T12:11:44Z", durationMs: 12, rowCount: 0, status: "error",
    error: "ERROR: invalid input syntax for type uuid: \"invalid-uuid-format\"",
  },
  {
    id: "qh6",
    query: "SELECT category, COUNT(*) as count, AVG(price) as avg_price FROM public.products GROUP BY category ORDER BY count DESC;",
    dbType: "postgresql", schema: "public", table: "products",
    executedAt: "2024-12-14T17:42:00Z", durationMs: 78, rowCount: 8, status: "success",
  },
  {
    id: "qh7",
    query: "db.users.find({ active: true }, { email: 1, name: 1, role: 1 }).sort({ createdAt: -1 }).limit(25)",
    dbType: "mongodb", schema: "app", table: "users",
    executedAt: "2024-12-14T16:00:00Z", durationMs: 34, rowCount: 25, status: "success",
  },
];

export default function QueryHistoryPage() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filterDb, setFilterDb] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const filtered = MOCK_HISTORY.filter((r) => {
    const matchSearch = r.query.toLowerCase().includes(search.toLowerCase()) ||
      r.table.toLowerCase().includes(search.toLowerCase());
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
          <span className="ai-badge ai-badge-cyan ml-1">{MOCK_HISTORY.length} queries</span>
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
            placeholder="Search queries..."
            className="bg-transparent outline-none text-[12px] font-mono text-foreground placeholder:text-muted-foreground w-full"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-muted-foreground hover:text-foreground">
              <X size={10} />
            </button>
          )}
        </div>

        {/* Filters */}
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
        <table className="w-full border-collapse">
          <thead className="sticky top-0 z-10">
            <tr>
              {["Time", "DB", "Table", "Query", "Duration", "Rows", "Status"].map((h) => (
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
                    <span className={cn("ai-badge", r.dbType === "postgresql" ? "ai-badge-cyan" : "ai-badge-pink")}>
                      {r.dbType === "postgresql" ? "PG" : "MDB"}
                    </span>
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
                    <span className={cn("ai-badge", r.status === "success" ? "ai-badge-success" : "")
                      + (r.status === "error" ? " bg-destructive/10 text-destructive border border-destructive/30 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded-sm" : "")}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
                      {expanded === r.id ? <ChevronUp size={12} className="text-muted-foreground" /> : <ChevronDown size={12} className="text-muted-foreground" />}
                    </div>
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
                          <button className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] bg-primary text-primary-foreground hover:opacity-90 transition-snap">
                            <Play size={10} /> Re-run in Workspace
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
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
            <History size={24} className="text-muted-foreground/30" />
            <p className="text-[12px] text-muted-foreground">No queries match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

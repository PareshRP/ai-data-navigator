import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Wand2, Lightbulb, Zap, BarChart3, ChevronDown,
  Database, Table2, Copy, Download, RefreshCw, X, ChevronRight,
  ChevronUp, Check, AlertCircle, Loader2, FileJson, FileText,
  Sparkles, Plus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useConnections, SchemaTree } from "@/hooks/useConnections";
import { useNavigate } from "react-router-dom";

// ─── Types ──────────────────────────────────────────────────────────────
type DbType = "postgresql" | "mongodb";
type Environment = "development" | "staging" | "production";
type AIMode = "generate" | "explain" | "optimize" | "analyze" | "debug" | null;

interface ResultRow {
  [key: string]: string | number | boolean | null;
}

interface AIInsight {
  mode: AIMode;
  content: string;
  badges?: { label: string; variant: "cyan" | "pink" | "success" | "warning" }[];
}

// ─── Mock schema data ────────────────────────────────────────────────────
const MOCK_SCHEMAS: Record<DbType, Record<string, Record<string, { columns: { name: string; type: string }[] }>>> = {
  postgresql: {
    public: {
      users: {
        columns: [
          { name: "id", type: "uuid" },
          { name: "email", type: "varchar(255)" },
          { name: "name", type: "varchar(100)" },
          { name: "created_at", type: "timestamptz" },
          { name: "role", type: "varchar(50)" },
          { name: "active", type: "boolean" },
        ],
      },
      orders: {
        columns: [
          { name: "id", type: "bigserial" },
          { name: "user_id", type: "uuid" },
          { name: "total", type: "numeric(10,2)" },
          { name: "status", type: "varchar(50)" },
          { name: "created_at", type: "timestamptz" },
        ],
      },
      products: {
        columns: [
          { name: "id", type: "bigserial" },
          { name: "name", type: "varchar(200)" },
          { name: "price", type: "numeric(10,2)" },
          { name: "stock", type: "integer" },
          { name: "category", type: "varchar(100)" },
        ],
      },
      analytics: {
        columns: [
          { name: "id", type: "bigserial" },
          { name: "event", type: "varchar(100)" },
          { name: "user_id", type: "uuid" },
          { name: "properties", type: "jsonb" },
          { name: "timestamp", type: "timestamptz" },
        ],
      },
    },
    analytics: {
      events: {
        columns: [
          { name: "id", type: "bigserial" },
          { name: "session_id", type: "varchar(100)" },
          { name: "event_type", type: "varchar(50)" },
          { name: "payload", type: "jsonb" },
          { name: "ts", type: "timestamptz" },
        ],
      },
    },
  },
  mongodb: {
    app: {
      users: {
        columns: [
          { name: "_id", type: "ObjectId" },
          { name: "email", type: "String" },
          { name: "profile", type: "Object" },
          { name: "createdAt", type: "Date" },
        ],
      },
      sessions: {
        columns: [
          { name: "_id", type: "ObjectId" },
          { name: "userId", type: "ObjectId" },
          { name: "token", type: "String" },
          { name: "expiresAt", type: "Date" },
        ],
      },
    },
  },
};

// ─── Mock query results ──────────────────────────────────────────────────
const MOCK_RESULTS: ResultRow[] = Array.from({ length: 40 }, (_, i) => ({
  id: `550e8400-e29b-41d4-a716-${String(i).padStart(12, "0")}`,
  email: `user${i + 1}@example.com`,
  name: ["Alice Johnson", "Bob Smith", "Carol White", "David Lee", "Eva Chen"][i % 5],
  role: ["admin", "user", "editor", "viewer"][i % 4],
  active: i % 3 !== 0,
  created_at: new Date(2024, i % 12, (i % 28) + 1).toISOString(),
}));

// ─── Sub-components ──────────────────────────────────────────────────────

function Selector<T extends string>({
  label, value, options, onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[11.5px] font-mono",
          "border border-border bg-surface transition-snap",
          "text-foreground hover:border-surface-border hover:bg-surface-raised",
          open && "border-primary/40"
        )}
      >
        <span className="text-muted-foreground text-[10px] uppercase tracking-wider mr-0.5">{label}</span>
        <span className="text-foreground">{selected?.label ?? value}</span>
        <ChevronDown size={11} className={cn("transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 z-50 min-w-[140px] panel-raised shadow-panel animate-fade-in">
          {options.map((o) => (
            <button
              key={o.value}
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-1.5 text-[11.5px] font-mono text-left transition-snap",
                "hover:bg-sidebar-accent",
                o.value === value ? "text-primary" : "text-foreground"
              )}
            >
              {o.value === value && <Check size={10} />}
              {o.value !== value && <span className="w-[10px]" />}
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SchemaSidebar({
  dbType, schema, table,
  onSchemaChange, onTableChange,
}: {
  dbType: DbType;
  schema: string;
  table: string;
  onSchemaChange: (s: string) => void;
  onTableChange: (t: string) => void;
}) {
  const [expandedSchemas, setExpandedSchemas] = useState<string[]>(["public", "app"]);
  const schemas = MOCK_SCHEMAS[dbType];

  return (
    <div className="w-[220px] flex-shrink-0 flex flex-col border-r border-border bg-sidebar overflow-hidden">
      {/* Header */}
      <div className="px-3 py-2 border-b border-sidebar-border flex items-center gap-2">
        <Database size={12} className="text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Schema Browser
        </span>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-1.5">
        {Object.entries(schemas).map(([schemaName, tables]) => {
          const expanded = expandedSchemas.includes(schemaName);
          return (
            <div key={schemaName}>
              <button
                onClick={() =>
                  setExpandedSchemas((p) =>
                    p.includes(schemaName) ? p.filter((s) => s !== schemaName) : [...p, schemaName]
                  )
                }
                className="w-full flex items-center gap-1.5 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent transition-snap"
              >
                {expanded ? <ChevronDown size={10} /> : <ChevronRight size={10} />}
                <span className="font-mono font-semibold uppercase tracking-wide">{schemaName}</span>
              </button>
              {expanded &&
                Object.entries(tables).map(([tableName, def]) => {
                  const active = schema === schemaName && table === tableName;
                  return (
                    <button
                      key={tableName}
                      onClick={() => { onSchemaChange(schemaName); onTableChange(tableName); }}
                      className={cn(
                        "w-full text-left pl-7 pr-3 py-1.5 text-[11.5px] font-mono transition-snap",
                        active
                          ? "text-primary bg-sidebar-accent"
                          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <Table2 size={10} className="flex-shrink-0" />
                        <span className="truncate">{tableName}</span>
                        <span className="ml-auto text-[9px] text-muted-foreground">
                          {def.columns.length}c
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          );
        })}
      </div>

      {/* Column inspector */}
      {table && schema && schemas[schema]?.[table] && (
        <div className="border-t border-sidebar-border">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            {schema}.{table}
          </div>
          <div className="max-h-[160px] overflow-y-auto">
            {schemas[schema][table].columns.map((col) => (
              <div key={col.name} className="flex items-center justify-between px-3 py-1 text-[11px] hover:bg-sidebar-accent">
                <span className="font-mono text-sidebar-accent-foreground truncate">{col.name}</span>
                <span className="font-mono text-muted-foreground text-[10px] ml-2 flex-shrink-0">{col.type}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AIInsightPanel({
  insight, loading, onClose,
}: {
  insight: AIInsight | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="w-[300px] flex-shrink-0 flex flex-col border-l border-border bg-surface overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <div className="flex items-center gap-1.5">
          <Sparkles size={12} className="text-accent" />
          <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            AI Insight
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground transition-snap p-0.5 rounded-sm hover:bg-muted"
        >
          <X size={12} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {loading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-accent text-[12px]">
              <Loader2 size={12} className="animate-spin" />
              <span className="font-mono">Analyzing...</span>
            </div>
            {[1, 2, 3].map((n) => (
              <div key={n} className="skeleton-shimmer rounded-sm h-4 w-full" />
            ))}
            <div className="skeleton-shimmer rounded-sm h-4 w-3/4" />
          </div>
        )}

        {!loading && !insight && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 py-8">
            <div className="w-10 h-10 rounded-sm bg-accent-dim flex items-center justify-center">
              <Sparkles size={18} className="text-accent opacity-60" />
            </div>
            <p className="text-[11.5px] text-muted-foreground leading-relaxed">
              Use the AI actions below the editor to generate insights, explanations, or optimizations.
            </p>
          </div>
        )}

        {!loading && insight && (
          <div className="space-y-3 animate-fade-in">
            {insight.badges && (
              <div className="flex flex-wrap gap-1.5">
                {insight.badges.map((b) => (
                  <span key={b.label} className={`ai-badge ai-badge-${b.variant}`}>
                    {b.label}
                  </span>
                ))}
              </div>
            )}
            <div className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap font-sans stream-text">
              {insight.content}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Query Workspace ────────────────────────────────────────────────

const DEFAULT_QUERY = `-- Query the users table
SELECT
  u.id,
  u.email,
  u.name,
  u.role,
  u.active,
  u.created_at
FROM public.users u
WHERE u.active = true
ORDER BY u.created_at DESC
LIMIT 50;`;

export default function QueryWorkspace() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { connections, loading: connLoading, fetchSchema } = useConnections();

  // Selected connection
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);
  const [liveSchemas, setLiveSchemas] = useState<SchemaTree | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(false);

  // Derive active connection
  const activeConn = connections.find((c) => c.id === selectedConnId) ?? null;

  // Auto-select first connection
  useEffect(() => {
    if (!selectedConnId && connections.length > 0) {
      setSelectedConnId(connections[0].id);
    }
  }, [connections, selectedConnId]);

  // Load schema when connection changes
  useEffect(() => {
    if (!selectedConnId) { setLiveSchemas(null); return; }
    setSchemaLoading(true);
    fetchSchema(selectedConnId)
      .then((schemas) => setLiveSchemas(schemas))
      .catch(() => setLiveSchemas(null))
      .finally(() => setSchemaLoading(false));
  }, [selectedConnId, fetchSchema]);

  // Effective schemas: live or fallback to mock
  const effectiveSchemas: Record<DbType, Record<string, Record<string, { columns: { name: string; type: string }[] }>>> =
    liveSchemas
      ? ({ [(activeConn?.type ?? "postgresql")]: liveSchemas } as unknown as typeof effectiveSchemas)
      : MOCK_SCHEMAS;

  // DB Controls
  const [dbType, setDbType] = useState<DbType>("postgresql");
  const [environment, setEnvironment] = useState<Environment>("development");
  const [schema, setSchema] = useState("public");
  const [table, setTable] = useState("users");

  // Sync dbType with active connection
  useEffect(() => {
    if (activeConn) setDbType(activeConn.type as DbType);
  }, [activeConn]);

  // Query
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [ghostQuery, setGhostQuery] = useState("");
  const [prompt, setPrompt] = useState("");
  const [promptFocused, setPromptFocused] = useState(false);

  // Results
  const [results, setResults] = useState<ResultRow[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [runLoading, setRunLoading] = useState(false);
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [rowsPerPage] = useState(15);
  const [queryTime, setQueryTime] = useState<number | null>(null);
  const [totalRows, setTotalRows] = useState(0);

  // AI
  const [aiMode, setAiMode] = useState<AIMode>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<AIInsight | null>(null);
  const [showInsightPanel, setShowInsightPanel] = useState(false);

  // Error
  const [queryError, setQueryError] = useState<string | null>(null);

  // ── Validation ──────────────────────────────────────────────────────────
  const BLOCKED = /\b(DELETE|UPDATE|INSERT|DROP|TRUNCATE|ALTER|CREATE|REPLACE|MERGE)\b/gi;
  const validateQuery = useCallback((q: string) => {
    const match = q.match(BLOCKED);
    if (match) return `Write operation blocked: ${[...new Set(match)].join(", ")}`;
    return null;
  }, []);

  // ── Run Query ───────────────────────────────────────────────────────────
  const handleRunQuery = useCallback(() => {
    const err = validateQuery(query);
    if (err) {
      setQueryError(err);
      return;
    }
    setQueryError(null);
    setRunLoading(true);
    const start = performance.now();

    setTimeout(() => {
      const data = MOCK_RESULTS;
      setResults(data);
      setColumns(data.length > 0 ? Object.keys(data[0]) : []);
      setTotalRows(data.length);
      setPage(1);
      setQueryTime(Math.round(performance.now() - start) + 87);
      setRunLoading(false);
    }, 650);
  }, [query, validateQuery]);

  // ── AI actions ──────────────────────────────────────────────────────────
  const fakeAIResponse: Record<NonNullable<AIMode>, () => AIInsight> = {
    generate: () => ({
      mode: "generate",
      content: `Generated optimized SELECT with 2 implicit joins.\n\nUsed WHERE active = true to leverage the partial index on the users table, reducing scanned rows by ~72%.\n\nQuery uses LIMIT 50 to prevent unbounded result sets.`,
      badges: [{ label: "Optimized", variant: "cyan" }, { label: "Index Used", variant: "success" }],
    }),
    explain: () => ({
      mode: "explain",
      content: `This query performs a sequential scan on public.users.\n\n1. Filter: active = true — eliminates ~33% of rows.\n2. Sort: created_at DESC — requires a sort operation (no index on this column).\n3. Limit 50 — stops after first 50 matching rows.\n\n💡 Recommendation: Add an index on (active, created_at DESC) to turn this into an Index Scan.`,
      badges: [{ label: "Seq Scan", variant: "warning" }, { label: "Sort Required", variant: "warning" }],
    }),
    optimize: () => ({
      mode: "optimize",
      content: `Optimization applied:\n\n  BEFORE: Sequential Scan → Sort → Limit\n  AFTER:  Index Scan using idx_users_active_created → Limit\n\nAdded hint: CREATE INDEX CONCURRENTLY idx_users_active_created ON public.users (active, created_at DESC) WHERE active = true;\n\nEstimated speedup: 3.8x for tables > 100k rows.`,
      badges: [{ label: "Fix Available", variant: "pink" }, { label: "3.8× Faster", variant: "success" }],
    }),
    analyze: () => ({
      mode: "analyze",
      content: `Dataset Analysis (${MOCK_RESULTS.length} rows):\n\nRole Distribution:\n  • user:   45%\n  • admin:  25%\n  • editor: 20%\n  • viewer: 10%\n\nActive Users: 67%\nDate Range: 2024-01 → 2024-12\nGrowth: +12% MoM\n\n📊 Suggested Charts:\n  • Pie chart: Role distribution\n  • Line chart: Signups over time\n  • Bar chart: Active vs inactive by role`,
      badges: [{ label: "Insight", variant: "cyan" }, { label: "Charts Ready", variant: "pink" }],
    }),
    debug: () => ({
      mode: "debug",
      content: `No syntax errors detected.\n\nPotential issues:\n  • Missing explicit schema qualifier on table reference\n  • LIMIT without OFFSET may cause inconsistent pagination\n  • No explicit column list — use SELECT u.* to be explicit`,
      badges: [{ label: "No Errors", variant: "success" }],
    }),
  };

  const handleAIAction = useCallback(
    (mode: NonNullable<AIMode>) => {
      setAiMode(mode);
      setAiLoading(true);
      setShowInsightPanel(true);
      setAiInsight(null);

      setTimeout(() => {
        setAiInsight(fakeAIResponse[mode]());
        setAiLoading(false);
        if (mode === "generate") {
          setQuery(
            `-- AI Generated Query (Optimized)\nWITH active_users AS (\n  SELECT id, email, name, role, active, created_at\n  FROM public.users\n  WHERE active = true\n)\nSELECT * FROM active_users\nORDER BY created_at DESC\nLIMIT 50;`
          );
        }
        if (mode === "optimize") {
          setGhostQuery(
            `-- Suggested Optimization\n-- ADD INDEX: CREATE INDEX CONCURRENTLY idx_users_active_created\n--             ON public.users (active, created_at DESC)\n--             WHERE active = true;`
          );
          setTimeout(() => setGhostQuery(""), 6000);
        }
      }, 1800);
    },
    []
  );

  const handlePromptSubmit = useCallback(() => {
    if (!prompt.trim()) return;
    setAiMode("generate");
    setAiLoading(true);
    setShowInsightPanel(true);
    setAiInsight(null);
    setPrompt("");

    setTimeout(() => {
      setQuery(
        `-- AI Generated from: "${prompt.trim()}"\nSELECT\n  u.id,\n  u.email,\n  u.name,\n  u.role,\n  COUNT(o.id) AS order_count,\n  SUM(o.total)::numeric(10,2) AS total_spent\nFROM public.users u\nLEFT JOIN public.orders o ON o.user_id = u.id\nWHERE u.active = true\nGROUP BY u.id, u.email, u.name, u.role\nHAVING COUNT(o.id) > 0\nORDER BY total_spent DESC\nLIMIT 25;`
      );
      setAiInsight({
        mode: "generate",
        content: `Generated query based on your prompt:\n"${prompt.trim()}"\n\nJoined users with orders table using LEFT JOIN. Aggregated order_count and total_spent per user. Applied HAVING clause to exclude users with no orders.`,
        badges: [{ label: "Generated", variant: "cyan" }, { label: "2 Tables", variant: "success" }],
      });
      setAiLoading(false);
    }, 1600);
  }, [prompt]);

  // ── Sorting ─────────────────────────────────────────────────────────────
  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const sortedResults = [...results].sort((a, b) => {
    if (!sortCol) return 0;
    const va = a[sortCol];
    const vb = b[sortCol];
    if (va === null) return 1;
    if (vb === null) return -1;
    const cmp = va < vb ? -1 : va > vb ? 1 : 0;
    return sortDir === "asc" ? cmp : -cmp;
  });

  const pageCount = Math.ceil(sortedResults.length / rowsPerPage);
  const pageData = sortedResults.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  // ── Export ──────────────────────────────────────────────────────────────
  const exportCSV = () => {
    if (!results.length) return;
    const header = columns.join(",");
    const rows = results.map((r) => columns.map((c) => JSON.stringify(r[c] ?? "")).join(","));
    const blob = new Blob([[header, ...rows].join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "query-results.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ description: "Exported as CSV" });
  };

  const exportJSON = () => {
    if (!results.length) return;
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "query-results.json"; a.click();
    URL.revokeObjectURL(url);
    toast({ description: "Exported as JSON" });
  };

  // ── Copy query ──────────────────────────────────────────────────────────
  const copyQuery = () => {
    navigator.clipboard.writeText(query);
    toast({ description: "Query copied to clipboard" });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface flex-shrink-0 flex-wrap">
        {/* Connection selector */}
        {connLoading ? (
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted-foreground">
            <Loader2 size={10} className="animate-spin" />
            Loading…
          </div>
        ) : connections.length === 0 ? (
          <button
            onClick={() => navigate("/settings")}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[11.5px] font-mono border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-surface-border transition-snap"
          >
            <Plus size={11} />
            Add Connection
          </button>
        ) : (
          <Selector
            label="CONN"
            value={selectedConnId ?? ""}
            options={connections.map((c) => ({ value: c.id, label: c.name }))}
            onChange={(v) => setSelectedConnId(v)}
          />
        )}

        {activeConn && (
          <>
            <span className="text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm">
              {activeConn.environment}
            </span>
            <span className={cn("ai-badge", activeConn.type === "postgresql" ? "ai-badge-cyan" : "ai-badge-pink")}>
              {activeConn.type === "postgresql" ? "PostgreSQL" : "MongoDB"}
            </span>
          </>
        )}

        <Selector
          label="SCH"
          value={schema}
          options={Object.keys(liveSchemas ?? MOCK_SCHEMAS[dbType]).map((s) => ({ value: s, label: s }))}
          onChange={setSchema}
        />
        <Selector
          label="TBL"
          value={table}
          options={Object.keys((liveSchemas ?? MOCK_SCHEMAS[dbType])[schema] ?? {}).map((t) => ({ value: t, label: t }))}
          onChange={setTable}
        />

        {schemaLoading && (
          <Loader2 size={11} className="animate-spin text-muted-foreground" />
        )}

        <div className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground font-mono">
          {queryTime !== null && (
            <span className="text-success">{queryTime}ms · {totalRows} rows</span>
          )}
        </div>
      </div>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Schema sidebar */}
        <SchemaSidebar
          dbType={dbType}
          schema={schema}
          table={table}
          onSchemaChange={setSchema}
          onTableChange={setTable}
          liveSchemas={liveSchemas ?? undefined}
        />

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Editor section */}
          <div className="flex flex-col border-b border-border" style={{ height: "40%" }}>
            {/* Editor toolbar */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-surface flex-shrink-0">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">SQL Editor</span>
              <div className="ml-auto flex items-center gap-1">
                <button onClick={copyQuery} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-snap">
                  <Copy size={11} />
                </button>
                <button
                  onClick={handleRunQuery}
                  disabled={runLoading}
                  className={cn(
                    "flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11.5px] font-medium transition-snap",
                    "bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                  )}
                >
                  {runLoading ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} strokeWidth={2.5} />}
                  Run
                </button>
              </div>
            </div>

            {/* Editor */}
            <div className="flex-1 relative overflow-hidden">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="code-editor absolute inset-0 w-full h-full px-4 py-3 resize-none rounded-none"
                spellCheck={false}
                placeholder="-- Enter your SQL query here..."
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleRunQuery();
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const start = e.currentTarget.selectionStart;
                    const end = e.currentTarget.selectionEnd;
                    setQuery(query.substring(0, start) + "  " + query.substring(end));
                    requestAnimationFrame(() => {
                      e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
                    });
                  }
                }}
              />
              {ghostQuery && (
                <div className="absolute bottom-2 left-0 right-0 px-4 pointer-events-none">
                  <pre className="code-editor text-[12px] opacity-40 bg-transparent border-none p-0 whitespace-pre-wrap">
                    {ghostQuery}
                  </pre>
                </div>
              )}
              {runLoading && (
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-surface overflow-hidden">
                  <div className="progress-indeterminate h-full" />
                </div>
              )}
            </div>

            {/* AI Actions bar */}
            <div className="flex items-center gap-1.5 px-3 py-2 border-t border-border bg-surface flex-shrink-0 flex-wrap">
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-wider mr-1">AI</span>
              {(
                [
                  { mode: "generate" as const, icon: Wand2,     label: "Generate" },
                  { mode: "explain"  as const, icon: Lightbulb, label: "Explain" },
                  { mode: "optimize" as const, icon: Zap,       label: "Optimize" },
                  { mode: "analyze"  as const, icon: BarChart3,  label: "Analyze Data" },
                  { mode: "debug"    as const, icon: AlertCircle,label: "Debug" },
                ] as const
              ).map(({ mode, icon: Icon, label }) => (
                <button
                  key={mode}
                  onClick={() => handleAIAction(mode)}
                  disabled={aiLoading}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] transition-snap",
                    "border disabled:opacity-50",
                    aiMode === mode && showInsightPanel
                      ? "border-accent/50 bg-accent-dim text-accent"
                      : "border-border bg-surface text-muted-foreground hover:text-foreground hover:border-surface-border"
                  )}
                >
                  <Icon size={10} />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* AI Prompt */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 border-b border-border transition-snap",
              promptFocused ? "bg-surface-raised" : "bg-surface"
            )}
          >
            <Sparkles size={12} className={cn("flex-shrink-0 transition-snap", promptFocused ? "text-accent" : "text-muted-foreground")} />
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setPromptFocused(true)}
              onBlur={() => setPromptFocused(false)}
              onKeyDown={(e) => e.key === "Enter" && handlePromptSubmit()}
              placeholder='Ask AI: "Show me top users by total spending last month..."'
              className={cn(
                "flex-1 bg-transparent outline-none font-sans text-[13px] text-foreground placeholder:text-muted-foreground/50 transition-snap"
              )}
            />
            {prompt && (
              <button
                onClick={handlePromptSubmit}
                className="px-2.5 py-1 text-[11px] bg-accent text-accent-foreground rounded-sm hover:opacity-90 transition-snap font-medium"
              >
                Generate ↵
              </button>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Error banner */}
            {queryError && (
              <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border-b border-destructive/30 text-destructive text-[11.5px] font-mono flex-shrink-0">
                <AlertCircle size={12} />
                {queryError}
                <button onClick={() => setQueryError(null)} className="ml-auto hover:opacity-70">
                  <X size={11} />
                </button>
              </div>
            )}

            {/* Results toolbar */}
            {results.length > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border bg-surface flex-shrink-0">
                <span className="text-[11px] font-mono text-muted-foreground">
                  {totalRows} rows · {columns.length} cols
                </span>
                <div className="ml-auto flex items-center gap-1">
                  <button onClick={exportCSV} className="flex items-center gap-1 px-2 py-1 rounded-sm text-[10.5px] text-muted-foreground hover:text-foreground hover:bg-muted transition-snap border border-border">
                    <FileText size={9} />CSV
                  </button>
                  <button onClick={exportJSON} className="flex items-center gap-1 px-2 py-1 rounded-sm text-[10.5px] text-muted-foreground hover:text-foreground hover:bg-muted transition-snap border border-border">
                    <FileJson size={9} />JSON
                  </button>
                  <button onClick={handleRunQuery} className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-snap">
                    <RefreshCw size={10} />
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="flex-1 overflow-auto">
              {results.length === 0 && !runLoading && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <Database size={28} className="text-muted-foreground/30" />
                  <p className="text-[12px] text-muted-foreground">
                    Run a query to see results. Press{" "}
                    <kbd className="px-1 py-0.5 rounded-sm bg-surface-border text-[10px] font-mono">⌘ Enter</kbd>
                  </p>
                </div>
              )}
              {results.length > 0 && (
                <table className="data-grid w-full border-collapse text-left">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-1.5 text-[10px] font-mono text-muted-foreground bg-surface border-b border-border w-8 text-center">#</th>
                      {columns.map((col) => (
                        <th
                          key={col}
                          onClick={() => handleSort(col)}
                          className="px-2.5 py-1.5 text-[10.5px] font-mono text-muted-foreground bg-surface border-b border-border cursor-pointer hover:text-foreground transition-snap select-none"
                        >
                          <div className="flex items-center gap-1">
                            {col}
                            {sortCol === col ? (
                              sortDir === "asc" ? <ChevronUp size={9} /> : <ChevronDown size={9} />
                            ) : (
                              <span className="w-[9px]" />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map((row, i) => (
                      <tr
                        key={i}
                        className="group border-b border-border/40 hover:bg-primary/5 transition-snap"
                      >
                        <td className="px-2 py-1 text-[10px] font-mono text-muted-foreground text-center">
                          {(page - 1) * rowsPerPage + i + 1}
                        </td>
                        {columns.map((col) => {
                          const val = row[col];
                          const isNull = val === null || val === undefined;
                          const isBool = typeof val === "boolean";
                          return (
                            <td
                              key={col}
                              className="px-2.5 py-1 text-[12px] font-mono"
                            >
                              {isNull ? (
                                <span className="text-muted-foreground/40 italic">NULL</span>
                              ) : isBool ? (
                                <span className={val ? "text-success" : "text-destructive"}>
                                  {String(val)}
                                </span>
                              ) : (
                                <span className="text-foreground">{String(val)}</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
              <div className="flex items-center justify-between px-3 py-1.5 border-t border-border bg-surface flex-shrink-0">
                <span className="text-[11px] font-mono text-muted-foreground">
                  Page {page} of {pageCount}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2 py-0.5 rounded-sm text-[11px] border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-snap"
                  >
                    Prev
                  </button>
                  {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
                    const p = Math.max(1, Math.min(page - 2, pageCount - 4)) + i;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={cn(
                          "w-6 h-6 rounded-sm text-[11px] font-mono transition-snap",
                          p === page
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={page === pageCount}
                    className="px-2 py-0.5 rounded-sm text-[11px] border border-border text-muted-foreground hover:text-foreground hover:bg-muted disabled:opacity-30 transition-snap"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* AI Insight Panel */}
        {showInsightPanel && (
          <AIInsightPanel
            insight={aiInsight}
            loading={aiLoading}
            onClose={() => { setShowInsightPanel(false); setAiInsight(null); setAiMode(null); }}
          />
        )}
      </div>
    </div>
  );
}

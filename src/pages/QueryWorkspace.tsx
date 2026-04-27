import { useState, useRef, useEffect, useCallback, useId } from "react";
import {
  Play, Wand2, Lightbulb, Zap, BarChart3, ChevronDown,
  Database, Table2, Copy, Download, RefreshCw, X, ChevronRight,
  ChevronUp, Check, AlertCircle, Loader2, FileJson, FileText,
  Sparkles, Plus, GripVertical,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useConnections, callAIAssistant, SchemaTree } from "@/hooks/useConnections";
import { addQueryRecord, addPromptRecord } from "@/hooks/useQueryStore";
import { usePermissions } from "@/hooks/usePermissions";
import { useNavigate } from "react-router-dom";

// ─── Types ──────────────────────────────────────────────────────────────
type DbType = "postgresql" | "mongodb";
type AIMode = "generate" | "explain" | "optimize" | "analyze" | "debug" | null;

interface ResultRow {
  [key: string]: string | number | boolean | null;
}

interface AIInsight {
  mode: AIMode;
  content: string;
  badges?: { label: string; variant: "cyan" | "pink" | "success" | "warning" }[];
}

// ─── Sub-components ──────────────────────────────────────────────────────

function Selector<T extends string>({
  label, value, options, onChange, disabled,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
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
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[11.5px] font-mono",
          "border border-border bg-surface transition-snap",
          "text-foreground hover:border-surface-border hover:bg-surface-raised",
          open && "border-primary/40",
          disabled && "opacity-50 cursor-not-allowed"
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
  schema, table, schemas, loading,
  onSchemaChange, onTableChange,
}: {
  schema: string;
  table: string;
  schemas: SchemaTree;
  loading: boolean;
  onSchemaChange: (s: string) => void;
  onTableChange: (t: string) => void;
}) {
  const [expandedSchemas, setExpandedSchemas] = useState<string[]>([]);

  // Auto-expand first schema
  useEffect(() => {
    const keys = Object.keys(schemas);
    if (keys.length > 0 && expandedSchemas.length === 0) {
      setExpandedSchemas([keys[0]]);
    }
  }, [schemas]);

  return (
    <div className="w-[220px] flex-shrink-0 flex flex-col border-r border-border bg-sidebar overflow-hidden">
      <div className="px-3 py-2 border-b border-sidebar-border flex items-center gap-2">
        <Database size={12} className="text-primary" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Schema Browser
        </span>
        {loading && <Loader2 size={10} className="animate-spin text-muted-foreground ml-auto" />}
      </div>

      <div className="flex-1 overflow-y-auto py-1.5">
        {Object.keys(schemas).length === 0 && !loading && (
          <p className="px-3 py-4 text-[11px] text-muted-foreground text-center">
            No schema loaded.<br />Select a connection.
          </p>
        )}
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
              <span className="font-mono">Analyzing…</span>
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

// ─── Resizable Editor Panel ──────────────────────────────────────────────

function useResizablePanel(initialPx = 300, minPx = 140, maxPx = 600) {
  const [height, setHeight] = useState(initialPx);
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(initialPx);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = height;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      const delta = ev.clientY - startY.current;
      setHeight(Math.min(maxPx, Math.max(minPx, startH.current + delta)));
    };
    const onUp = () => {
      dragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [height, minPx, maxPx]);

  return { height, onMouseDown };
}

// ─── Main Query Workspace ────────────────────────────────────────────────

const TEMPLATE_QUERY = (schema: string, table: string, dbType: DbType) => {
  if (dbType === "mongodb") {
    return `// MongoDB Query\ndb.${table}.find({}).limit(50)`;
  }
  return `SELECT *\nFROM ${schema}.${table}\nLIMIT 50;`;
};

/** Extract SQL code block from AI response or return full content */
function extractGeneratedQuery(content: string): string {
  // Extract ```sql ... ``` block
  const sqlMatch = content.match(/```sql\n?([\s\S]*?)```/i);
  if (sqlMatch) return sqlMatch[1].trim();
  // Extract ``` ... ``` block
  const codeMatch = content.match(/```\n?([\s\S]*?)```/);
  if (codeMatch) return codeMatch[1].trim();
  // Try to find first SELECT/WITH/db. statement
  const lines = content.split("\n");
  const queryStart = lines.findIndex((l) =>
    /^\s*(SELECT|WITH|db\.|{)/i.test(l)
  );
  if (queryStart >= 0) return lines.slice(queryStart).join("\n").trim();
  return content.trim();
}

const AI_BADGE_MAP: Record<string, { label: string; variant: "cyan" | "pink" | "success" | "warning" }[]> = {
  explain: [{ label: "Explanation", variant: "cyan" }],
  optimize: [{ label: "Optimization", variant: "pink" }],
  debug: [{ label: "Debug", variant: "warning" }],
  analyze: [{ label: "Analysis", variant: "cyan" }, { label: "Charts", variant: "pink" }],
  generate: [{ label: "Generated", variant: "cyan" }],
};

export default function QueryWorkspace() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { connections, loading: connLoading, fetchSchema } = useConnections();
  const { hasWriteFor, writeGrants } = usePermissions();

  // Selected connection
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);
  const [liveSchemas, setLiveSchemas] = useState<SchemaTree>({});
  const [schemaLoading, setSchemaLoading] = useState(false);

  const activeConn = connections.find((c) => c.id === selectedConnId) ?? null;

  // Auto-select first connection
  useEffect(() => {
    if (!selectedConnId && connections.length > 0) {
      setSelectedConnId(connections[0].id);
    }
  }, [connections, selectedConnId]);

  // Load schema when connection changes
  useEffect(() => {
    if (!selectedConnId) { setLiveSchemas({}); return; }
    setSchemaLoading(true);
    fetchSchema(selectedConnId)
      .then((schemas) => setLiveSchemas(schemas))
      .catch(() => setLiveSchemas({}))
      .finally(() => setSchemaLoading(false));
  }, [selectedConnId, fetchSchema]);

  // DB Controls — driven by live schemas
  const [dbType, setDbType] = useState<DbType>("postgresql");
  const [schema, setSchema] = useState("");
  const [table, setTable] = useState("");

  // Sync dbType with active connection
  useEffect(() => {
    if (activeConn) setDbType(activeConn.type as DbType);
  }, [activeConn]);

  // Sync schema/table when schemas load
  useEffect(() => {
    const schemaKeys = Object.keys(liveSchemas);
    if (schemaKeys.length === 0) return;
    const firstSchema = schemaKeys[0];
    const firstTable = Object.keys(liveSchemas[firstSchema] ?? {})[0] ?? "";
    setSchema(firstSchema);
    setTable(firstTable);
  }, [liveSchemas]);

  // Query state — single source of truth
  const [query, setQuery] = useState("");
  // Track whether user has manually edited the query
  const userEditedRef = useRef(false);

  // When table changes and user hasn't typed yet, offer a template
  useEffect(() => {
    if (schema && table && !userEditedRef.current) {
      setQuery(TEMPLATE_QUERY(schema, table, dbType));
    }
  }, [schema, table, dbType]);

  const handleQueryChange = useCallback((val: string) => {
    userEditedRef.current = true;
    setQuery(val);
  }, []);

  const handleTableChange = useCallback((t: string) => {
    setTable(t);
    // When user explicitly clicks a new table, show template but mark as not-user-edited
    // so next table switch also updates template
    userEditedRef.current = false;
  }, []);

  const handleSchemaChange = useCallback((s: string) => {
    setSchema(s);
    userEditedRef.current = false;
  }, []);

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

  // Resizable editor
  const { height: editorHeight, onMouseDown: onDragStart } = useResizablePanel(280, 140, 560);

  // ── Validation ──────────────────────────────────────────────────────────
  const WRITE_KEYWORDS = /\b(DELETE|UPDATE|INSERT|DROP|TRUNCATE|ALTER|CREATE|REPLACE|MERGE)\b/gi;
  const validateQuery = useCallback((q: string) => {
    if (!q.trim()) return "Query is empty";
    const match = q.match(WRITE_KEYWORDS);
    if (match) {
      const allowed = hasWriteFor(selectedConnId);
      if (!allowed) {
        const kws = [...new Set(match.map((s) => s.toUpperCase()))].join(", ");
        return `Write operation blocked (${kws}). You have read-only access — request WRITE permission from an administrator in Settings → Security.`;
      }
    }
    return null;
  }, [hasWriteFor, selectedConnId]);

  // ── Run Query ───────────────────────────────────────────────────────────
  // Note: Real execution requires a backend PostgreSQL/MongoDB driver.
  // Until a dedicated execute-query edge function with a native driver is available,
  // we show the validated query and inform user. The architecture is fully wired —
  // just swap setTimeout body with a real fetch to execute-query endpoint.
  const handleRunQuery = useCallback(async () => {
    const currentQuery = query;
    const err = validateQuery(currentQuery);
    if (err) {
      setQueryError(err);
      return;
    }
    setQueryError(null);
    setRunLoading(true);
    const start = performance.now();

    try {
      // TODO: Replace with real execute-query edge function call:
      // const headers = await authHeaders();
      // const res = await fetch(`${FUNCTIONS_URL}/execute-query`, {
      //   method: "POST", headers,
      //   body: JSON.stringify({ connection_id: selectedConnId, query: currentQuery }),
      // });
      // const json = await res.json();
      // if (!res.ok) throw new Error(json.error);
      // setResults(json.rows); setColumns(json.columns); setTotalRows(json.rowCount);

      // Placeholder until execute-query function is implemented
      await new Promise((r) => setTimeout(r, 400));
      const durationMs = Math.round(performance.now() - start);

      // Show zero-result state with note
      setResults([]);
      setColumns([]);
      setTotalRows(0);
      setPage(1);
      setQueryTime(durationMs);

      addQueryRecord({
        query: currentQuery,
        dbType,
        connectionName: activeConn?.name ?? "Unknown",
        schema,
        table,
        executedAt: new Date().toISOString(),
        durationMs,
        rowCount: 0,
        status: "success",
      });

      toast({
        description: "Query validated ✓ — connect a live DB execute-query endpoint to see real results.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Query failed";
      setQueryError(msg);
      addQueryRecord({
        query: currentQuery,
        dbType,
        connectionName: activeConn?.name ?? "Unknown",
        schema,
        table,
        executedAt: new Date().toISOString(),
        durationMs: Math.round(performance.now() - start),
        rowCount: 0,
        status: "error",
        error: msg,
      });
    } finally {
      setRunLoading(false);
    }
  }, [query, validateQuery, dbType, schema, table, activeConn]);

  // ── AI actions ──────────────────────────────────────────────────────────
  const handleAIAction = useCallback(
    async (mode: NonNullable<AIMode>) => {
      // Validate: require non-empty query for non-generate actions
      if (mode !== "generate" && !query.trim()) {
        toast({ description: "Write a query first before using AI actions.", variant: "destructive" });
        return;
      }

      setAiMode(mode);
      setAiLoading(true);
      setShowInsightPanel(true);
      setAiInsight(null);

      const start = Date.now();
      try {
        const response = await callAIAssistant({
          action: mode,
          query: query.trim() || undefined,
          schema: Object.keys(liveSchemas).length > 0 ? liveSchemas : undefined,
          dbType,
          results: mode === "analyze" ? (results as Record<string, unknown>[]) : undefined,
          model: "google/gemini-2.5-flash",
        });

        const durationMs = Date.now() - start;

        const insight: AIInsight = {
          mode,
          content: response.content,
          badges: AI_BADGE_MAP[mode] ?? [],
        };
        setAiInsight(insight);
        setAiLoading(false);

        // For optimize: show the AI suggestion in a ghost overlay too
        // For generate from prompt: done via handlePromptSubmit
        if (mode === "optimize") {
          const optimized = extractGeneratedQuery(response.content);
          if (optimized && optimized !== response.content) {
            // Show as ghost suggestion without replacing user query
          }
        }

        addPromptRecord({
          prompt: "",
          action: mode,
          model: "google/gemini-2.5-flash",
          inputTokens: response.inputTokens,
          outputTokens: response.outputTokens,
          executedAt: new Date().toISOString(),
          durationMs,
          resultPreview: response.content.slice(0, 200),
          linkedQuery: query,
          status: "success",
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "AI request failed";
        setAiInsight({ mode, content: `Error: ${msg}`, badges: [{ label: "Error", variant: "warning" }] });
        setAiLoading(false);

        addPromptRecord({
          prompt: "",
          action: mode,
          model: "google/gemini-2.5-flash",
          inputTokens: 0,
          outputTokens: 0,
          executedAt: new Date().toISOString(),
          durationMs: Date.now() - start,
          resultPreview: msg,
          status: "error",
        });
      }
    },
    [query, liveSchemas, dbType, results]
  );

  const handlePromptSubmit = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    setAiMode("generate");
    setAiLoading(true);
    setShowInsightPanel(true);
    setAiInsight(null);
    setPrompt("");

    const start = Date.now();
    try {
      const response = await callAIAssistant({
        action: "generate",
        prompt: trimmedPrompt,
        schema: Object.keys(liveSchemas).length > 0 ? liveSchemas : undefined,
        dbType,
        model: "google/gemini-2.5-flash",
      });

      const durationMs = Date.now() - start;
      const generatedQuery = extractGeneratedQuery(response.content);

      // Replace editor with generated query, mark as user-edited so table switches don't overwrite
      userEditedRef.current = true;
      setQuery(generatedQuery);

      setAiInsight({
        mode: "generate",
        content: response.content,
        badges: [{ label: "Generated", variant: "cyan" }, { label: "From Prompt", variant: "success" }],
      });
      setAiLoading(false);

      addPromptRecord({
        prompt: trimmedPrompt,
        action: "generate",
        model: "google/gemini-2.5-flash",
        inputTokens: response.inputTokens,
        outputTokens: response.outputTokens,
        executedAt: new Date().toISOString(),
        durationMs,
        resultPreview: generatedQuery.slice(0, 200),
        linkedQuery: generatedQuery,
        status: "success",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Generation failed";
      setAiInsight({ mode: "generate", content: `Error: ${msg}`, badges: [{ label: "Error", variant: "warning" }] });
      setAiLoading(false);

      addPromptRecord({
        prompt: trimmedPrompt,
        action: "generate",
        model: "google/gemini-2.5-flash",
        inputTokens: 0,
        outputTokens: 0,
        executedAt: new Date().toISOString(),
        durationMs: Date.now() - start,
        resultPreview: msg,
        status: "error",
      });
    }
  }, [prompt, liveSchemas, dbType]);

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

  const copyQuery = () => {
    navigator.clipboard.writeText(query);
    toast({ description: "Query copied to clipboard" });
  };

  // Schema options for selectors
  const schemaOptions = Object.keys(liveSchemas).map((s) => ({ value: s, label: s }));
  const tableOptions = Object.keys(liveSchemas[schema] ?? {}).map((t) => ({ value: t, label: t }));

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-surface flex-shrink-0 flex-wrap">
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
            onChange={(v) => {
              setSelectedConnId(v);
              userEditedRef.current = false;
            }}
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

        {schemaOptions.length > 0 && (
          <>
            <Selector label="SCH" value={schema} options={schemaOptions} onChange={handleSchemaChange} />
            <Selector label="TBL" value={table} options={tableOptions} onChange={handleTableChange} disabled={tableOptions.length === 0} />
          </>
        )}

        {schemaLoading && <Loader2 size={11} className="animate-spin text-muted-foreground" />}

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
          schema={schema}
          table={table}
          schemas={liveSchemas}
          loading={schemaLoading}
          onSchemaChange={handleSchemaChange}
          onTableChange={handleTableChange}
        />

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Resizable editor section */}
          <div className="flex flex-col border-b border-border flex-shrink-0" style={{ height: editorHeight }}>
            {/* Editor toolbar */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-border bg-surface flex-shrink-0">
              <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
                {activeConn?.type === "mongodb" ? "Query Editor" : "SQL Editor"}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <button onClick={copyQuery} className="p-1.5 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground transition-snap" title="Copy query">
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
                onChange={(e) => handleQueryChange(e.target.value)}
                className="code-editor absolute inset-0 w-full h-full px-4 py-3 resize-none rounded-none"
                spellCheck={false}
                placeholder={activeConn?.type === "mongodb"
                  ? "// Enter your MongoDB query here...\ndb.collection.find({})"
                  : "-- Enter your SQL query here...\nSELECT * FROM table LIMIT 50;"
                }
                onKeyDown={(e) => {
                  if ((e.metaKey || e.ctrlKey) && e.key === "Enter") handleRunQuery();
                  if (e.key === "Tab") {
                    e.preventDefault();
                    const start = e.currentTarget.selectionStart;
                    const end = e.currentTarget.selectionEnd;
                    const newVal = query.substring(0, start) + "  " + query.substring(end);
                    handleQueryChange(newVal);
                    requestAnimationFrame(() => {
                      e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
                    });
                  }
                }}
              />
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
                  { mode: "explain"  as const, icon: Lightbulb,   label: "Explain" },
                  { mode: "optimize" as const, icon: Zap,          label: "Optimize" },
                  { mode: "analyze"  as const, icon: BarChart3,    label: "Analyze Data" },
                  { mode: "debug"    as const, icon: AlertCircle,  label: "Debug" },
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

          {/* ── Resize handle ── */}
          <div
            onMouseDown={onDragStart}
            className="flex items-center justify-center h-2.5 border-b border-border bg-surface flex-shrink-0 cursor-row-resize group hover:bg-primary/10 transition-snap select-none"
            title="Drag to resize editor"
          >
            <GripVertical size={12} className="text-muted-foreground/40 group-hover:text-primary/60 rotate-90" />
          </div>

          {/* AI Prompt */}
          <div
            className={cn(
              "flex items-center gap-2 px-3 py-2 border-b border-border transition-snap flex-shrink-0",
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
              placeholder='Ask AI: "Show me top users by total spending last month…"'
              className="flex-1 bg-transparent outline-none font-sans text-[13px] text-foreground placeholder:text-muted-foreground/50 transition-snap"
            />
            {prompt && (
              <button
                onClick={handlePromptSubmit}
                disabled={aiLoading}
                className="px-2.5 py-1 text-[11px] bg-accent text-accent-foreground rounded-sm hover:opacity-90 transition-snap font-medium disabled:opacity-50 flex items-center gap-1.5"
              >
                {aiLoading ? <Loader2 size={10} className="animate-spin" /> : null}
                Generate ↵
              </button>
            )}
          </div>

          {/* Results */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {queryError && (
              <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border-b border-destructive/30 text-destructive text-[11.5px] font-mono flex-shrink-0">
                <AlertCircle size={12} />
                {queryError}
                <button onClick={() => setQueryError(null)} className="ml-auto hover:opacity-70">
                  <X size={11} />
                </button>
              </div>
            )}

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

            <div className="flex-1 overflow-auto">
              {results.length === 0 && !runLoading && (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
                  <div className="w-12 h-12 rounded-sm bg-surface border border-border flex items-center justify-center">
                    <Play size={18} className="text-muted-foreground/40" />
                  </div>
                  <p className="text-[12px] text-muted-foreground font-mono">
                    {connections.length === 0
                      ? "Add a database connection to start querying"
                      : schemaLoading
                        ? "Loading schema…"
                        : "Run a query to see results"
                    }
                  </p>
                  {connections.length === 0 && (
                    <button
                      onClick={() => navigate("/settings")}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[12px] bg-primary text-primary-foreground hover:opacity-90 transition-snap"
                    >
                      <Plus size={11} /> Add Connection
                    </button>
                  )}
                </div>
              )}

              {results.length > 0 && (
                <table className="w-full border-collapse text-[12px]">
                  <thead className="sticky top-0 z-10">
                    <tr>
                      {columns.map((col) => (
                        <th
                          key={col}
                          onClick={() => handleSort(col)}
                          className="px-3 py-2 text-left font-semibold uppercase tracking-wider text-[10.5px] text-muted-foreground bg-surface border-b border-border cursor-pointer hover:text-foreground whitespace-nowrap select-none"
                        >
                          <div className="flex items-center gap-1">
                            {col}
                            {sortCol === col && (
                              sortDir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageData.map((row, i) => (
                      <tr key={i} className="border-b border-border/40 hover:bg-primary/5 transition-snap">
                        {columns.map((col) => (
                          <td key={col} className="px-3 py-2 font-mono text-foreground/90 whitespace-nowrap max-w-[240px]">
                            <span className="truncate block">
                              {row[col] === null
                                ? <span className="text-muted-foreground/50 italic">NULL</span>
                                : row[col] === true
                                  ? <span className="text-success">true</span>
                                  : row[col] === false
                                    ? <span className="text-destructive/80">false</span>
                                    : String(row[col])
                              }
                            </span>
                          </td>
                        ))}
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
                    className="px-2 py-1 rounded-sm text-[11px] border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-snap disabled:opacity-40"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                    disabled={page === pageCount}
                    className="px-2 py-1 rounded-sm text-[11px] border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-snap disabled:opacity-40"
                  >
                    →
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

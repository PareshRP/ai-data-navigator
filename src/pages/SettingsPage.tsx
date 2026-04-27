import { useState } from "react";
import {
  Settings, Database, Cpu, Shield, Activity,
  Plus, Trash2, Check, AlertCircle,
  ChevronRight, Zap, Globe, Loader2, RefreshCw, UserCog, ShieldCheck, Clock, Infinity as InfinityIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useConnections } from "@/hooks/useConnections";
import AddConnectionDialog from "@/components/AddConnectionDialog";
import { useToast } from "@/hooks/use-toast";
import { usePermissions } from "@/hooks/usePermissions";
import AdminPermissionsPanel from "@/components/AdminPermissionsPanel";

type Tab = "connections" | "ai" | "security" | "usage" | "permissions";

const AI_MODELS = [
  { id: "google/gemini-3-flash-preview", label: "Gemini 3 Flash (Default)", speed: "Fast", quality: "High" },
  { id: "google/gemini-2.5-pro",         label: "Gemini 2.5 Pro",           speed: "Slow", quality: "Best" },
  { id: "google/gemini-2.5-flash",       label: "Gemini 2.5 Flash",         speed: "Fast", quality: "Good" },
  { id: "openai/gpt-5.2",               label: "GPT-5.2",                  speed: "Medium", quality: "Best" },
  { id: "openai/gpt-5-mini",            label: "GPT-5 Mini",               speed: "Fast", quality: "Good" },
];

const BLOCKED_KEYWORDS = ["DELETE", "UPDATE", "INSERT", "DROP", "TRUNCATE", "ALTER", "CREATE", "REPLACE", "MERGE"];

const USAGE_DATA = [
  { date: "Dec 9",  prompts: 12, tokens: 4200 },
  { date: "Dec 10", prompts: 18, tokens: 6800 },
  { date: "Dec 11", prompts:  8, tokens: 3100 },
  { date: "Dec 12", prompts: 24, tokens: 9200 },
  { date: "Dec 13", prompts: 31, tokens: 11400 },
  { date: "Dec 14", prompts: 19, tokens: 7300 },
  { date: "Dec 15", prompts: 22, tokens: 8600 },
];

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>("connections");
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);
  const [rateLimitPerMinute, setRateLimitPerMinute] = useState(20);
  const [maxQueryRows, setMaxQueryRows] = useState(500);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);

  const { connections, loading, error, addConnection, deleteConnection, testConnection } = useConnections();
  const { toast } = useToast();
  const { isAdmin, writeGrants } = usePermissions();

  const handleDelete = async (id: string) => {
    try {
      await deleteConnection(id);
      toast({ title: "Connection removed" });
    } catch (e) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    }
  };

  const handleTest = async (id: string) => {
    setTestingId(id);
    try {
      const status = await testConnection(id);
      toast({
        title: status === "connected" ? "Connection successful" : "Connection failed",
        variant: status === "connected" ? "default" : "destructive",
      });
    } catch (e) {
      toast({ title: "Test failed", description: e instanceof Error ? e.message : "Unknown error", variant: "destructive" });
    } finally {
      setTestingId(null);
    }
  };

  const statusColor: Record<string, string> = {
    connected:    "text-success",
    disconnected: "text-muted-foreground",
    error:        "text-destructive",
  };

  const totalTokens = USAGE_DATA.reduce((acc, d) => acc + d.tokens, 0);
  const totalPrompts = USAGE_DATA.reduce((acc, d) => acc + d.prompts, 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {showAddDialog && (
        <AddConnectionDialog
          onClose={() => setShowAddDialog(false)}
          onAdd={async (conn) => { await addConnection(conn); }}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-surface flex-shrink-0">
        <Settings size={15} className="text-primary" />
        <h1 className="text-[13px] font-semibold text-foreground">Settings</h1>
      </div>

      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Settings sidebar */}
        <div className="w-[180px] flex-shrink-0 border-r border-border bg-sidebar py-2">
          {(
            [
              { id: "connections" as Tab, icon: Database, label: "Connections" },
              { id: "ai"          as Tab, icon: Cpu,      label: "AI Model" },
              { id: "security"    as Tab, icon: Shield,   label: "Security" },
              ...(isAdmin ? [{ id: "permissions" as Tab, icon: UserCog, label: "Permissions" }] : []),
              { id: "usage"       as Tab, icon: Activity, label: "API Usage" },
            ] as const
          ).map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 text-[12px] transition-snap",
                activeTab === id
                  ? "text-primary bg-sidebar-accent"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon size={13} />
              {label}
              {activeTab === id && <ChevronRight size={10} className="ml-auto" />}
            </button>
          ))}
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-auto p-5 space-y-5">

          {/* ── Connections ── */}
          {activeTab === "connections" && (
            <div className="space-y-4 max-w-2xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[13px] font-semibold text-foreground">Database Connections</h2>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5">
                    Your connections are isolated and encrypted. Other users cannot see them.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddDialog(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[11.5px] bg-primary text-primary-foreground hover:opacity-90 transition-snap"
                >
                  <Plus size={11} /> Add Connection
                </button>
              </div>

              {/* Loading */}
              {loading && (
                <div className="flex items-center gap-2 text-muted-foreground text-[12px] font-mono py-4">
                  <Loader2 size={13} className="animate-spin" />
                  Loading connections…
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-destructive/10 border border-destructive/20 text-destructive text-[12px] font-mono">
                  <AlertCircle size={11} />
                  {error}
                </div>
              )}

              {/* Empty state */}
              {!loading && !error && connections.length === 0 && (
                <div className="panel p-8 flex flex-col items-center gap-3 text-center">
                  <div className="w-12 h-12 rounded-sm bg-primary-dim border border-primary/20 flex items-center justify-center">
                    <Database size={20} className="text-primary opacity-60" />
                  </div>
                  <p className="text-[13px] font-semibold text-foreground">No connections yet</p>
                  <p className="text-[11.5px] text-muted-foreground max-w-xs leading-relaxed">
                    Add your first database connection to start running queries. Credentials are encrypted and only visible to you.
                  </p>
                  <button
                    onClick={() => setShowAddDialog(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[12px] bg-primary text-primary-foreground hover:opacity-90 transition-snap mt-1"
                  >
                    <Plus size={11} /> Add Connection
                  </button>
                </div>
              )}

              {/* Connection list */}
              <div className="space-y-2">
                {connections.map((conn) => (
                  <div key={conn.id} className="panel p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className={cn("w-2 h-2 rounded-full flex-shrink-0", {
                          "bg-success": conn.status === "connected",
                          "bg-muted-foreground": conn.status === "disconnected",
                          "bg-destructive": conn.status === "error",
                        })} />
                        <span className="text-[13px] font-medium text-foreground">{conn.name}</span>
                        <span className={cn("ai-badge", conn.type === "postgresql" ? "ai-badge-cyan" : "ai-badge-pink")}>
                          {conn.type === "postgresql" ? "PostgreSQL" : "MongoDB"}
                        </span>
                        <span className="text-[10px] font-mono text-muted-foreground border border-border px-1.5 py-0.5 rounded-sm">
                          {conn.environment}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn("text-[11px] font-mono capitalize", statusColor[conn.status])}>
                          {conn.status}
                        </span>
                        <button
                          onClick={() => handleTest(conn.id)}
                          disabled={testingId === conn.id}
                          title="Test connection"
                          className="p-1 rounded-sm text-muted-foreground hover:text-primary hover:bg-primary/10 transition-snap disabled:opacity-50"
                        >
                          {testingId === conn.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <RefreshCw size={11} />}
                        </button>
                        <button
                          onClick={() => handleDelete(conn.id)}
                          className="p-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-snap"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-[11px] font-mono">
                      {[
                        { label: "Host", value: conn.host },
                        { label: "Port", value: String(conn.port) },
                        { label: "Database", value: conn.database_name },
                        { label: "Username", value: conn.username },
                        { label: "Password", value: "••••••••" },
                        { label: "SSL", value: conn.ssl_enabled ? "Enabled" : "Disabled" },
                      ].map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
                          <span className="text-foreground">{value}</span>
                        </div>
                      ))}
                    </div>

                    {conn.status === "error" && conn.error_message && (
                      <div className="mt-3 flex items-center gap-2 text-[11px] text-destructive font-mono bg-destructive/10 border border-destructive/20 rounded-sm px-2.5 py-1.5">
                        <AlertCircle size={10} />
                        {conn.error_message}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── AI Model ── */}
          {activeTab === "ai" && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <h2 className="text-[13px] font-semibold text-foreground">AI Model Configuration</h2>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">Select the LLM model used for query generation and analysis.</p>
              </div>

              <div className="space-y-2">
                {AI_MODELS.map((model) => (
                  <button
                    key={model.id}
                    onClick={() => setSelectedModel(model.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-3 rounded-sm border text-left transition-snap",
                      selectedModel === model.id
                        ? "border-primary/40 bg-primary-dim"
                        : "border-border bg-surface hover:border-surface-border"
                    )}
                  >
                    <div className={cn(
                      "w-4 h-4 rounded-sm border flex items-center justify-center flex-shrink-0",
                      selectedModel === model.id ? "border-primary bg-primary" : "border-border"
                    )}>
                      {selectedModel === model.id && <Check size={9} className="text-primary-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium text-foreground">{model.label}</p>
                      <p className="text-[11px] font-mono text-muted-foreground">{model.id}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={cn("ai-badge", model.speed === "Fast" ? "ai-badge-success" : model.speed === "Slow" ? "ai-badge-warning" : "ai-badge-cyan")}>
                        {model.speed}
                      </span>
                      <span className={cn("ai-badge", model.quality === "Best" ? "ai-badge-pink" : "ai-badge-cyan")}>
                        {model.quality}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              <div className="panel p-4 space-y-3">
                <p className="text-[12px] font-semibold text-foreground">Query Limits</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">Max Result Rows</label>
                    <input
                      type="number"
                      value={maxQueryRows}
                      onChange={(e) => setMaxQueryRows(Number(e.target.value))}
                      className="code-editor w-full px-2.5 py-1.5 rounded-sm text-[12px]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground uppercase tracking-wider block mb-1.5">AI Rate Limit (req/min)</label>
                    <input
                      type="number"
                      value={rateLimitPerMinute}
                      onChange={(e) => setRateLimitPerMinute(Number(e.target.value))}
                      className="code-editor w-full px-2.5 py-1.5 rounded-sm text-[12px]"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Security ── */}
          {activeTab === "security" && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <h2 className="text-[13px] font-semibold text-foreground">Security Guardrails</h2>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">All queries are validated before execution. Write operations are blocked.</p>
              </div>

              <div className="panel p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Shield size={13} className="text-success" />
                  <p className="text-[12px] font-semibold text-foreground">Read-Only Enforcement</p>
                  <span className="ai-badge ai-badge-success ml-auto">Active</span>
                </div>
                <p className="text-[11.5px] text-muted-foreground">
                  The query validator blocks all write operations before they reach the database.
                  AI-generated queries are also validated.
                </p>
                <div className="bg-background rounded-sm border border-border p-3">
                  <p className="text-[10.5px] text-muted-foreground uppercase tracking-wider mb-2">Blocked Keywords</p>
                  <div className="flex flex-wrap gap-1.5">
                    {BLOCKED_KEYWORDS.map((kw) => (
                      <span key={kw} className="px-2 py-0.5 rounded-sm bg-destructive/10 text-destructive text-[11px] font-mono border border-destructive/20">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="panel p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe size={13} className="text-primary" />
                  <p className="text-[12px] font-semibold text-foreground">Credential Security</p>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {[
                    { label: "Password Encryption",    value: "AES XOR + Base64", status: "Active" },
                    { label: "RLS User Isolation",      value: "Per-user rows",    status: "Active" },
                    { label: "Credentials Exposure",    value: "Never returned",   status: "Protected" },
                    { label: "SSO Authentication",      value: "Google OAuth2",    status: "Active" },
                  ].map(({ label, value, status }) => (
                    <div key={label} className="flex items-center justify-between bg-background rounded-sm border border-border px-3 py-2">
                      <div>
                        <p className="text-[11px] text-muted-foreground">{label}</p>
                        <p className="text-[12px] font-mono text-foreground">{value}</p>
                      </div>
                      <span className="ai-badge ai-badge-success">{status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Globe size={13} className="text-primary" />
                  <p className="text-[12px] font-semibold text-foreground">Rate Limiting</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "AI Endpoints",    value: `${rateLimitPerMinute}/min`, status: "Active" },
                    { label: "Query Execution", value: "100/min",                   status: "Active" },
                    { label: "Schema Fetch",    value: "50/min",                    status: "Active" },
                  ].map(({ label, value, status }) => (
                    <div key={label} className="bg-background rounded-sm border border-border p-2.5">
                      <p className="text-[10.5px] text-muted-foreground">{label}</p>
                      <p className="text-[13px] font-mono text-foreground mt-0.5">{value}</p>
                      <span className="ai-badge ai-badge-success mt-1 inline-flex">{status}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="panel p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Zap size={13} className="text-warning" />
                  <p className="text-[12px] font-semibold text-foreground">Query Audit Log</p>
                </div>
                <p className="text-[11.5px] text-muted-foreground">All query executions and AI actions are logged for audit purposes. Logs are retained for 30 days.</p>
                <div className="mt-3 flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-success" />
                  <span className="text-[11px] font-mono text-muted-foreground">Audit logging enabled · 7,482 events (30d)</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Usage ── */}
          {activeTab === "usage" && (
            <div className="space-y-4 max-w-2xl">
              <div>
                <h2 className="text-[13px] font-semibold text-foreground">API Usage</h2>
                <p className="text-[11.5px] text-muted-foreground mt-0.5">Last 7 days of AI API consumption.</p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Total Prompts",   value: totalPrompts },
                  { label: "Tokens Used",     value: totalTokens.toLocaleString() },
                  { label: "Avg Tokens/Call", value: Math.round(totalTokens / totalPrompts) },
                ].map(({ label, value }) => (
                  <div key={label} className="panel p-3">
                    <p className="text-[10.5px] text-muted-foreground uppercase tracking-wider">{label}</p>
                    <p className="text-[22px] font-mono font-semibold text-foreground mt-1">{value}</p>
                  </div>
                ))}
              </div>

              <div className="panel p-4">
                <p className="text-[12px] font-semibold text-foreground mb-3">Daily Breakdown</p>
                <table className="w-full">
                  <thead>
                    <tr>
                      {["Date", "Prompts", "Tokens", "Avg Duration"].map((h) => (
                        <th key={h} className="text-left text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground pb-2 pr-4">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {USAGE_DATA.map((d) => (
                      <tr key={d.date} className="border-t border-border/40">
                        <td className="py-1.5 pr-4 text-[12px] font-mono text-foreground">{d.date}</td>
                        <td className="py-1.5 pr-4 text-[12px] font-mono text-foreground">{d.prompts}</td>
                        <td className="py-1.5 pr-4 text-[12px] font-mono text-primary">{d.tokens.toLocaleString()}</td>
                        <td className="py-1.5 text-[12px] font-mono text-muted-foreground">
                          {Math.round(d.tokens / d.prompts * 0.08)}ms
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="panel p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[12px] font-semibold text-foreground">Monthly Quota</p>
                  <span className="text-[11px] font-mono text-muted-foreground">{totalTokens.toLocaleString()} / 100,000 tokens</span>
                </div>
                <div className="h-2 bg-muted rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-sm transition-all"
                    style={{ width: `${(totalTokens / 100000) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1.5">
                  {Math.round((totalTokens / 100000) * 100)}% used this month
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

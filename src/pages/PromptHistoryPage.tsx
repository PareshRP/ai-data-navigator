import { useState } from "react";
import { MessageSquare, Search, Wand2, Lightbulb, Zap, BarChart3, AlertCircle, X, Copy, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

type AIActionType = "generate" | "explain" | "optimize" | "analyze" | "debug";

interface PromptRecord {
  id: string;
  prompt: string;
  action: AIActionType;
  model: string;
  inputTokens: number;
  outputTokens: number;
  executedAt: string;
  durationMs: number;
  resultPreview: string;
  status: "success" | "error";
}

const ACTION_ICONS: Record<AIActionType, React.ElementType> = {
  generate: Wand2,
  explain:  Lightbulb,
  optimize: Zap,
  analyze:  BarChart3,
  debug:    AlertCircle,
};

const ACTION_COLORS: Record<AIActionType, string> = {
  generate: "ai-badge-cyan",
  explain:  "ai-badge-cyan",
  optimize: "ai-badge-pink",
  analyze:  "ai-badge-cyan",
  debug:    "ai-badge-warning",
};

const MOCK_PROMPTS: PromptRecord[] = [
  {
    id: "p1",
    prompt: "Show me the top 10 users by total order spending last 30 days",
    action: "generate", model: "gemini-2.5-flash",
    inputTokens: 312, outputTokens: 187,
    executedAt: "2024-12-15T14:22:00Z", durationMs: 1240, status: "success",
    resultPreview: "Generated SELECT with CTE and SUM aggregate over orders with date filter.",
  },
  {
    id: "p2",
    prompt: "",
    action: "explain", model: "gemini-2.5-flash",
    inputTokens: 580, outputTokens: 310,
    executedAt: "2024-12-15T13:45:00Z", durationMs: 1850, status: "success",
    resultPreview: "Sequential scan on users table. Sort on created_at not indexed. Recommend composite index.",
  },
  {
    id: "p3",
    prompt: "",
    action: "optimize", model: "gemini-2.5-flash",
    inputTokens: 620, outputTokens: 420,
    executedAt: "2024-12-15T13:30:00Z", durationMs: 2100, status: "success",
    resultPreview: "Rewrote subquery as CTE. Added index suggestion. Estimated 3.8× speedup.",
  },
  {
    id: "p4",
    prompt: "Find all products low in stock with their category averages",
    action: "generate", model: "gemini-2.5-flash",
    inputTokens: 290, outputTokens: 210,
    executedAt: "2024-12-15T12:00:00Z", durationMs: 980, status: "success",
    resultPreview: "Generated query using window function AVG() OVER (PARTITION BY category).",
  },
  {
    id: "p5",
    prompt: "",
    action: "analyze", model: "gemini-2.5-flash",
    inputTokens: 1200, outputTokens: 580,
    executedAt: "2024-12-14T17:00:00Z", durationMs: 3200, status: "success",
    resultPreview: "Role distribution analysis. 67% active users. Suggested pie chart and line chart for growth.",
  },
  {
    id: "p6",
    prompt: "Why is this query returning an error for the UUID column?",
    action: "debug", model: "gemini-2.5-flash",
    inputTokens: 350, outputTokens: 240,
    executedAt: "2024-12-14T16:30:00Z", durationMs: 1100, status: "success",
    resultPreview: "UUID comparison requires proper casting. Use ::uuid or parameterized query.",
  },
];

export default function PromptHistoryPage() {
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = MOCK_PROMPTS.filter((r) => {
    const matchSearch =
      r.prompt.toLowerCase().includes(search.toLowerCase()) ||
      r.resultPreview.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === "all" || r.action === filterAction;
    return matchSearch && matchAction;
  });

  const totalTokens = MOCK_PROMPTS.reduce((acc, r) => acc + r.inputTokens + r.outputTokens, 0);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageSquare size={15} className="text-primary" />
          <h1 className="text-[13px] font-semibold text-foreground">Prompt History</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 text-[11px] font-mono">
            <span className="text-muted-foreground">Total prompts: <span className="text-foreground">{MOCK_PROMPTS.length}</span></span>
            <span className="text-muted-foreground">Tokens used: <span className="text-primary">{totalTokens.toLocaleString()}</span></span>
          </div>
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
            placeholder="Search prompts..."
            className="bg-transparent outline-none text-[12px] font-mono text-foreground placeholder:text-muted-foreground w-full"
          />
          {search && (
            <button onClick={() => setSearch("")}><X size={10} className="text-muted-foreground" /></button>
          )}
        </div>

        <div className="flex items-center gap-1">
          {["all", "generate", "explain", "optimize", "analyze", "debug"].map((v) => (
            <button
              key={v}
              onClick={() => setFilterAction(v)}
              className={cn(
                "flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] font-mono transition-snap border capitalize",
                filterAction === v
                  ? "border-primary/40 bg-primary-dim text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {v !== "all" && (() => { const Icon = ACTION_ICONS[v as AIActionType]; return <Icon size={9} />; })()}
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto py-2 px-4 space-y-2">
        {filtered.map((r) => {
          const Icon = ACTION_ICONS[r.action];
          const isExpanded = expanded === r.id;
          return (
            <div
              key={r.id}
              className={cn(
                "panel transition-snap cursor-pointer",
                isExpanded && "border-primary/30"
              )}
              onClick={() => setExpanded(isExpanded ? null : r.id)}
            >
              <div className="flex items-start gap-3 p-3">
                <div className={cn("w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0", r.action === "optimize" ? "bg-accent-dim" : "bg-primary-dim")}>
                  <Icon size={13} className={r.action === "optimize" ? "text-accent" : "text-primary"} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn("ai-badge", ACTION_COLORS[r.action])}>{r.action}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{r.model}</span>
                    <span className="ml-auto text-[10px] font-mono text-muted-foreground flex items-center gap-1">
                      <Clock size={9} />
                      {formatDate(r.executedAt)}
                    </span>
                  </div>

                  {r.prompt ? (
                    <p className="text-[12.5px] text-foreground mb-1 truncate">{r.prompt}</p>
                  ) : (
                    <p className="text-[12px] text-muted-foreground italic mb-1">Query-based {r.action}</p>
                  )}

                  <p className="text-[11.5px] text-muted-foreground line-clamp-1">{r.resultPreview}</p>
                </div>

                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-[11px] font-mono text-primary">{r.durationMs}ms</p>
                  <p className="text-[10px] font-mono text-muted-foreground">{(r.inputTokens + r.outputTokens).toLocaleString()} tok</p>
                </div>
              </div>

              {isExpanded && (
                <div className="border-t border-border px-3 py-3 space-y-2 animate-fade-in">
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "Input Tokens", value: r.inputTokens.toLocaleString() },
                      { label: "Output Tokens", value: r.outputTokens.toLocaleString() },
                      { label: "Duration", value: `${r.durationMs}ms` },
                      { label: "Model", value: r.model },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-background rounded-sm px-2.5 py-2 border border-border">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                        <p className="text-[12px] font-mono text-foreground mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                  <div className="bg-background rounded-sm border border-border p-3">
                    <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">AI Response Preview</p>
                    <p className="text-[12px] text-foreground leading-relaxed">{r.resultPreview}</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(r.prompt || r.resultPreview); }}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-[11px] border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-snap"
                  >
                    <Copy size={10} /> Copy
                  </button>
                </div>
              )}
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
            <MessageSquare size={24} className="text-muted-foreground/30" />
            <p className="text-[12px] text-muted-foreground">No prompts match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

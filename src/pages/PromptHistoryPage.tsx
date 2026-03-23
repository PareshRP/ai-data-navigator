import { useState } from "react";
import { MessageSquare, Search, Wand2, Lightbulb, Zap, BarChart3, AlertCircle, X, Copy, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePromptHistory, AIActionType } from "@/hooks/useQueryStore";

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

export default function PromptHistoryPage() {
  const history = usePromptHistory();
  const [search, setSearch] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = history.filter((r) => {
    const matchSearch =
      r.prompt.toLowerCase().includes(search.toLowerCase()) ||
      r.resultPreview.toLowerCase().includes(search.toLowerCase());
    const matchAction = filterAction === "all" || r.action === filterAction;
    return matchSearch && matchAction;
  });

  const totalTokens = history.reduce((acc, r) => acc + r.inputTokens + r.outputTokens, 0);

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
            <span className="text-muted-foreground">Total prompts: <span className="text-foreground">{history.length}</span></span>
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
            placeholder="Search prompts…"
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
        {filtered.length > 0 ? (
          filtered.map((r) => {
            const Icon = ACTION_ICONS[r.action];
            const isExpanded = expanded === r.id;
            return (
              <div
                key={r.id}
                className={cn("panel transition-snap cursor-pointer", isExpanded && "border-primary/30")}
                onClick={() => setExpanded(isExpanded ? null : r.id)}
              >
                <div className="flex items-start gap-3 p-3">
                  <div className={cn(
                    "w-7 h-7 rounded-sm flex items-center justify-center flex-shrink-0",
                    r.action === "optimize" ? "bg-accent-dim" : "bg-primary-dim"
                  )}>
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
                      <p className="text-[12px] text-foreground leading-relaxed whitespace-pre-wrap">{r.resultPreview}</p>
                    </div>
                    {r.linkedQuery && (
                      <div className="bg-background rounded-sm border border-border p-3">
                        <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1.5">Linked Query</p>
                        <pre className="text-[11px] font-mono text-foreground overflow-x-auto whitespace-pre-wrap">{r.linkedQuery.slice(0, 500)}</pre>
                      </div>
                    )}
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
          })
        ) : (
          <div className="flex flex-col items-center justify-center h-48 text-center gap-2">
            <MessageSquare size={24} className="text-muted-foreground/30" />
            <p className="text-[12px] text-muted-foreground">
              {history.length === 0
                ? "No AI prompts used yet. Use the AI actions or prompt bar in the workspace."
                : "No prompts match your search."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

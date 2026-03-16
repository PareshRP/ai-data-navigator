import { useState } from "react";
import { X, Database, Eye, EyeOff, Loader2, AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { NewConnection } from "@/hooks/useConnections";

interface Props {
  onClose: () => void;
  onAdd: (conn: NewConnection) => Promise<void>;
}

type DbType = "postgresql" | "mongodb";
type Env = "development" | "staging" | "production";

const DEFAULT_PORTS: Record<DbType, number> = { postgresql: 5432, mongodb: 27017 };

export default function AddConnectionDialog({ onClose, onAdd }: Props) {
  const [form, setForm] = useState<NewConnection>({
    name: "",
    type: "postgresql",
    host: "",
    port: 5432,
    database_name: "",
    username: "",
    password: "",
    ssl_enabled: true,
    environment: "development",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (field: keyof NewConnection, value: unknown) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleTypeChange = (type: DbType) => {
    set("type", type);
    set("port", DEFAULT_PORTS[type]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await onAdd(form);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add connection");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "w-full code-editor px-2.5 py-2 rounded-sm text-[12px] focus:outline-none focus:ring-1 focus:ring-primary/40";
  const labelClass = "block text-[10.5px] text-muted-foreground uppercase tracking-wider mb-1";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-[520px] panel-raised shadow-panel animate-fade-in mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <div className="flex items-center gap-2">
            <Database size={14} className="text-primary" />
            <span className="text-[13px] font-semibold text-foreground">Add Database Connection</span>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-snap p-1 rounded-sm hover:bg-muted"
          >
            <X size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* DB type selector */}
          <div>
            <label className={labelClass}>Database Type</label>
            <div className="flex gap-2">
              {(["postgresql", "mongodb"] as DbType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-sm border text-[12px] font-mono transition-snap",
                    form.type === t
                      ? "border-primary/40 bg-primary-dim text-primary"
                      : "border-border bg-surface text-foreground hover:border-surface-border"
                  )}
                >
                  {form.type === t && <Check size={10} />}
                  {t === "postgresql" ? "PostgreSQL" : "MongoDB"}
                </button>
              ))}
            </div>
          </div>

          {/* Name + Environment */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Connection Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Production PG"
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Environment</label>
              <select
                value={form.environment}
                onChange={(e) => set("environment", e.target.value as Env)}
                className={inputClass}
              >
                <option value="development">Development</option>
                <option value="staging">Staging</option>
                <option value="production">Production</option>
              </select>
            </div>
          </div>

          {/* Host + Port */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>Host</label>
              <input
                type="text"
                required
                placeholder="db.example.com"
                value={form.host}
                onChange={(e) => set("host", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Port</label>
              <input
                type="number"
                required
                value={form.port}
                onChange={(e) => set("port", Number(e.target.value))}
                className={inputClass}
              />
            </div>
          </div>

          {/* Database name */}
          <div>
            <label className={labelClass}>Database Name</label>
            <input
              type="text"
              required
              placeholder="my_database"
              value={form.database_name}
              onChange={(e) => set("database_name", e.target.value)}
              className={inputClass}
            />
          </div>

          {/* Username + Password */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Username</label>
              <input
                type="text"
                required
                placeholder="readonly_user"
                value={form.username}
                onChange={(e) => set("username", e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => set("password", e.target.value)}
                  className={cn(inputClass, "pr-8")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff size={11} /> : <Eye size={11} />}
                </button>
              </div>
            </div>
          </div>

          {/* SSL */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => set("ssl_enabled", !form.ssl_enabled)}
              className={cn(
                "relative w-9 h-5 rounded-full transition-colors flex-shrink-0",
                form.ssl_enabled ? "bg-primary" : "bg-muted"
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-background shadow transition-transform",
                  form.ssl_enabled ? "translate-x-4" : "translate-x-0.5"
                )}
              />
            </button>
            <span className="text-[12px] text-foreground">SSL / TLS enabled</span>
          </div>

          {/* Security notice */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-sm bg-primary-dim border border-primary/20 text-[11px] text-muted-foreground">
            <AlertCircle size={12} className="text-primary flex-shrink-0 mt-0.5" />
            <span>
              Credentials are <strong className="text-foreground">encrypted server-side</strong> before storage.
              Passwords are never returned to the frontend after creation.
            </span>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-destructive/10 border border-destructive/20 text-destructive text-[11.5px] font-mono">
              <AlertCircle size={11} />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-sm text-[12px] text-muted-foreground hover:text-foreground border border-border hover:bg-muted transition-snap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-1.5 rounded-sm text-[12px] bg-primary text-primary-foreground hover:opacity-90 transition-snap disabled:opacity-50"
            >
              {saving && <Loader2 size={11} className="animate-spin" />}
              {saving ? "Saving…" : "Add Connection"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

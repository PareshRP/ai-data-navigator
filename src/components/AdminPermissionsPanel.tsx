import { useEffect, useState, useCallback } from "react";
import {
  Loader2, Shield, ShieldCheck, ShieldOff, Plus, X, Clock, Infinity as InfinityIcon,
  AlertCircle, UserCog, Check, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
  adminListUsers, adminGrantWrite, adminRevokeGrant, adminSetRole,
  AdminUserRow, WriteGrant, usePermissions,
} from "@/hooks/usePermissions";
import { useConnections } from "@/hooks/useConnections";
import { useAuth } from "@/hooks/useAuth";

const DURATION_PRESETS = [
  { label: "1 hour",   hours: 1 },
  { label: "8 hours",  hours: 8 },
  { label: "24 hours", hours: 24 },
  { label: "7 days",   hours: 24 * 7 },
  { label: "30 days",  hours: 24 * 30 },
  { label: "Permanent", hours: 0 },
];

function formatExpiry(g: WriteGrant): { text: string; tone: "perm" | "active" | "expiring" } {
  if (!g.expires_at) return { text: "Permanent", tone: "perm" };
  const ms = new Date(g.expires_at).getTime() - Date.now();
  if (ms <= 0) return { text: "Expired", tone: "expiring" };
  const hours = Math.round(ms / 3600000);
  if (hours < 24) return { text: `${hours}h left`, tone: hours <= 2 ? "expiring" : "active" };
  const days = Math.round(hours / 24);
  return { text: `${days}d left`, tone: "active" };
}

function GrantDialog({
  user, onClose, onGranted,
}: {
  user: AdminUserRow;
  onClose: () => void;
  onGranted: () => void;
}) {
  const { toast } = useToast();
  const { connections } = useConnections(); // admin's own; will list as "all" by default
  const [hours, setHours] = useState<number>(24);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await adminGrantWrite({
        user_id: user.id,
        connection_id: null, // global by default; per-connection grants would need user's connections list (not exposed)
        reason: reason.trim() || undefined,
        duration_hours: hours,
      });
      toast({ title: "Write access granted", description: `${user.email ?? "User"} can now run write queries.` });
      onGranted();
      onClose();
    } catch (e) {
      toast({ title: "Grant failed", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <div className="panel-raised w-full max-w-md p-5 space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-[14px] font-semibold text-foreground flex items-center gap-2">
              <ShieldCheck size={14} className="text-primary" />
              Grant Write Access
            </h3>
            <p className="text-[11.5px] text-muted-foreground mt-0.5">
              For <span className="font-mono text-foreground">{user.email ?? user.full_name ?? user.id.slice(0, 8)}</span>
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-sm hover:bg-muted text-muted-foreground">
            <X size={14} />
          </button>
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-2">Duration</label>
          <div className="grid grid-cols-3 gap-1.5">
            {DURATION_PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => setHours(p.hours)}
                className={cn(
                  "px-2 py-1.5 rounded-sm text-[11.5px] font-mono border transition-snap",
                  hours === p.hours
                    ? "border-primary bg-primary-dim text-primary"
                    : "border-border bg-surface text-foreground hover:border-surface-border"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-[11px] uppercase tracking-wider text-muted-foreground block mb-1.5">
            Reason (audit log)
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Approved ticket #1234 — data backfill"
            className="code-editor w-full px-2.5 py-1.5 rounded-sm text-[12px] resize-none"
            rows={2}
          />
        </div>

        <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-warning/10 border border-warning/20 text-warning text-[11px]">
          <AlertCircle size={11} className="flex-shrink-0" />
          <span>This grant applies to all of the user's connections. They'll be able to run INSERT, UPDATE, DELETE, etc.</span>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-sm text-[12px] border border-border bg-surface text-foreground hover:bg-surface-raised transition-snap"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={submitting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[12px] bg-primary text-primary-foreground hover:opacity-90 transition-snap disabled:opacity-50"
          >
            {submitting ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />}
            Grant Access
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPermissionsPanel() {
  const { toast } = useToast();
  const { user: me } = useAuth();
  const { refresh: refreshSelfPerms } = usePermissions();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [grantDialogUser, setGrantDialogUser] = useState<AdminUserRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await adminListUsers();
      setUsers(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleRevoke = async (grantId: string, userEmail: string) => {
    try {
      await adminRevokeGrant(grantId);
      toast({ title: "Write access revoked", description: userEmail });
      load();
      refreshSelfPerms();
    } catch (e) {
      toast({ title: "Revoke failed", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" });
    }
  };

  const handleToggleAdmin = async (u: AdminUserRow) => {
    const isCurrentlyAdmin = u.roles.includes("admin");
    const action = isCurrentlyAdmin ? "remove" : "add";
    try {
      await adminSetRole({ user_id: u.id, role: "admin", action });
      toast({
        title: isCurrentlyAdmin ? "Admin role removed" : "Admin role granted",
        description: u.email ?? u.id,
      });
      load();
    } catch (e) {
      toast({ title: "Role update failed", description: e instanceof Error ? e.message : "Unknown", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4 max-w-3xl">
      {grantDialogUser && (
        <GrantDialog
          user={grantDialogUser}
          onClose={() => setGrantDialogUser(null)}
          onGranted={() => { load(); refreshSelfPerms(); }}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[13px] font-semibold text-foreground flex items-center gap-2">
            <UserCog size={14} className="text-primary" />
            Users & Write Permissions
          </h2>
          <p className="text-[11.5px] text-muted-foreground mt-0.5">
            Grant temporary or permanent WRITE access to approved users. All grants are audited.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm text-[11.5px] border border-border bg-surface text-muted-foreground hover:text-foreground transition-snap"
        >
          <RefreshCw size={11} /> Refresh
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-[12px] font-mono py-4">
          <Loader2 size={13} className="animate-spin" /> Loading users…
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-destructive/10 border border-destructive/20 text-destructive text-[12px] font-mono">
          <AlertCircle size={11} /> {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-2">
          {users.map((u) => {
            const isAdmin = u.roles.includes("admin");
            const isMe = u.id === me?.id;
            return (
              <div key={u.id} className="panel p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {u.avatar_url ? (
                      <img src={u.avatar_url} className="w-8 h-8 rounded-full flex-shrink-0 object-cover" alt="" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-primary-dim border border-primary/30 flex items-center justify-center flex-shrink-0">
                        <span className="text-[11px] font-bold text-primary">
                          {(u.full_name ?? u.email ?? "U").slice(0, 1).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-[13px] font-medium text-foreground truncate">
                          {u.full_name ?? u.email ?? u.id.slice(0, 8)}
                        </p>
                        {isAdmin && (
                          <span className="ai-badge ai-badge-pink flex items-center gap-1">
                            <Shield size={9} /> Admin
                          </span>
                        )}
                        {isMe && <span className="ai-badge ai-badge-cyan">You</span>}
                      </div>
                      <p className="text-[11px] font-mono text-muted-foreground truncate">{u.email}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => handleToggleAdmin(u)}
                      disabled={isMe && isAdmin}
                      title={isMe && isAdmin ? "Cannot demote yourself" : isAdmin ? "Remove admin" : "Make admin"}
                      className={cn(
                        "flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] border transition-snap disabled:opacity-40 disabled:cursor-not-allowed",
                        isAdmin
                          ? "border-warning/30 text-warning hover:bg-warning/10"
                          : "border-border text-muted-foreground hover:text-foreground hover:bg-surface-raised"
                      )}
                    >
                      {isAdmin ? <ShieldOff size={10} /> : <Shield size={10} />}
                      {isAdmin ? "Demote" : "Make Admin"}
                    </button>
                    <button
                      onClick={() => setGrantDialogUser(u)}
                      className="flex items-center gap-1 px-2 py-1 rounded-sm text-[11px] bg-primary text-primary-foreground hover:opacity-90 transition-snap"
                    >
                      <Plus size={10} /> Grant Write
                    </button>
                  </div>
                </div>

                {/* Active grants */}
                {u.grants.length === 0 ? (
                  <p className="text-[11px] text-muted-foreground font-mono pl-10.5">
                    Read-only · no active write grants
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {u.grants.map((g) => {
                      const exp = formatExpiry(g);
                      return (
                        <div
                          key={g.id}
                          className="flex items-center gap-2 bg-background border border-border rounded-sm px-2.5 py-1.5"
                        >
                          <ShieldCheck size={11} className="text-success flex-shrink-0" />
                          <span className="text-[11.5px] font-mono text-foreground">
                            {g.connection_id ? `Connection ${g.connection_id.slice(0, 8)}` : "All connections"}
                          </span>
                          <span className={cn(
                            "ai-badge flex items-center gap-1",
                            exp.tone === "perm" ? "ai-badge-pink" :
                            exp.tone === "expiring" ? "ai-badge-warning" : "ai-badge-success"
                          )}>
                            {exp.tone === "perm" ? <InfinityIcon size={9} /> : <Clock size={9} />}
                            {exp.text}
                          </span>
                          {g.reason && (
                            <span className="text-[11px] text-muted-foreground italic truncate flex-1">
                              "{g.reason}"
                            </span>
                          )}
                          <button
                            onClick={() => handleRevoke(g.id, u.email ?? u.id)}
                            className="ml-auto p-1 rounded-sm text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-snap flex-shrink-0"
                            title="Revoke"
                          >
                            <X size={11} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
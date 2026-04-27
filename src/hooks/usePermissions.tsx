import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const FUNCTIONS_URL = `https://ioekedmzkawxbptoypkf.supabase.co/functions/v1`;

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

export interface WriteGrant {
  id: string;
  connection_id: string | null;
  reason: string | null;
  granted_at: string;
  expires_at: string | null;
  granted_by: string;
}

interface PermissionsContextType {
  isAdmin: boolean;
  roles: string[];
  writeGrants: WriteGrant[];
  loading: boolean;
  refresh: () => Promise<void>;
  hasWriteFor: (connectionId: string | null | undefined) => boolean;
}

const PermissionsContext = createContext<PermissionsContextType>({
  isAdmin: false,
  roles: [],
  writeGrants: [],
  loading: true,
  refresh: async () => {},
  hasWriteFor: () => false,
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const [writeGrants, setWriteGrants] = useState<WriteGrant[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setIsAdmin(false); setRoles([]); setWriteGrants([]); setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${FUNCTIONS_URL}/manage-permissions?path=self`, { headers });
      const json = await res.json();
      if (res.ok) {
        setIsAdmin(!!json.is_admin);
        setRoles(json.roles ?? []);
        setWriteGrants(json.write_grants ?? []);
      }
    } catch (e) {
      console.error("Permissions refresh failed", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { refresh(); }, [refresh]);

  const hasWriteFor = useCallback(
    (connectionId: string | null | undefined) => {
      const now = Date.now();
      return writeGrants.some((g) => {
        if (g.expires_at && new Date(g.expires_at).getTime() <= now) return false;
        // Global grant (null connection_id) covers everything
        if (!g.connection_id) return true;
        return g.connection_id === connectionId;
      });
    },
    [writeGrants]
  );

  return (
    <PermissionsContext.Provider value={{ isAdmin, roles, writeGrants, loading, refresh, hasWriteFor }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  return useContext(PermissionsContext);
}

// ── Admin API helpers ──────────────────────────────────────────────────

export interface AdminUserRow {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  roles: string[];
  grants: WriteGrant[];
}

export async function adminListUsers(): Promise<AdminUserRow[]> {
  const headers = await authHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/manage-permissions?path=admin`, { headers });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Failed to load users");
  return json.users ?? [];
}

export async function adminGrantWrite(payload: {
  user_id: string;
  connection_id?: string | null;
  reason?: string;
  duration_hours?: number | null; // null/0 = permanent
}): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/manage-permissions?path=grant`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "Grant failed");
  }
}

export async function adminRevokeGrant(grantId: string): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/manage-permissions?path=revoke&id=${grantId}`, {
    method: "DELETE",
    headers,
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "Revoke failed");
  }
}

export async function adminSetRole(payload: {
  user_id: string;
  role: "admin" | "user";
  action: "add" | "remove";
}): Promise<void> {
  const headers = await authHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/manage-permissions?path=set-role`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? "Role update failed");
  }
}
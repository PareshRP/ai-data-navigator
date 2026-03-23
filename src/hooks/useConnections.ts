import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface Connection {
  id: string;
  name: string;
  type: "postgresql" | "mongodb";
  host: string;
  port: number;
  database_name: string;
  username: string;
  ssl_enabled: boolean;
  environment: "development" | "staging" | "production";
  status: "connected" | "disconnected" | "error";
  last_tested_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface NewConnection {
  name: string;
  type: "postgresql" | "mongodb";
  host: string;
  port: number;
  database_name: string;
  username: string;
  password: string;
  ssl_enabled: boolean;
  environment: "development" | "staging" | "production";
}

export type SchemaTree = Record<string, Record<string, { columns: { name: string; type: string }[] }>>;

const FUNCTIONS_URL = `https://ioekedmzkawxbptoypkf.supabase.co/functions/v1`;

async function authHeaders(): Promise<Record<string, string>> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
  };
}

export async function callAIAssistant(payload: {
  action: "generate" | "explain" | "optimize" | "debug" | "analyze";
  query?: string;
  prompt?: string;
  schema?: SchemaTree;
  dbType?: "postgresql" | "mongodb";
  results?: Record<string, unknown>[];
  error?: string;
  model?: string;
}): Promise<{ content: string; inputTokens: number; outputTokens: number; durationMs: number }> {
  const headers = await authHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/ai-assistant`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "AI request failed");
  return json;
}

export async function testConnectionReal(connectionId: string): Promise<{ success: boolean; status: "connected" | "error"; error?: string; latencyMs?: number }> {
  const headers = await authHeaders();
  const res = await fetch(`${FUNCTIONS_URL}/test-connection`, {
    method: "POST",
    headers,
    body: JSON.stringify({ connection_id: connectionId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? "Test failed");
  return json;
}

export function useConnections() {
  const { user } = useAuth();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConnections = useCallback(async () => {
    if (!user) { setConnections([]); return; }
    setLoading(true);
    setError(null);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${FUNCTIONS_URL}/manage-connections`, { headers });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load connections");
      setConnections(json.connections ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchConnections(); }, [fetchConnections]);

  const addConnection = useCallback(async (conn: NewConnection): Promise<Connection> => {
    const headers = await authHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/manage-connections`, {
      method: "POST",
      headers,
      body: JSON.stringify(conn),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to create connection");
    const created = json.connection as Connection;
    setConnections((prev) => [created, ...prev]);
    return created;
  }, []);

  const deleteConnection = useCallback(async (id: string) => {
    const headers = await authHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/manage-connections?id=${id}`, {
      method: "DELETE",
      headers,
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to delete connection");
    setConnections((prev) => prev.filter((c) => c.id !== id));
  }, []);

  /** Real TCP test via test-connection edge function */
  const testConnection = useCallback(async (id: string): Promise<"connected" | "error"> => {
    const result = await testConnectionReal(id);
    const status = result.status;
    setConnections((prev) =>
      prev.map((c) =>
        c.id === id
          ? { ...c, status, error_message: result.error ?? undefined, last_tested_at: new Date().toISOString() }
          : c
      )
    );
    return status;
  }, []);

  const fetchSchema = useCallback(async (connectionId: string, forceRefresh = false): Promise<SchemaTree> => {
    const headers = await authHeaders();
    const res = await fetch(`${FUNCTIONS_URL}/fetch-schema`, {
      method: "POST",
      headers,
      body: JSON.stringify({ connection_id: connectionId, force_refresh: forceRefresh }),
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error ?? "Failed to fetch schema");
    return json.schemas as SchemaTree;
  }, []);

  return {
    connections,
    loading,
    error,
    fetchConnections,
    addConnection,
    deleteConnection,
    testConnection,
    fetchSchema,
  };
}

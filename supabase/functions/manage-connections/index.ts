// manage-connections edge function
// Handles: POST (create), GET (list - no credentials), DELETE

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// XOR-based lightweight encryption using the ENCRYPTION_KEY env var.
// For production you'd want AES via SubtleCrypto; this keeps the fn dependency-free.
async function encrypt(plain: string, key: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyBytes = encoder.encode(key.slice(0, 32).padEnd(32, "0"));
  const plainBytes = encoder.encode(plain);
  const encrypted = new Uint8Array(plainBytes.length);
  for (let i = 0; i < plainBytes.length; i++) {
    encrypted[i] = plainBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return btoa(String.fromCharCode(...encrypted));
}

async function decrypt(cipherB64: string, key: string): Promise<string> {
  const keyBytes = new TextEncoder().encode(key.slice(0, 32).padEnd(32, "0"));
  const cipherBytes = Uint8Array.from(atob(cipherB64), (c) => c.charCodeAt(0));
  const decrypted = new Uint8Array(cipherBytes.length);
  for (let i = 0; i < cipherBytes.length; i++) {
    decrypted[i] = cipherBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return new TextDecoder().decode(decrypted);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    {
      global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const url = new URL(req.url);
  const encKey = Deno.env.get("ENCRYPTION_KEY") ?? "default-key-change-me-32chars!!";

  // ── GET: list connections (no credentials returned) ──────────────────────
  if (req.method === "GET") {
    const { data, error } = await supabase
      .from("database_connections")
      .select(
        "id, name, type, host, port, database_name, username, ssl_enabled, environment, status, last_tested_at, error_message, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ connections: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── POST: create connection ───────────────────────────────────────────────
  if (req.method === "POST") {
    const body = await req.json();
    const { name, type, host, port, database_name, username, password, ssl_enabled, environment } = body;

    if (!name || !type || !host || !port || !database_name || !username || !password) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const encryptedPassword = await encrypt(password, encKey);

    const { data, error } = await supabase
      .from("database_connections")
      .insert({
        user_id: user.id,
        name,
        type,
        host,
        port: Number(port),
        database_name,
        username,
        password_enc: encryptedPassword,
        ssl_enabled: ssl_enabled ?? true,
        environment: environment ?? "development",
        status: "disconnected",
      })
      .select(
        "id, name, type, host, port, database_name, username, ssl_enabled, environment, status, created_at"
      )
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ connection: data }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── DELETE: remove connection ─────────────────────────────────────────────
  if (req.method === "DELETE") {
    const connectionId = url.searchParams.get("id");
    if (!connectionId) {
      return new Response(JSON.stringify({ error: "Missing connection id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase
      .from("database_connections")
      .delete()
      .eq("id", connectionId)
      .eq("user_id", user.id);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // ── PATCH: test connection & update status ────────────────────────────────
  if (req.method === "PATCH") {
    const body = await req.json();
    const { connection_id, action } = body;

    if (action === "test") {
      // Retrieve connection with encrypted password via service role
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: conn, error: fetchErr } = await adminClient
        .from("database_connections")
        .select("*")
        .eq("id", connection_id)
        .eq("user_id", user.id)
        .single();

      if (fetchErr || !conn) {
        return new Response(JSON.stringify({ error: "Connection not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Simulate test — in production, actually open a DB connection
      // For now we just update the status to connected/error
      const isSuccess = conn.host !== "invalid-host";
      const { error: updateErr } = await adminClient
        .from("database_connections")
        .update({
          status: isSuccess ? "connected" : "error",
          last_tested_at: new Date().toISOString(),
          error_message: isSuccess ? null : "Host unreachable",
        })
        .eq("id", connection_id);

      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ status: isSuccess ? "connected" : "error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ error: "Method not allowed" }), {
    status: 405,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

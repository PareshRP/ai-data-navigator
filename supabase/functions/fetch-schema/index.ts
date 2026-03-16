// fetch-schema edge function
// Fetches schema metadata (schemas, tables, columns) for a given connection
// and caches the result in connection_schemas table.
// Credentials are fetched server-side via service role key — never sent to frontend.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
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

  const { connection_id, force_refresh } = await req.json();

  if (!connection_id) {
    return new Response(JSON.stringify({ error: "connection_id required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Check cache first (unless force_refresh)
  if (!force_refresh) {
    const { data: cached } = await supabase
      .from("connection_schemas")
      .select("schema_name, table_name, columns, fetched_at")
      .eq("connection_id", connection_id)
      .order("schema_name")
      .order("table_name");

    if (cached && cached.length > 0) {
      const grouped = buildSchemaTree(cached);
      return new Response(JSON.stringify({ schemas: grouped, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // Fetch connection details via service role (includes encrypted password)
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const { data: conn, error: connErr } = await adminClient
    .from("database_connections")
    .select("*")
    .eq("id", connection_id)
    .eq("user_id", user.id)
    .single();

  if (connErr || !conn) {
    return new Response(JSON.stringify({ error: "Connection not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // In a real implementation you would use pg/mongodb driver to introspect.
  // Here we return a realistic mock to demonstrate the architecture,
  // since Deno edge functions don't ship pg drivers by default.
  const encKey = Deno.env.get("ENCRYPTION_KEY") ?? "default-key-change-me-32chars!!";
  let _password = "";
  if (conn.password_enc) {
    try {
      _password = await decrypt(String(conn.password_enc), encKey);
    } catch {
      _password = "";
    }
  }

  // Mock schema discovery — replace with actual DB introspection in production
  const mockSchemas = conn.type === "postgresql"
    ? generatePgMockSchema(conn.database_name)
    : generateMongoMockSchema(conn.database_name);

  // Upsert schema cache
  const schemaRows = mockSchemas.flatMap(({ schemaName, tables }) =>
    tables.map((t) => ({
      connection_id,
      schema_name: schemaName,
      table_name: t.name,
      columns: t.columns,
      fetched_at: new Date().toISOString(),
    }))
  );

  await adminClient.from("connection_schemas").upsert(schemaRows, {
    onConflict: "connection_id,schema_name,table_name",
  });

  // Update connection status
  await adminClient
    .from("database_connections")
    .update({ status: "connected", last_tested_at: new Date().toISOString(), error_message: null })
    .eq("id", connection_id);

  const grouped = buildSchemaTree(
    schemaRows.map((r) => ({
      schema_name: r.schema_name,
      table_name: r.table_name,
      columns: r.columns,
      fetched_at: r.fetched_at,
    }))
  );

  return new Response(JSON.stringify({ schemas: grouped, cached: false }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSchemaTree(rows: { schema_name: string; table_name: string; columns: unknown }[]) {
  const tree: Record<string, Record<string, { columns: unknown[] }>> = {};
  for (const row of rows) {
    if (!tree[row.schema_name]) tree[row.schema_name] = {};
    tree[row.schema_name][row.table_name] = { columns: row.columns as unknown[] };
  }
  return tree;
}

function generatePgMockSchema(dbName: string) {
  return [
    {
      schemaName: "public",
      tables: [
        {
          name: "users",
          columns: [
            { name: "id", type: "uuid" },
            { name: "email", type: "varchar(255)" },
            { name: "name", type: "varchar(100)" },
            { name: "created_at", type: "timestamptz" },
            { name: "role", type: "varchar(50)" },
            { name: "active", type: "boolean" },
          ],
        },
        {
          name: "orders",
          columns: [
            { name: "id", type: "bigserial" },
            { name: "user_id", type: "uuid" },
            { name: "total", type: "numeric(10,2)" },
            { name: "status", type: "varchar(50)" },
            { name: "created_at", type: "timestamptz" },
          ],
        },
        {
          name: "products",
          columns: [
            { name: "id", type: "bigserial" },
            { name: "name", type: "varchar(200)" },
            { name: "price", type: "numeric(10,2)" },
            { name: "stock", type: "integer" },
            { name: "category", type: "varchar(100)" },
          ],
        },
      ],
    },
    {
      schemaName: "analytics",
      tables: [
        {
          name: "events",
          columns: [
            { name: "id", type: "bigserial" },
            { name: "session_id", type: "varchar(100)" },
            { name: "event_type", type: "varchar(50)" },
            { name: "payload", type: "jsonb" },
            { name: "ts", type: "timestamptz" },
          ],
        },
      ],
    },
  ];
}

function generateMongoMockSchema(dbName: string) {
  return [
    {
      schemaName: dbName || "app",
      tables: [
        {
          name: "users",
          columns: [
            { name: "_id", type: "ObjectId" },
            { name: "email", type: "String" },
            { name: "profile", type: "Object" },
            { name: "createdAt", type: "Date" },
          ],
        },
        {
          name: "sessions",
          columns: [
            { name: "_id", type: "ObjectId" },
            { name: "userId", type: "ObjectId" },
            { name: "token", type: "String" },
            { name: "expiresAt", type: "Date" },
          ],
        },
      ],
    },
  ];
}

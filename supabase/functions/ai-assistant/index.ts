// ai-assistant edge function
// Handles all AI actions: generate, explain, optimize, debug, analyze
// Uses Lovable AI gateway (LOVABLE_API_KEY) — no user-supplied API key needed.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface AIRequest {
  action: "generate" | "explain" | "optimize" | "debug" | "analyze";
  query?: string;       // current editor content (for explain/optimize/debug/analyze)
  prompt?: string;      // natural language prompt (for generate)
  schema?: Record<string, Record<string, { columns: { name: string; type: string }[] }>>;
  dbType?: "postgresql" | "mongodb";
  results?: Record<string, unknown>[];  // for analyze
  error?: string;       // for debug
  model?: string;
}

const SYSTEM_PROMPT = `You are an expert database assistant. You help developers write, explain, optimize, and debug database queries.
Always respond concisely and practically. When generating SQL, output only the SQL code block and a brief explanation.
Never produce destructive SQL (DELETE, DROP, UPDATE, TRUNCATE, ALTER, INSERT).`;

function schemaToText(schema?: AIRequest["schema"]): string {
  if (!schema) return "";
  const lines: string[] = ["\n\nAvailable Schema:"];
  for (const [schemaName, tables] of Object.entries(schema)) {
    for (const [tableName, def] of Object.entries(tables)) {
      const cols = def.columns.map((c) => `${c.name} ${c.type}`).join(", ");
      lines.push(`  ${schemaName}.${tableName}(${cols})`);
    }
  }
  return lines.join("\n");
}

function buildPrompt(req: AIRequest): string {
  const schemaCtx = schemaToText(req.schema);
  const dbLabel = req.dbType === "mongodb" ? "MongoDB" : "PostgreSQL";

  switch (req.action) {
    case "generate":
      return `Database: ${dbLabel}${schemaCtx}\n\nUser request: "${req.prompt}"\n\nGenerate a read-only ${dbLabel} query that fulfills this request. Include a brief explanation of what the query does.`;

    case "explain":
      return `Database: ${dbLabel}${schemaCtx}\n\nExplain the following query in plain English. Describe what it does, the execution strategy, and any potential performance concerns:\n\n\`\`\`sql\n${req.query}\n\`\`\``;

    case "optimize":
      return `Database: ${dbLabel}${schemaCtx}\n\nAnalyze and optimize the following query. Suggest index improvements, rewrite strategies, and estimated speedup. Always output the optimized query:\n\n\`\`\`sql\n${req.query}\n\`\`\``;

    case "debug":
      return `Database: ${dbLabel}${schemaCtx}\n\nDebug the following query${req.error ? ` that produced this error: "${req.error}"` : ""}:\n\n\`\`\`sql\n${req.query}\n\`\`\`\n\nIdentify all syntax errors, logical issues, and provide a corrected version.`;

    case "analyze":
      return `Database: ${dbLabel}\n\nAnalyze the following query results dataset and provide:\n1. Key statistics and patterns\n2. Anomalies or notable findings\n3. Suggested charts (specify chart type and data mapping)\n4. Business insights\n\nQuery:\n\`\`\`sql\n${req.query}\n\`\`\`\n\nSample data (${req.results?.length ?? 0} rows):\n${JSON.stringify((req.results ?? []).slice(0, 20), null, 2)}`;

    default:
      return req.prompt ?? req.query ?? "";
  }
}

async function callLovableAI(prompt: string, model: string): Promise<{ content: string; inputTokens: number; outputTokens: number }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const resp = await fetch("https://gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      temperature: 0.2,
      max_tokens: 1500,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`AI API error ${resp.status}: ${err}`);
  }

  const data = await resp.json();
  return {
    content: data.choices?.[0]?.message?.content ?? "",
    inputTokens: data.usage?.prompt_tokens ?? 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
  };
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

  // Auth check
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
  );
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const body: AIRequest = await req.json();
  const { action } = body;

  if (!action) {
    return new Response(JSON.stringify({ error: "action is required" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (action === "generate" && !body.prompt?.trim()) {
    return new Response(JSON.stringify({ error: "prompt is required for generate action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (action !== "generate" && !body.query?.trim()) {
    return new Response(JSON.stringify({ error: "query is required for this action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const model = body.model ?? "google/gemini-2.5-flash";
  const userPrompt = buildPrompt(body);

  const start = Date.now();
  try {
    const { content, inputTokens, outputTokens } = await callLovableAI(userPrompt, model);
    const durationMs = Date.now() - start;

    return new Response(
      JSON.stringify({ content, inputTokens, outputTokens, durationMs }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "AI request failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// manage-permissions edge function
// Admin: list users + grants, grant write access, revoke write access
// User: get own role + own active write permissions

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
  );

  const { data: { user }, error: authErr } = await userClient.auth.getUser();
  if (authErr || !user) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Determine if caller is admin
  const { data: isAdminRow } = await admin.rpc("is_admin", { _user_id: user.id });
  const isAdmin = isAdminRow === true;

  const url = new URL(req.url);
  const path = url.searchParams.get("path") ?? "self";

  // ── GET: depending on path
  if (req.method === "GET") {
    if (path === "self") {
      // Caller's role + their active write grants
      const { data: roles } = await admin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);

      const { data: grants } = await admin
        .from("write_permissions")
        .select("id, connection_id, reason, granted_at, expires_at, granted_by")
        .eq("user_id", user.id)
        .is("revoked_at", null)
        .order("granted_at", { ascending: false });

      const activeGrants = (grants ?? []).filter(
        (g) => !g.expires_at || new Date(g.expires_at) > new Date()
      );

      return json({
        is_admin: isAdmin,
        roles: (roles ?? []).map((r) => r.role),
        write_grants: activeGrants,
      });
    }

    if (path === "admin") {
      if (!isAdmin) return json({ error: "Forbidden" }, 403);

      // List all users with profiles + their roles + active grants
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, email, full_name, avatar_url, created_at")
        .order("created_at", { ascending: false });

      const { data: roles } = await admin
        .from("user_roles")
        .select("user_id, role");

      const { data: grants } = await admin
        .from("write_permissions")
        .select("id, user_id, connection_id, reason, granted_by, granted_at, expires_at, revoked_at")
        .is("revoked_at", null)
        .order("granted_at", { ascending: false });

      const activeGrants = (grants ?? []).filter(
        (g) => !g.expires_at || new Date(g.expires_at) > new Date()
      );

      const users = (profiles ?? []).map((p) => ({
        ...p,
        roles: (roles ?? []).filter((r) => r.user_id === p.id).map((r) => r.role),
        grants: activeGrants.filter((g) => g.user_id === p.id),
      }));

      return json({ users });
    }

    return json({ error: "Unknown path" }, 400);
  }

  // ── POST: grant write permission (admin only)
  if (req.method === "POST" && path === "grant") {
    if (!isAdmin) return json({ error: "Forbidden — admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const { user_id, connection_id, reason, duration_hours } = body;

    if (!user_id || typeof user_id !== "string") {
      return json({ error: "user_id is required" }, 400);
    }

    let expires_at: string | null = null;
    if (duration_hours && Number(duration_hours) > 0) {
      expires_at = new Date(Date.now() + Number(duration_hours) * 3600 * 1000).toISOString();
    }

    const { data, error } = await admin
      .from("write_permissions")
      .insert({
        user_id,
        connection_id: connection_id || null,
        granted_by: user.id,
        reason: reason || null,
        expires_at,
      })
      .select()
      .single();

    if (error) return json({ error: error.message }, 500);
    return json({ grant: data }, 201);
  }

  // ── POST: toggle role (admin only) — promote/demote
  if (req.method === "POST" && path === "set-role") {
    if (!isAdmin) return json({ error: "Forbidden — admin only" }, 403);
    const body = await req.json().catch(() => ({}));
    const { user_id, role, action } = body; // action: "add" | "remove"
    if (!user_id || !role || !["admin", "user"].includes(role)) {
      return json({ error: "Invalid payload" }, 400);
    }
    if (action === "remove" && user_id === user.id && role === "admin") {
      return json({ error: "You cannot remove your own admin role" }, 400);
    }

    if (action === "add") {
      const { error } = await admin
        .from("user_roles")
        .insert({ user_id, role })
        .select();
      if (error && !error.message.includes("duplicate")) return json({ error: error.message }, 500);
    } else if (action === "remove") {
      const { error } = await admin
        .from("user_roles")
        .delete()
        .eq("user_id", user_id)
        .eq("role", role);
      if (error) return json({ error: error.message }, 500);
    } else {
      return json({ error: "Invalid action" }, 400);
    }
    return json({ success: true });
  }

  // ── DELETE: revoke a write permission (admin only)
  if (req.method === "DELETE" && path === "revoke") {
    if (!isAdmin) return json({ error: "Forbidden — admin only" }, 403);
    const grant_id = url.searchParams.get("id");
    if (!grant_id) return json({ error: "Missing grant id" }, 400);

    const { error } = await admin
      .from("write_permissions")
      .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
      .eq("id", grant_id);

    if (error) return json({ error: error.message }, 500);
    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, 405);
});
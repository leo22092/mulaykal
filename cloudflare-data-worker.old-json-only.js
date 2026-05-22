// ============================================================
//  Temple Data Worker
//  Deploy this on Cloudflare Workers
//  Bindings needed: KV namespace "TEMPLE_DATA"
//  Environment variable needed: ADMIN_SECRET (your password)
// ============================================================

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",          // or lock to your domain
  "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default {
  async fetch(request, env) {
    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    // ── GET /  ──────────────────────────────────────────────
    // Returns the temple data as JSON (used by the main site)
    if (request.method === "GET") {
      const data = await env.TEMPLE_DATA.get("templeData");
      if (!data) {
        return new Response(JSON.stringify({ error: "No data found" }), {
          status: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }
      return new Response(data, {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    // ── PUT /  ──────────────────────────────────────────────
    // Updates the temple data (used by admin page)
    if (request.method === "PUT") {
      // Check Authorization header
      const authHeader = request.headers.get("Authorization") || "";
      const token = authHeader.replace("Bearer ", "").trim();

      if (token !== env.ADMIN_SECRET) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // Parse and validate body
      let body;
      try {
        body = await request.json();
      } catch {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        });
      }

      // Basic validation — ensure required top-level keys exist
      const required = ["deities", "poojas", "ulsavam", "trustees", "contacts", "global"];
      for (const key of required) {
        if (!(key in body)) {
          return new Response(
            JSON.stringify({ error: `Missing required key: ${key}` }),
            { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } }
          );
        }
      }

      await env.TEMPLE_DATA.put("templeData", JSON.stringify(body));

      return new Response(JSON.stringify({ success: true, message: "Data saved successfully" }), {
        status: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: CORS_HEADERS });
  },
};

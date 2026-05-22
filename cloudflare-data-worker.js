const DATA_KEY = "templeData";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type"
};

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    if (request.method === "GET") {
      const stored = await env.TEMPLE_DATA.get(DATA_KEY);
      return new Response(stored || "{}", {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        }
      });
    }

    if (request.method === "POST" || request.method === "PUT") {
      const authHeader = request.headers.get("Authorization") || "";
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();

      if (!env.ADMIN_TOKEN || token !== env.ADMIN_TOKEN) {
        return json({ error: "Unauthorized" }, 401);
      }

      let data;
      try {
        data = await request.json();
      } catch (error) {
        return json({ error: "Invalid JSON body" }, 400);
      }

      await env.TEMPLE_DATA.put(DATA_KEY, JSON.stringify(data));
      return json({ success: true });
    }

    return json({ error: "Method Not Allowed" }, 405);
  }
};

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

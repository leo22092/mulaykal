const DATA_KEY = "templeData";
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif"
]);

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

    const url = new URL(request.url);

    if (url.pathname === "/upload" && request.method === "POST") {
      return handleUpload(request, env);
    }

    if (request.method === "POST" || request.method === "PUT") {
      const authHeader = request.headers.get("Authorization") || "";
      const token = authHeader.replace(/^Bearer\s+/i, "").trim();

      if (!isValidAdminToken(token, env)) {
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

async function handleUpload(request, env) {
  const authHeader = request.headers.get("Authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!isValidAdminToken(token, env)) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (!env.TEMPLE_MEDIA) {
    return json({ error: "Missing R2 binding TEMPLE_MEDIA" }, 500);
  }

  if (!env.PUBLIC_MEDIA_URL) {
    return json({ error: "Missing PUBLIC_MEDIA_URL setting" }, 500);
  }

  let form;
  try {
    form = await request.formData();
  } catch (error) {
    return json({ error: "Expected multipart form data" }, 400);
  }

  const file = form.get("file");
  const folder = cleanPathPart(form.get("folder") || "gallery");

  if (!file || typeof file === "string") {
    return json({ error: "Missing file field" }, 400);
  }

  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    return json({ error: "Only JPG, PNG, WebP, and GIF images are allowed" }, 400);
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return json({ error: "Image is larger than 10 MB" }, 400);
  }

  const extension = extensionForType(file.type);
  const key = `${folder}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}${extension}`;

  await env.TEMPLE_MEDIA.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable"
    },
    customMetadata: {
      originalName: file.name || "upload"
    }
  });

  return json({
    success: true,
    key,
    url: `${env.PUBLIC_MEDIA_URL.replace(/\/+$/, "")}/${key}`
  });
}

function cleanPathPart(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/\/{2,}/g, "/") || "gallery";
}

function extensionForType(type) {
  if (type === "image/jpeg") return ".jpg";
  if (type === "image/png") return ".png";
  if (type === "image/webp") return ".webp";
  if (type === "image/gif") return ".gif";
  return "";
}

function isValidAdminToken(token, env) {
  return Boolean(token && (
    token === env.ADMIN_TOKEN ||
    token === env.ADMIN_SECRET
  ));
}

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

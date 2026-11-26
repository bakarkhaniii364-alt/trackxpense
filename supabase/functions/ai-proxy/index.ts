// Supabase Edge Function: ai-proxy
// Proxies LLM completions and Whisper audio transcriptions to Groq API
// with authenticated user verification, strict origin allowlisting, model allowlisting, and rate limiting.
// Deno runtime environment.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN_PATTERNS = [
  /^https?:\/\/localhost(:\d+)?$/,
  /^https?:\/\/127\.0\.0\.1(:\d+)?$/,
  /^https:\/\/([a-z0-9-]+\.)?trackxpense\.app$/,
  /^capacitor:\/\/localhost$/,
  /^ionic:\/\/localhost$/
];

const ALLOWED_MODELS = new Set([
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.6-27b",
  "qwen/qwen3.8-27b",
  "llama-3.3-70b-versatile",
  "whisper-large-v3-turbo",
  "whisper-large-v3"
]);

function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return true; // Non-browser server/native requests without Origin
  const extraOrigin = Deno.env.get("ALLOWED_ORIGIN")?.trim();
  if (extraOrigin && origin === extraOrigin) return true;
  return ALLOWED_ORIGIN_PATTERNS.some(pattern => pattern.test(origin));
}

function getCorsHeaders(origin: string | null) {
  const allowedOrigin = origin && isOriginAllowed(origin) ? origin : "https://trackxpense.app";
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// Per-instance rate limiting: max 30 requests per minute per key/user
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(bucketKey: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(bucketKey);

  if (!entry || now > entry.resetTime) {
    rateLimitMap.set(bucketKey, { count: 1, resetTime: now + 60_000 });
    return false;
  }

  if (entry.count >= 30) {
    return true;
  }

  entry.count++;
  return false;
}

async function verifyAuthenticatedUser(req: Request): Promise<string | null> {
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();
  if (!token) return null;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!supabaseUrl || !supabaseAnonKey) return null;

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  if (origin && !isOriginAllowed(origin)) {
    return new Response(JSON.stringify({ error: "Origin not allowed." }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const {
      action = "chat",
      messages,
      model = "openai/gpt-oss-120b",
      temperature = 0.1,
      max_tokens,
      response_format,
      customApiKey,
      audioBase64,
      mimeType
    } = body;

    // Require an authenticated Supabase session whenever using the server's GROQ_API_KEY
    const userId = await verifyAuthenticatedUser(req);
    if (!customApiKey && !userId) {
      return new Response(
        JSON.stringify({ error: "Authentication required for managed AI proxy." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown-client";
    const rateBucket = userId || clientIp;
    if (isRateLimited(rateBucket)) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Please wait a minute before making more AI requests." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const groqKey = (typeof customApiKey === "string" && customApiKey.trim()) || Deno.env.get("GROQ_API_KEY") || "";
    if (!groqKey) {
      return new Response(
        JSON.stringify({ error: "Groq API key not configured on server or request." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const safeModel = ALLOWED_MODELS.has(model) ? model : (action === "transcribe" ? "whisper-large-v3-turbo" : "openai/gpt-oss-120b");

    if (action === "transcribe") {
      if (!audioBase64 || typeof audioBase64 !== "string") {
        return new Response(
          JSON.stringify({ error: "Missing 'audioBase64' payload." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const binaryStr = atob(audioBase64);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }

      const safeMime = typeof mimeType === "string" ? mimeType : "audio/webm";
      const ext = safeMime.includes("mp4") ? "mp4" : safeMime.includes("ogg") ? "ogg" : safeMime.includes("wav") ? "wav" : "webm";
      const formData = new FormData();
      formData.append("file", new Blob([bytes], { type: safeMime }), `speech.${ext}`);
      formData.append("model", safeModel);
      formData.append("response_format", "json");

      const whisperRes = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${groqKey}` },
        body: formData
      });
      const whisperData = await whisperRes.json();
      return new Response(JSON.stringify(whisperData), {
        status: whisperRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!messages || !Array.isArray(messages)) {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'messages' array in payload." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clampedTemp = typeof temperature === "number" ? Math.min(1.2, Math.max(0, temperature)) : 0.1;
    const payload: Record<string, any> = {
      model: safeModel,
      temperature: clampedTemp,
      messages
    };

    if (typeof max_tokens === "number" && max_tokens > 0) {
      payload.max_tokens = Math.min(2048, Math.floor(max_tokens));
    }

    if (response_format) {
      payload.response_format = response_format;
    }

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await groqResponse.json();

    return new Response(JSON.stringify(data), {
      status: groqResponse.status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err?.message || "Internal server error in AI proxy" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

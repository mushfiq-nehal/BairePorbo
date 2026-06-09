import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { generateEmbedding, getClientIp, logRequest } from "@/lib/nim";
import { fetchOpenRouterChatWithFallback } from "@/lib/openrouter";
import { checkChatRateLimit, formatResetWindow, type ChatTier } from "@/lib/rate-limit";
import { lookupPromptCache, writePromptCache } from "@/lib/prompt-cache";

const SYSTEM_PROMPT = `You are BairePorbo Mentor, an expert AI advisor for Bangladeshi students pursuing higher education and scholarships abroad. You have deep knowledge of:
- International scholarships (DAAD, Erasmus Mundus, Commonwealth, Chevening, Fulbright, etc.)
- University admission requirements and processes
- CGPA/GPA requirements, English proficiency tests (IELTS, TOEFL, Duolingo)
- Statement of Purpose, recommendation letters, and application strategies
- Country-specific study permit and visa processes

Be concise, practical, and encouraging. Always cite specific scholarships or programs when relevant.`;

const MAX_MSG_LENGTH = 4000;
const MAX_HISTORY = 12;
const MAX_OUTPUT_TOKENS = 600;

type RateLimitErrorBody = {
  error: string;
  scope: "hourly" | "daily" | "global";
  resetMs: number;
  resetIn: string;
  signinRequired?: boolean;
  remaining: { hourly: number; daily: number; global: number };
};

const rateLimitMessage = (
  scope: "hourly" | "daily" | "global",
  tier: ChatTier,
  resetMs: number,
): string => {
  const reset = formatResetWindow(resetMs);
  if (scope === "global") {
    return `BairePorbo Mentor is at capacity right now. Please retry in ${reset}.`;
  }
  if (tier === "anonymous") {
    return `You've reached the free trial limit. Sign in to keep chatting.`;
  }
  if (scope === "daily") {
    return `You've used your daily message limit. Resets in ${reset}.`;
  }
  return `You're sending messages a bit fast. Resets in ${reset}.`;
};

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);

  // ── Server config sanity ──
  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "NVIDIA_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (!openRouterKey) {
    return NextResponse.json(
      { error: "OPENROUTER_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  // ── Parse + validate body ──
  let body: {
    messages?: { role: string; content: string }[];
    sessionId?: string;
    userMessage?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const userMessages = body.messages ?? [];
  if (!Array.isArray(userMessages) || userMessages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required." },
      { status: 400 },
    );
  }

  if (userMessages.some((m) => typeof m.content === "string" && m.content.length > MAX_MSG_LENGTH)) {
    return NextResponse.json(
      { error: `Each message must be under ${MAX_MSG_LENGTH} characters.` },
      { status: 400 },
    );
  }

  const trimmedMessages = userMessages.slice(-MAX_HISTORY);
  const sessionId = body.sessionId ?? null;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const db = createServiceClient();
  const anonKey = req.headers.get("x-anon-key");
  const { data: { user } } = await supabase.auth.getUser();

  // ── Identify caller and tier ──
  let tier: ChatTier = "anonymous";
  let callerId: string;
  if (user) {
    const { data: profile } = await db
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    tier = profile?.role === "admin" ? "admin" : "user";
    callerId = user.id;
  } else if (anonKey) {
    callerId = `anon:${anonKey}`;
  } else {
    callerId = `ip:${ip}`;
  }

  // ── Multi-window rate limit ──
  const decision = await checkChatRateLimit({ callerId, tier });
  if (!decision.allowed && decision.scope) {
    const errorBody: RateLimitErrorBody = {
      error: rateLimitMessage(decision.scope, tier, decision.resetMs ?? 0),
      scope: decision.scope,
      resetMs: decision.resetMs ?? 0,
      resetIn: formatResetWindow(decision.resetMs ?? 0),
      signinRequired: tier === "anonymous" && decision.scope !== "global",
      remaining: decision.remaining,
    };
    logRequest("chat.rate_limited", { tier, scope: decision.scope, callerId });
    return NextResponse.json(errorBody, {
      status: 429,
      headers: {
        "Retry-After": Math.ceil((decision.resetMs ?? 0) / 1000).toString(),
      },
    });
  }

  // ── Verify session ownership when a sessionId is supplied ──
  if (sessionId) {
    const { data: session } = await db
      .from("chat_sessions")
      .select("user_id, anon_key")
      .eq("id", sessionId)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    if (session.user_id) {
      if (!user || user.id !== session.user_id)
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    } else {
      if (session.anon_key !== anonKey)
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
  }

  // Persist the user message to DB (fire-and-forget, don't block the stream)
  if (sessionId && body.userMessage) {
    db
      .from("chat_messages")
      .insert({ session_id: sessionId, role: "user", content: body.userMessage })
      .then(({ error }) => {
        if (error) console.error("[chat] failed to save user message:", error.message);
      });
  }

  // ── RAG context ──
  let contextBlock = "";
  const lastUserMessage = [...trimmedMessages].reverse().find((m) => m.role === "user");
  try {
    if (lastUserMessage?.content) {
      const embedding = await generateEmbedding(lastUserMessage.content, apiKey, "query");
      const { data } = await db.rpc("match_scholarship_docs", {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 5,
      });
      const matches = (data ?? []) as { content: string; similarity: number }[];
      if (matches.length) {
        const formatted = matches
          .map((match, index) => `Source ${index + 1}: ${match.content}`)
          .join("\n\n");
        contextBlock = `\n\nRelevant scholarship context:\n${formatted}`;
      }
    }
  } catch (err) {
    logRequest("rag.context.error", { ip, error: String(err) });
  }

  // ── Cache lookup (only for fresh single-turn questions) ──
  const primaryModel =
    process.env.OPENROUTER_MODEL ?? "deepseek/deepseek-v4-flash";
  // Cache only when this is a single-user-turn question. We count user-role
  // messages instead of total because the UI seeds a welcome assistant turn
  // into the visible history, which would otherwise always disable the cache.
  const userTurnCount = trimmedMessages.filter((m) => m.role === "user").length;
  const cacheEligible = !!lastUserMessage?.content && userTurnCount === 1;

  // Extract any scholarship-specific context from the system message so it can
  // be hashed into the cache key. Without this, "Am I eligible for this?" on
  // ANY scholarship page would collide to the same cache entry.
  const systemMessageContent = trimmedMessages.find((m) => m.role === "system")?.content ?? "";

  let cacheKey: string | null = null;
  if (cacheEligible && lastUserMessage?.content) {
    const lookup = await lookupPromptCache({
      model: primaryModel,
      userMessage: lastUserMessage.content,
      systemContext: systemMessageContent || undefined,
    });
    cacheKey = lookup.cacheKey;
    if (lookup.hit && lookup.response) {
      logRequest("chat.cache.hit", { tier, callerId });
      return streamCachedResponse({
        response: lookup.response,
        modelLabel: primaryModel,
        sessionId,
        userMessageText: body.userMessage ?? null,
        db,
      });
    }
  } else {
    logRequest("chat.cache.skip", {
      tier,
      reason: !lastUserMessage?.content ? "no_user_message" : "multi_turn",
      userTurnCount,
    });
  }

  // ── Live model call ──
  const chatPayload = {
    messages: [{ role: "system", content: SYSTEM_PROMPT + contextBlock }, ...trimmedMessages],
    max_tokens: MAX_OUTPUT_TOKENS,
    temperature: 0.7,
    top_p: 0.95,
    stream: true,
  };

  let upstreamRes: Response;
  let upstreamModel = "";
  try {
    const result = await fetchOpenRouterChatWithFallback(chatPayload, {
      apiKey: openRouterKey,
      accept: "text/event-stream",
    });
    upstreamRes = result.response;
    upstreamModel = result.model;
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const upstreamStream = upstreamRes.body!;
  let fullAssistantContent = "";
  logRequest("chat.stream.start", { ip, tier, model: upstreamModel });

  const readable = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ model: upstreamModel })}\n\n`),
      );

      const reader = upstreamStream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed === "data: [DONE]") continue;
            if (!trimmed.startsWith("data:")) continue;

            const jsonStr = trimmed.slice(5).trim();
            let parsed: { choices?: { delta?: { content?: string } }[] };
            try {
              parsed = JSON.parse(jsonStr);
            } catch {
              continue;
            }

            const token = parsed?.choices?.[0]?.delta?.content;
            if (token) {
              fullAssistantContent += token;
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ token })}\n\n`),
              );
            }
          }
        }

        // Persist the assistant response
        if (sessionId && fullAssistantContent) {
          db
            .from("chat_messages")
            .insert({
              session_id: sessionId,
              role: "assistant",
              content: fullAssistantContent,
            })
            .then(({ error }) => {
              if (error)
                console.error("[chat] failed to save assistant message:", error.message);
            });

          if (body.userMessage) {
            const title = body.userMessage.slice(0, 60).trim();
            db
              .from("chat_sessions")
              .update({ title })
              .eq("id", sessionId)
              .eq("title", "New conversation")
              .then(() => {});
          }
        }

        // Write to cache if eligible. Done after streaming so the user
        // never waits on the cache write path.
        if (cacheEligible && cacheKey && lastUserMessage?.content && fullAssistantContent) {
          writePromptCache(
            cacheKey,
            upstreamModel,
            lastUserMessage.content,
            fullAssistantContent,
          ).catch(() => {});
        }

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: String(err) })}\n\n`,
          ),
        );
      } finally {
        logRequest("chat.stream.end", { ip, model: upstreamModel });
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

/**
 * Streams a cached response back to the client in the same SSE format
 * as a live model call so the UI doesn't need a separate code path.
 * Splits the response into small chunks to preserve the typewriter feel.
 */
function streamCachedResponse(args: {
  response: string;
  modelLabel: string;
  sessionId: string | null;
  userMessageText: string | null;
  db: ReturnType<typeof createServiceClient>;
}) {
  const { response, modelLabel, sessionId, userMessageText, db } = args;
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      controller.enqueue(
        encoder.encode(`data: ${JSON.stringify({ model: modelLabel, cached: true })}\n\n`),
      );

      // Stream in ~40-char chunks for a typewriter feel.
      const chunkSize = 40;
      for (let i = 0; i < response.length; i += chunkSize) {
        const token = response.slice(i, i + chunkSize);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ token })}\n\n`),
        );
        // Tiny delay so the UI updates feel natural without slowing it down too much.
        await new Promise((r) => setTimeout(r, 12));
      }

      if (sessionId && response) {
        db.from("chat_messages")
          .insert({
            session_id: sessionId,
            role: "assistant",
            content: response,
          })
          .then(({ error }) => {
            if (error)
              console.error("[chat] failed to save assistant message:", error.message);
          });

        if (userMessageText) {
          const title = userMessageText.slice(0, 60).trim();
          db.from("chat_sessions")
            .update({ title })
            .eq("id", sessionId)
            .eq("title", "New conversation")
            .then(() => {});
        }
      }

      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

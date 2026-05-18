import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { checkRateLimit, fetchNimWithFallback, generateEmbedding, getClientIp, logRequest } from "@/lib/nim";

const SYSTEM_PROMPT = `You are BairePorbo Mentor, an expert AI advisor for Bangladeshi and South Asian students pursuing higher education and scholarships abroad. You have deep knowledge of:
- International scholarships (DAAD, Erasmus Mundus, Commonwealth, Chevening, Fulbright, etc.)
- University admission requirements and processes
- CGPA/GPA requirements, English proficiency tests (IELTS, TOEFL, Duolingo)
- Statement of Purpose, recommendation letters, and application strategies
- Country-specific study permit and visa processes

Be concise, practical, and encouraging. Always cite specific scholarships or programs when relevant.`;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rate = await checkRateLimit(`chat:${ip}`, { limit: 30, windowMs: 60_000 });
  if (!rate.allowed) {
    return NextResponse.json(
      { error: "Rate limit exceeded. Please retry shortly." },
      { status: 429, headers: { "Retry-After": Math.ceil(rate.resetMs / 1000).toString() } }
    );
  }

  const apiKey = process.env.NVIDIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "NVIDIA_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

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

  const sessionId = body.sessionId ?? null;
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const db = createServiceClient();
  const anonKey = req.headers.get("x-anon-key");
  const { data: { user } } = await supabase.auth.getUser();

  // If a session ID is provided, verify ownership first
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
      if (!user || user.id !== session.user_id) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    } else {
      if (session.anon_key !== anonKey) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
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

  let contextBlock = "";
  try {
    const lastUserMessage = [...userMessages].reverse().find((m) => m.role === "user");
    if (lastUserMessage?.content) {
      const embedding = await generateEmbedding(lastUserMessage.content, apiKey, "query");
      const service = createServiceClient();
      const db = service ?? supabase;
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

  const nimPayload = {
    messages: [{ role: "system", content: SYSTEM_PROMPT + contextBlock }, ...userMessages],
    max_tokens: 1024,
    temperature: 0.7,
    top_p: 0.95,
    stream: true,
  };

  let nimRes: Response;
  let nimModel = "";
  try {
    const result = await fetchNimWithFallback(nimPayload, {
      apiKey,
      accept: "text/event-stream",
    });
    nimRes = result.response;
    nimModel = result.model;
  } catch (err) {
    return NextResponse.json(
      { error: String(err) },
      { status: 502 },
    );
  }

  const encoder = new TextEncoder();
  const nimStream = nimRes.body!;
  // Accumulate full response so we can persist it after the stream ends
  let fullAssistantContent = "";
  logRequest("chat.stream.start", { ip, model: nimModel });

  const readable = new ReadableStream({
    async start(controller) {
      const reader = nimStream.getReader();
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

        // Stream finished — persist the full assistant response
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

          // Auto-update session title from first user message if title is still default
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

        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      } catch (err) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: String(err) })}\n\n`,
          ),
        );
      } finally {
        logRequest("chat.stream.end", { ip, model: nimModel });
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

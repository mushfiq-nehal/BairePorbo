import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

const NIM_URL = "https://integrate.api.nvidia.com/v1/chat/completions";
const MODEL = "google/gemma-4-31b-it";

const SYSTEM_PROMPT = `You are BairePorbo Mentor, an expert AI advisor for Bangladeshi and South Asian students pursuing higher education and scholarships abroad. You have deep knowledge of:
- International scholarships (DAAD, Erasmus Mundus, Commonwealth, Chevening, Fulbright, etc.)
- University admission requirements and processes
- CGPA/GPA requirements, English proficiency tests (IELTS, TOEFL, Duolingo)
- Statement of Purpose, recommendation letters, and application strategies
- Country-specific study permit and visa processes

Be concise, practical, and encouraging. Always cite specific scholarships or programs when relevant.`;

export async function POST(req: NextRequest) {
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

  // Persist the user message to DB (fire-and-forget, don't block the stream)
  if (sessionId && body.userMessage) {
    supabase
      .from("chat_messages")
      .insert({ session_id: sessionId, role: "user", content: body.userMessage })
      .then(({ error }) => {
        if (error) console.error("[chat] failed to save user message:", error.message);
      });
  }

  const nimPayload = {
    model: MODEL,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...userMessages],
    max_tokens: 1024,
    temperature: 0.7,
    top_p: 0.95,
    stream: true,
  };

  let nimRes: Response;
  try {
    nimRes = await fetch(NIM_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(nimPayload),
    });
  } catch (err) {
    return NextResponse.json(
      { error: `Network error reaching NVIDIA NIM: ${String(err)}` },
      { status: 502 },
    );
  }

  if (!nimRes.ok) {
    const text = await nimRes.text();
    return NextResponse.json(
      { error: `NVIDIA NIM error (${nimRes.status}): ${text}` },
      { status: nimRes.status },
    );
  }

  const encoder = new TextEncoder();
  const nimStream = nimRes.body!;
  // Accumulate full response so we can persist it after the stream ends
  let fullAssistantContent = "";

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
          supabase
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
            supabase
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

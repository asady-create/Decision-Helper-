import { NextResponse } from "next/server";
import type { AppData } from "@/lib/types";
import {
  buildLocalReflection,
  buildReflectionContext,
  parseAiReflection,
  REFLECT_SYSTEM_PROMPT,
} from "@/lib/ai-reflect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function softNote(message: string) {
  return message;
}

async function reflectWithOpenAI(context: string) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  // Explicit opt-out — useful when a key exists but the region blocks OpenAI.
  if (process.env.OPENAI_REFLECT === "0") return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12_000);

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.7,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: REFLECT_SYSTEM_PROMPT },
          {
            role: "user",
            content: `Reflect on this person's Ikigai inputs and suggest contemplative pursuits:\n\n${context}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${text.slice(0, 240)}`);
    }

    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Empty OpenAI response");
    return parseAiReflection(JSON.parse(content), "openai");
  } finally {
    clearTimeout(timer);
  }
}

export async function POST(req: Request) {
  let body: { data?: AppData };
  try {
    body = (await req.json()) as { data?: AppData };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.data || typeof body.data !== "object") {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  // Always prefer a successful local reflection over a 500.
  try {
    let context = "";
    try {
      context = buildReflectionContext(body.data);
    } catch (err) {
      console.warn("[ikigai] reflect context failed; continuing local", err);
    }

    if (context && process.env.OPENAI_API_KEY?.trim()) {
      try {
        const ai = await reflectWithOpenAI(context);
        if (ai) {
          return NextResponse.json({
            reflection: ai,
            mode: "openai",
          });
        }
      } catch (err) {
        console.warn(
          "[ikigai] OpenAI reflect failed (key/region/network); using local engine",
          err
        );
      }
    }

    const local = buildLocalReflection(body.data);
    const hasKey = Boolean(process.env.OPENAI_API_KEY?.trim());
    return NextResponse.json({
      reflection: local,
      mode: "local",
      note: softNote(
        hasKey
          ? "Live model unavailable (network, key, or region). Used the built-in contemplative engine — no region limit."
          : "Used the built-in contemplative engine grounded in your inputs. Optional: set OPENAI_API_KEY for a live model."
      ),
    });
  } catch (err) {
    console.error("[ikigai] reflect route failed", err);
    try {
      const local = buildLocalReflection(body.data);
      return NextResponse.json({
        reflection: local,
        mode: "local",
        note: "Recovered with the built-in contemplative engine after an unexpected error.",
      });
    } catch (inner) {
      console.error("[ikigai] local reflect also failed", inner);
      return NextResponse.json(
        {
          error:
            "Reflection could not run. Try clearing .next (rm -rf .next) and restarting npm run dev.",
        },
        { status: 500 }
      );
    }
  }
}

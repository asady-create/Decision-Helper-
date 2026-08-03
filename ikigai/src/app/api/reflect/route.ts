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

async function reflectWithOpenAI(context: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
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
}

export async function POST(req: Request) {
  let body: { data?: AppData };
  try {
    body = (await req.json()) as { data?: AppData };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.data) {
    return NextResponse.json({ error: "Missing data" }, { status: 400 });
  }

  const context = buildReflectionContext(body.data);

  try {
    const ai = await reflectWithOpenAI(context);
    if (ai) {
      return NextResponse.json({
        reflection: ai,
        mode: "openai",
      });
    }
  } catch (err) {
    console.warn("[ikigai] OpenAI reflect failed; using local engine", err);
  }

  const local = buildLocalReflection(body.data);
  return NextResponse.json({
    reflection: local,
    mode: "local",
    note:
      "No OPENAI_API_KEY configured (or provider failed). Used the built-in contemplative engine grounded in your inputs.",
  });
}

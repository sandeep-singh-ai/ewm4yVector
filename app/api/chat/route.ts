import { NextResponse } from "next/server";
import { embed } from "@/lib/embed";
import { supabase } from "@/lib/supabase";
import { smallTalkReply } from "@/lib/smalltalk";
import { STARTER_QUESTIONS } from "@/lib/suggestions";

export const runtime = "nodejs";

const MATCH_THRESHOLD = Number(process.env.MATCH_THRESHOLD ?? 0.35);

const FALLBACK =
  "I'm sorry, I don't have an answer for that yet. If you are in danger or need urgent help, please call 911 immediately. You can also try rephrasing your question or pick one of the suggestions below.";

type Match = { id: number; question: string; answer: string; category: string | null; similarity: number };

export async function POST(req: Request) {
  let message = "";
  try {
    ({ message } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  message = String(message ?? "").trim().slice(0, 1000);
  if (!message) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  // Greetings and small talk are answered directly; everything else goes to the vector search.
  const smallTalk = smallTalkReply(message);
  if (smallTalk) {
    return NextResponse.json({ answer: smallTalk, matched: true, similarity: null, related: STARTER_QUESTIONS });
  }

  if (!supabase) return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });

  const embedding = await embed(message);
  const { data, error } = await supabase.rpc("match_qa_pairs", {
    query_embedding: embedding,
    match_threshold: MATCH_THRESHOLD,
    match_count: 4,
  });

  if (error) {
    console.error("match_qa_pairs failed:", error.message);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }

  const matches = (data ?? []) as Match[];
  const [best, ...rest] = matches;

  return NextResponse.json({
    answer: best ? best.answer : FALLBACK,
    matched: Boolean(best),
    similarity: best?.similarity ?? null,
    related: best ? rest.map((m) => m.question) : STARTER_QUESTIONS,
  });
}

// Usage: npm run ingest -- data/qa.json
// Accepts a JSON array: [{ "question": "...", "answer": "...", "category": "optional" }]
// Upserts by question, so re-running after edits is safe.
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { pipeline } from "@huggingface/transformers";

const file = process.argv[2] ?? "data/qa.json";
const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const rows = JSON.parse(await readFile(file, "utf8"));
if (!Array.isArray(rows)) throw new Error(`${file} must contain a JSON array`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const extractor = await pipeline("feature-extraction", "Xenova/paraphrase-multilingual-MiniLM-L12-v2", { dtype: "fp32" });

const records = [];
for (const [i, r] of rows.entries()) {
  if (!r.question || !r.answer) {
    console.warn(`Skipping row ${i}: missing question or answer`);
    continue;
  }
  const out = await extractor(r.question.trim(), { pooling: "mean", normalize: true });
  records.push({
    question: r.question.trim(),
    answer: r.answer.trim(),
    category: r.category ?? null,
    language: r.language ?? "en",
    embedding: Array.from(out.data),
  });
}

for (let i = 0; i < records.length; i += 100) {
  const chunk = records.slice(i, i + 100);
  const { error } = await supabase.from("qa_pairs").upsert(chunk, { onConflict: "question" });
  if (error) throw error;
  console.log(`Upserted ${i + chunk.length}/${records.length}`);
}
console.log("Done.");

import { pipeline, type FeatureExtractionPipeline } from "@huggingface/transformers";

// Must match the model used in scripts/ingest.mjs and the vector(384) column.
export const EMBED_MODEL = "Xenova/paraphrase-multilingual-MiniLM-L12-v2";

let extractor: Promise<FeatureExtractionPipeline> | null = null;

function getExtractor() {
  extractor ??= pipeline("feature-extraction", EMBED_MODEL, { dtype: "fp32" }) as Promise<FeatureExtractionPipeline>;
  return extractor;
}

export async function embed(text: string): Promise<number[]> {
  const fx = await getExtractor();
  const out = await fx(text, { pooling: "mean", normalize: true });
  return Array.from(out.data as Float32Array);
}

# ewm4yVector

## Deploy (Coolify)

The repo has a `Dockerfile`. It builds the app, bakes the embedding model into the image (no download
on first request) and runs `next start` on port 3000.

1. Push the project to a Git repo (GitHub, GitLab, Gitea). `.env` is git-ignored; keep it that way.
2. In Coolify: **New Resource → Application → (your Git source)**, pick the repo and branch.
3. **Build Pack:** `Dockerfile`. Base directory `/`, Dockerfile location `/Dockerfile`.
4. **Ports Exposes:** `3000`.
5. **Environment Variables** (runtime only, not build-time):
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY` (secret: server-side only)
   - `MATCH_THRESHOLD` (optional, default `0.35`)
6. **Domains:** set your domain, e.g. `https://chat.example.com`. Coolify issues the TLS certificate.
7. Deploy.

Resources: give the container at least 1 GB RAM (the fp32 model loads ~500 MB). The image is large
(~1.5 GB) because of the model and ONNX runtime. The first build takes several minutes.

Ingest runs separately from deploys. Either run `npm run ingest -- data/qa.json` locally against the
same Supabase project, or open the container terminal in Coolify and run
`node scripts/ingest.mjs data/qa.json` (env vars are already set there; changes to `data/qa.json`
need a redeploy first).

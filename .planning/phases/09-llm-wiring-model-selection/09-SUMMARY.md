# Phase 9 Summary — LLM Wiring & Model Selection (BLOG-01, BLOG-02)

**Status:** Complete (2026-06-07)
**Branch:** gsd/v5.0-milestone-setup (PR #792)

## Outcome
n8n can call the local LLM, and the generation + RAG models are loaded and smoke-tested. **Major deviation: switched the n8n runtime from Docker/colima to NATIVE** — see below.

### BLOG-01 — n8n → LM Studio reachable ✅
- **The colima/Docker container path is a dead end.** Verified by live probing: colima's gvproxy network forwards host-bound traffic ONLY for the VM's native stack, never for containers (bridge OR host-net) — the container could never reach LM Studio at `192.168.1.251:1234`, `192.168.5.2` (gateway), or via `host.docker.internal`, even on `network_mode: host`. The only container fixes were `colima start --network-address` (sudo) or abandoning Docker.
- **Resolution: native n8n on the Mac** (node@22 + n8n 2.23.4, via `n8n/start-native.sh`), reusing the existing `n8n/data` (a `.n8n -> data` symlink; same sqlite = all 3 workflows + the Mistral/Resend credential + encryption key carried over, auto-activated on boot). n8n now reaches LM Studio at **`http://localhost:1234/v1`** — plain localhost, no VM networking.
- Verified: `/v1/models`, `/v1/chat/completions`, `/v1/embeddings` all HTTP 200 from the n8n host; the prod webhook through the `tenantflow-n8n` Cloudflare tunnel still returns 200 (inbound intact); the cloudflared connector still hits `localhost:5678`.

### BLOG-02 — generation + RAG models ✅
- Generation model: **`mistral-small-3.2-24b-instruct-2506-mlx`** (LM Studio MLX 8-bit, 25.93 GB; lmstudio-community, Apache 2.0). Brand-prose smoke test passed — coherent, on-brand TenantFlow marketing intro, natural tone, no hype, no hallucinated specifics.
- RAG models reachable for Phase 10: `text-embedding-qwen3-embedding-0.6b` (embeddings, dim **1024**) + `qwen3-reranker-0.6b` (reranker present).

## Config for later phases
- **LLM base URL (from n8n):** `http://localhost:1234/v1`
- **Generation model id:** `mistral-small-3.2-24b-instruct-2506-mlx`
- **Embedding model id:** `text-embedding-qwen3-embedding-0.6b` (dim 1024)
- **Reranker model id:** `qwen3-reranker-0.6b`
- **Webhook secret (Bearer):** `n8n.webhook.secret` (app_config) — already wired into the 3 notify workflows.

## Runtime (native) — supersedes the Docker bridge
- Start: `bash n8n/start-native.sh` (nohup for background) — node@22 + n8n 2.23.4, `N8N_USER_FOLDER=n8n/`, `.n8n -> data`.
- Docker/colima **stopped + removed** (no longer used). LM Studio "Serve on Local Network" is **no longer required** (native n8n uses localhost).
- After reboot: (1) `bash n8n/start-native.sh`, (2) re-run the `cloudflared tunnel run --token …` connector, (3) LM Studio running with the model loaded. (A launchd plist could auto-start both — optional.)

## Notes
- No tracked code changes (n8n/ is gitignored). Only `.planning` docs in PR #792.
- `n8n/docker-compose.yml` is now vestigial (kept for reference; native is the runtime). `n8n/README.md` updated for the native runtime.

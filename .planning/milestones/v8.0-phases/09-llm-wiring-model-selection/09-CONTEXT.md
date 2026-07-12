# Phase 9: LLM Wiring & Model Selection - Context

**Gathered:** 2026-06-07
**Status:** Ready for planning
**Source:** Live-probed the colima/n8n→Mac-host connectivity + LM Studio state.

<domain>
## Phase Boundary
Make the local LLM reachable from the n8n container and have the right generation model + RAG models available + smoke-tested. No content generation yet (that's Phase 11). Deliverable: n8n can call LM Studio's OpenAI-compatible `/v1/chat/completions` + `/v1/embeddings`, and a general-instruct model produces marketing-grade prose.
</domain>

<decisions>
## Implementation Decisions (LOCKED — live-verified)

### BLOG-01 — n8n (colima Docker) → LM Studio on the Mac host
**Verified state (2026-06-07):**
- LM Studio runs on the Mac at `localhost:1234` (host `curl localhost:1234/v1/models` → 200) serving `qwen3-coder-30b-a3b-instruct`, `qwen3-embedding-0.6b`, `qwen3-reranker-0.6b`, `nomic-embed-text-v1.5`.
- From inside the `tenantflow-n8n` container: `host.docker.internal` AND `host.lima.internal` do NOT resolve; the Mac LAN IP `192.168.1.251:1234` is unreachable.
- Root cause is TWO things: (a) **LM Studio is bound to localhost only** — it must "Serve on Local Network" (bind `0.0.0.0`); (b) colima's container has no host-gateway alias by default.
**Solution to implement + verify:**
- Owner action: enable LM Studio → Developer/Server → **"Serve on Local Network"** (binds 0.0.0.0:1234).
- Wire the container: add `extra_hosts: ["host.docker.internal:host-gateway"]` to the `n8n` service in `n8n/docker-compose.yml` (re-up the container), OR use the Mac LAN IP `192.168.1.251` directly. Prefer a stable name — test `host.docker.internal` first; fall back to the LAN IP. (LAN IP can change; if used, document it as a config value.)
- The n8n base URL for LLM calls becomes `http://host.docker.internal:1234/v1` (or `http://192.168.1.251:1234/v1`).
- Verify: from the container, `curl <base>/v1/models` → 200 listing the models; a `/v1/chat/completions` call returns a completion; a `/v1/embeddings` call returns a vector.

### BLOG-02 — generation model
- Only `qwen3-coder-30b-a3b-instruct` (code-tuned) is installed. **Owner action: pull a general-instruct model** into LM Studio. **Recommended (HF research, 2026-06): `Mistral-Small-3.2-24B-Instruct-2506`** — download `lmstudio-community/Mistral-Small-3.2-24B-Instruct-2506-MLX-6bit` (~18-19GB, Apache 2.0). Chosen because the JSON ingest contract is the hard constraint and Mistral 3.2 was purpose-built for function-calling/structured-output + instruction-following reliability, with serviceable marketing prose in a single-pass pipeline. Runner-up for pure prose: `mlx-community/gemma-3-27b-it-qat-4bit` (weaker JSON discipline → only as a two-model styling pass). Fast-draft alternate: `lmstudio-community/Qwen3-30B-A3B-Instruct-2507-MLX-6bit` (MoE, faster + 262K ctx, but stiffer prose). Document the choice; coder-instruct is the last-resort fallback.
- Smoke test: a marketing-style prompt ("write a 120-word intro for a landlord blog about tenant screening, brand: TenantFlow") returns coherent, on-brand prose.
- Embeddings (`qwen3-embedding-0.6b`) + reranker (`qwen3-reranker-0.6b`) confirmed reachable for Phase 10 RAG.

### Verification (no app unit test — infra/config phase)
- Reachability proven from inside the container (curl to `/v1/models`, `/v1/chat/completions`, `/v1/embeddings`).
- The LLM base URL + chosen model recorded as config (likely an n8n credential or env for later phases).
- A short n8n test workflow (manual trigger → HTTP Request to `<base>/v1/chat/completions`) returns a completion — proves the path n8n will actually use.
</decisions>

<constraints>
- The container is `tenantflow-n8n` (colima Docker on the M5), compose at `n8n/docker-compose.yml` (gitignored). Editing compose + `docker-compose up -d` re-creates it (volume `./data` persists workflows/creds).
- LM Studio's API is OpenAI-compatible (`/v1/chat/completions`, `/v1/embeddings`); models referenced by their LM Studio id (e.g. `qwen3-coder-30b-a3b-instruct`).
- This is laptop-bridge tooling (homelab down); keep it portable + documented in `n8n/README.md`.
- Owner-action prerequisites (gate execution): (1) LM Studio "Serve on Local Network"; (2) pull the general-instruct model.
</constraints>

<canonical_refs>
- `n8n/docker-compose.yml` + `n8n/README.md` (the bridge setup).
- LM Studio OpenAI-compat API (`/v1/*`).
- The `tenantflow-n8n` Cloudflare tunnel (inbound prod webhooks already flow; this phase is OUTBOUND from n8n to the local LLM).
</canonical_refs>

<deferred>
- RAG corpus + pgvector → Phase 10 (BLOG-03).
- Actual blog generation → Phase 11.
</deferred>

---
*Phase: 09-llm-wiring-model-selection — colima→LM Studio wiring (LM Studio localhost-only + colima host-gateway) + general-instruct model pull + smoke tests.*

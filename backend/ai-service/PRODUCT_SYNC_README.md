# SELENE: Continuous Supabase -> Qdrant synchronization

**Source branch reviewed:** `nhufix2` (commit `3ba340dd5467dec1dbf9cb95ea8073ca978292b0`).

## Architecture

`products / product_variants / categories / brands` → PostgreSQL AFTER triggers → `ai_product_sync_queue` (coalesced, durable) → Python sync worker → Jina `retrieval.passage` when document changes → Qdrant `selene_products_jina_v3`.

A change to any column in these four tables is captured. Promotion-driven product price updates and order-driven variant stock updates are caught automatically because the triggers observe the database tables, not only the admin API handlers.

- `NEW`: embed and upsert.
- `REEMBED`: embed and upsert when semantic document changes.
- `METADATA_ONLY`: replace payload, **without reembedding** when document is unchanged.
- `UNCHANGED`: no Qdrant write.
- `DELETE`: delete Qdrant point when product is missing, inactive, category inactive or there are no active in-stock variants. Restocking recreates the point.

Sync is **eventual consistency** (typically within the configured poll interval plus processing time), not an atomic cross-database transaction. Retry and 10-minute leases protect against temporary failures. For long outages, monitor the queue and worker logs.

## Setup

1. In the Supabase project used by `backend/product-service`, run `migrations/001_ai_product_sync_outbox.sql` once in the SQL Editor. **Inspect SQL before running in production.** It adds triggers and an outbox table; it does not edit existing product rows.
2. In `backend/ai-service/.env` configure the **server-side only** secrets:

```dotenv
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=YOUR_SERVER_SIDE_SERVICE_ROLE_KEY
QDRANT_URL=https://YOUR_QDRANT_CLUSTER
QDRANT_API_KEY=YOUR_QDRANT_KEY
QDRANT_COLLECTION=selene_products_jina_v3
EMBEDDING_PROVIDER=jina
EMBEDDING_MODEL=jina-embeddings-v3
EMBEDDING_DIM=1024
JINA_API_KEY=YOUR_JINA_KEY
```

3. Install dependencies: `cd backend/ai-service && pip install -r requirements.txt`.
4. Test the worker code (no real network): `python -m unittest discover -s tests -p 'test_product_sync_worker.py'`.
5. Examine queue without claiming events: `python scripts/product_sync_worker.py --dry-run`.
6. Run one batch: `python scripts/product_sync_worker.py --once`.
7. Run continuously: `python scripts/product_sync_worker.py --interval 5 --batch-size 10` **in a separate long-running process/container**; the FastAPI service alone will **not** run synchronization.

### Windows PowerShell

After completing setup, run `npm run dev` from the repository root (`T:\selene`).
This starts the app services, SePay tunnel, and product sync worker together.
Worker logs have the `[sync]` prefix. The command uses the existing ai-service
virtual environment and sets `DEBUG=false`. Stop with Ctrl+C to stop the group;
sync resumes from the durable queue the next time `npm run dev` starts.
The root command `npm run dev:sync` runs just the worker. Do not also launch a
separate background worker when using `npm run dev`.

After running the SQL migration in Supabase SQL Editor, use the local virtual environment:

```powershell
Set-Location T:\selene\backend\ai-service
# Some host environments set DEBUG=WARN, which is not a valid boolean.
$env:DEBUG = 'false'
.\.venv\Scripts\python.exe scripts/product_sync_worker.py --dry-run
.\.venv\Scripts\python.exe scripts/product_sync_worker.py --once
.\.venv\Scripts\python.exe scripts/product_sync_worker.py --interval 5 --batch-size 10
```

The last command stays in the foreground; keep the terminal open. Stop with Ctrl+C.
The worker loads `backend/ai-service/.env` automatically. Existing process environment
variables take precedence. `SUPABASE_SERVICE_ROLE_KEY` can also contain a backend
`sb_secret_...` key. API keys alone do not provide a PostgreSQL connection for running
the migration; use SQL Editor or a separate authorized database connection.

For Docker, run `docker compose -f docker-compose.product-sync.yml up -d --build`
from the repository root; the compose file is located there.

### Integration checks

Run disposable live checks from `backend/ai-service`:

```powershell
$env:DEBUG = 'false'
.\.venv\Scripts\python.exe scripts/check_product_sync_live.py --execute
```

This writes temporary product/category/brand/variant records to the configured
Supabase project and uses the real Qdrant collection and Jina API. It verifies
create, price-only updates (unchanged vector), inactive/reactivation, zero stock/
restock, category and brand renames, category status, and deletion. Temporary
source records and Qdrant points are removed; processed outbox rows remain as
audit records. Results are saved in `tests/product_sync_live_result.json`.
The recovery check closes a local HTTP socket during the first claim and verifies
that the worker retries and successfully claims from real Supabase afterwards;
it does not force an outage on Supabase's HTTP/2 infrastructure.

Continuous polling retries HTTP transport failures with exponential delay capped
at 60 seconds, resetting after a successful batch. `--once` still surfaces claim
failures. Restart running worker processes after changing the script.

Edit a single test product in Supabase and check `public.ai_product_sync_queue` revision increased, then run the worker. Verify the Qdrant point using ID `uuid5(NAMESPACE_URL, 'selene:product:' + product_id)`.

- Change price → payload updated, vector unchanged **after the first reindex to this document format**.
- Change name, description, category, available size/color → embedding renewed.
- Update variant stock → payload updated; if an available size/color disappears, embedding renewed.
- Mark inactive or set every variant out of stock → Qdrant point removed; reverse → point restored.
- Edit brand or category → dependent products queued.

**Important migration compatibility:** The Colab notebook generated the existing 1,137 points with a different `document` formatter. The **first event touching each legacy point** may trigger `REEMBED` once to adopt this worker's document format. The worker does **not** rescan or reembed all points on startup. Keep the same Jina embedding model and dimension. Never run the old `scripts/sync_supabase.py` against the live collection: it uses `uuid5(NAMESPACE_DNS, product_id)` instead of the Colab UUID5 mapping and can create duplicates.

**No full reconciliation is enabled by default.** A separate, carefully reviewed reconciliation/backfill is needed to verify every pre-existing Qdrant point and recover product changes that occurred *before* the triggers were installed. Do not blindly delete based on partial Supabase queries.

**Security:** Never expose the service role key in the frontend, commit it to Git, or use the anonymous Supabase key for the queue worker. Only the `service_role` role can call the queue claim/ACK functions. Do not run multiple workers with a claim batch that can take longer than the 10-minute lease.

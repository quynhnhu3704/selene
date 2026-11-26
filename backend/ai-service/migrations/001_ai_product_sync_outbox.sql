-- Run once in the Supabase SQL editor (the same database as product-service).
-- Durable, coalescing transactional outbox: every relevant source-table mutation
-- increments a per-product revision in the SAME database transaction.

CREATE TABLE IF NOT EXISTS public.ai_product_sync_queue (
    product_id text PRIMARY KEY,
    revision bigint NOT NULL DEFAULT 1,
    processed_revision bigint NOT NULL DEFAULT 0,
    attempts integer NOT NULL DEFAULT 0,
    next_attempt_at timestamptz NOT NULL DEFAULT now(),
    lease_until timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT ai_product_sync_revision_check CHECK (
        revision >= 1 AND processed_revision >= 0 AND processed_revision <= revision
    )
);

CREATE INDEX IF NOT EXISTS ai_product_sync_ready_idx
    ON public.ai_product_sync_queue (next_attempt_at)
    WHERE revision > processed_revision;

ALTER TABLE public.ai_product_sync_queue ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.ai_product_sync_queue FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.ai_product_sync_queue TO service_role;

CREATE OR REPLACE FUNCTION public.enqueue_ai_product_sync(p_product_id text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
    IF p_product_id IS NULL OR btrim(p_product_id) = '' THEN RETURN; END IF;
    INSERT INTO public.ai_product_sync_queue (product_id)
    VALUES (p_product_id)
    ON CONFLICT (product_id) DO UPDATE SET
        revision = public.ai_product_sync_queue.revision + 1,
        next_attempt_at = now(),
        updated_at = now();
    -- Do not clear lease_until: a worker may still be processing an earlier revision.
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_sync_product_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.enqueue_ai_product_sync(OLD.product_id::text);
        RETURN OLD;
    END IF;
    PERFORM public.enqueue_ai_product_sync(NEW.product_id::text);
    IF TG_OP = 'UPDATE' AND OLD.product_id IS DISTINCT FROM NEW.product_id THEN
        PERFORM public.enqueue_ai_product_sync(OLD.product_id::text);
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_sync_variant_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        PERFORM public.enqueue_ai_product_sync(OLD.product_id::text);
        RETURN OLD;
    END IF;
    PERFORM public.enqueue_ai_product_sync(NEW.product_id::text);
    IF TG_OP = 'UPDATE' AND OLD.product_id IS DISTINCT FROM NEW.product_id THEN
        PERFORM public.enqueue_ai_product_sync(OLD.product_id::text);
    END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_sync_category_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE affected_id text;
BEGIN
    IF TG_OP = 'DELETE' THEN
        affected_id := OLD.category_id::text;
    ELSE
        affected_id := NEW.category_id::text;
    END IF;
    INSERT INTO public.ai_product_sync_queue (product_id)
    SELECT p.product_id::text FROM public.products p WHERE p.category_id::text = affected_id
    ON CONFLICT (product_id) DO UPDATE SET
        revision = public.ai_product_sync_queue.revision + 1,
        next_attempt_at = now(), updated_at = now();
    IF TG_OP = 'UPDATE' AND OLD.category_id IS DISTINCT FROM NEW.category_id THEN
        INSERT INTO public.ai_product_sync_queue (product_id)
        SELECT p.product_id::text FROM public.products p WHERE p.category_id::text = OLD.category_id::text
        ON CONFLICT (product_id) DO UPDATE SET
            revision = public.ai_product_sync_queue.revision + 1,
            next_attempt_at = now(), updated_at = now();
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ai_sync_brand_trigger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
DECLARE affected_id text;
BEGIN
    IF TG_OP = 'DELETE' THEN
        affected_id := OLD.brand_id::text;
    ELSE
        affected_id := NEW.brand_id::text;
    END IF;
    INSERT INTO public.ai_product_sync_queue (product_id)
    SELECT p.product_id::text FROM public.products p WHERE p.brand_id::text = affected_id
    ON CONFLICT (product_id) DO UPDATE SET
        revision = public.ai_product_sync_queue.revision + 1,
        next_attempt_at = now(), updated_at = now();
    IF TG_OP = 'UPDATE' AND OLD.brand_id IS DISTINCT FROM NEW.brand_id THEN
        INSERT INTO public.ai_product_sync_queue (product_id)
        SELECT p.product_id::text FROM public.products p WHERE p.brand_id::text = OLD.brand_id::text
        ON CONFLICT (product_id) DO UPDATE SET
            revision = public.ai_product_sync_queue.revision + 1,
            next_attempt_at = now(), updated_at = now();
    END IF;
    IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ai_products_changed ON public.products;
CREATE TRIGGER ai_products_changed AFTER INSERT OR UPDATE OR DELETE ON public.products
FOR EACH ROW EXECUTE FUNCTION public.ai_sync_product_trigger();

DROP TRIGGER IF EXISTS ai_variants_changed ON public.product_variants;
CREATE TRIGGER ai_variants_changed AFTER INSERT OR UPDATE OR DELETE ON public.product_variants
FOR EACH ROW EXECUTE FUNCTION public.ai_sync_variant_trigger();

DROP TRIGGER IF EXISTS ai_categories_changed ON public.categories;
CREATE TRIGGER ai_categories_changed AFTER INSERT OR UPDATE OR DELETE ON public.categories
FOR EACH ROW EXECUTE FUNCTION public.ai_sync_category_trigger();

DROP TRIGGER IF EXISTS ai_brands_changed ON public.brands;
CREATE TRIGGER ai_brands_changed AFTER INSERT OR UPDATE OR DELETE ON public.brands
FOR EACH ROW EXECUTE FUNCTION public.ai_sync_brand_trigger();

-- Atomic reservation, safe for concurrent worker processes.
CREATE OR REPLACE FUNCTION public.claim_ai_product_sync_jobs(p_limit integer DEFAULT 10)
RETURNS TABLE(product_id text, revision bigint)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
    RETURN QUERY
    WITH due AS (
        SELECT q.product_id FROM public.ai_product_sync_queue q
        WHERE q.revision > q.processed_revision
          AND q.next_attempt_at <= now()
          AND (q.lease_until IS NULL OR q.lease_until < now())
        ORDER BY q.next_attempt_at, q.updated_at
        LIMIT LEAST(GREATEST(p_limit, 1), 100)
        FOR UPDATE SKIP LOCKED
    )
    UPDATE public.ai_product_sync_queue q SET
        lease_until = now() + interval '10 minutes',
        attempts = q.attempts + 1
    FROM due
    WHERE q.product_id = due.product_id
    RETURNING q.product_id, q.revision;
END;
$$;

-- ACK a specific revision; events arriving during work will remain pending.
CREATE OR REPLACE FUNCTION public.finish_ai_product_sync_job(
    p_product_id text, p_revision bigint, p_success boolean
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, pg_temp AS $$
BEGIN
    UPDATE public.ai_product_sync_queue q SET
        processed_revision = CASE WHEN p_success
            THEN GREATEST(q.processed_revision, p_revision)
            ELSE q.processed_revision END,
        lease_until = NULL,
        attempts = CASE WHEN p_success THEN 0 ELSE q.attempts END,
        next_attempt_at = CASE
            WHEN p_success OR q.revision > p_revision THEN now()
            ELSE now() + make_interval(secs => LEAST(300, power(2::numeric, LEAST(q.attempts, 8)))::integer)
        END
    WHERE q.product_id = p_product_id
      AND q.revision >= p_revision
      AND q.processed_revision < p_revision;
END;
$$;

REVOKE ALL ON FUNCTION public.enqueue_ai_product_sync(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.claim_ai_product_sync_jobs(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.finish_ai_product_sync_job(text,bigint,boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_ai_product_sync(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_ai_product_sync_jobs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_ai_product_sync_job(text,bigint,boolean) TO service_role;

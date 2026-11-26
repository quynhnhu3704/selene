"""Run: cd backend/ai-service && python -m unittest discover -s tests -p 'test_product_sync_worker.py'"""
import asyncio
import copy
import unittest
from unittest.mock import AsyncMock, MagicMock, patch

import httpx

from scripts.product_sync_worker import ProductSyncWorker, point_id, prepare, run_worker


PRODUCT = {
    "product_id": "000121792662460458",
    "product_name": "ĐẦM VOAN",
    "status": "active",
    "description": "Chất liệu: vải voan mềm mại",
    "discount_price": 999000,
    "original_price": 1199000,
    "image_urls": '["https://example.org/p.jpg"]',
    "categories": {"name": "Đầm", "status": "active", "category_id": "C1"},
    "brands": {"name": "SELENE", "brand_id": "B1"},
    "product_variants": [
        {"variant_id": "V1", "size": "M", "color": "Đen", "status": "active", "stock_quantity": 3},
    ],
}


class TestProductSync(unittest.TestCase):
    def test_deleted_product_empty_response(self):
        worker = ProductSyncWorker.__new__(ProductSyncWorker)
        worker.supabase = MagicMock()
        worker.supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value = None
        self.assertIsNone(worker.fetch_product('deleted-product'))

    def test_id_is_compatible_with_colab(self):
        import uuid
        expected = str(uuid.uuid5(uuid.NAMESPACE_URL, "selene:product:000121792662460458"))
        self.assertEqual(point_id(PRODUCT["product_id"]), expected)

    def test_price_only_changes_metadata_not_document(self):
        before_document, before_payload = prepare(PRODUCT)
        changed = copy.deepcopy(PRODUCT)
        changed["discount_price"] += 100
        after_document, after_payload = prepare(changed)
        self.assertEqual(before_document, after_document)
        self.assertNotEqual(before_payload, after_payload)

    def test_textual_changes_require_new_document(self):
        before_document, _ = prepare(PRODUCT)
        for change in ("product_name", "description"):
            p = copy.deepcopy(PRODUCT)
            p[change] += " mới"
            new_document, _ = prepare(p)
            self.assertNotEqual(before_document, new_document)
        p = copy.deepcopy(PRODUCT)
        p["product_variants"][0]["color"] = "Trắng"
        new_document, _ = prepare(p)
        self.assertNotEqual(before_document, new_document)

    def test_inactive_or_no_stock_disappears(self):
        p = copy.deepcopy(PRODUCT)
        p["status"] = "inactive"
        self.assertIsNone(prepare(p))
        p = copy.deepcopy(PRODUCT)
        p["categories"]["status"] = "inactive"
        self.assertIsNone(prepare(p))
        p = copy.deepcopy(PRODUCT)
        p["product_variants"][0]["stock_quantity"] = 0
        self.assertIsNone(prepare(p))

    def make_worker(self, row, old_payload=None):
        w = ProductSyncWorker.__new__(ProductSyncWorker)
        w.fetch_product = lambda _: row
        w.qdrant = MagicMock()
        w.qdrant.retrieve.return_value = [] if old_payload is None else [
            type("Point", (), {"payload": old_payload})()
        ]
        w.embedder = MagicMock()
        async def embed(*args, **kwargs):
            return [0.01] * 1024
        w.embedder.embed_text.side_effect = embed
        return w

    def test_new_upserts_once(self):
        w = self.make_worker(PRODUCT)
        self.assertEqual(asyncio.run(w.sync_product(PRODUCT["product_id"])), "NEW")
        w.qdrant.upsert.assert_called_once()

    def test_metadata_update_does_not_embed(self):
        before = copy.deepcopy(PRODUCT)
        _, payload = prepare(before)
        after = copy.deepcopy(before)
        after["discount_price"] += 1
        w = self.make_worker(after, payload)
        self.assertEqual(asyncio.run(w.sync_product(PRODUCT["product_id"])), "METADATA_ONLY")
        w.embedder.embed_text.assert_not_called()
        w.qdrant.overwrite_payload.assert_called_once()

    def test_reembed(self):
        _, payload = prepare(PRODUCT)
        after = copy.deepcopy(PRODUCT)
        after["description"] += " tay phồng"
        w = self.make_worker(after, payload)
        self.assertEqual(asyncio.run(w.sync_product(PRODUCT["product_id"])), "REEMBED")
        w.qdrant.upsert.assert_called_once()

    def test_delete_inactive(self):
        p = copy.deepcopy(PRODUCT)
        p["status"] = "inactive"
        w = self.make_worker(p, {"document": "old"})
        self.assertEqual(asyncio.run(w.sync_product(PRODUCT["product_id"])), "DELETE")
        w.qdrant.delete.assert_called_once()

    def test_idempotent(self):
        _, payload = prepare(PRODUCT)
        w = self.make_worker(PRODUCT, payload)
        self.assertEqual(asyncio.run(w.sync_product(PRODUCT["product_id"])), "UNCHANGED")
        w.qdrant.upsert.assert_not_called()
        w.qdrant.overwrite_payload.assert_not_called()


class TestWorkerRecovery(unittest.IsolatedAsyncioTestCase):
    async def test_disconnect_backoff_caps_and_resets_after_recovery(self):
        worker = MagicMock()
        worker.run_once = AsyncMock(side_effect=[
            *[httpx.RemoteProtocolError("Server disconnected") for _ in range(6)],
            1, httpx.ConnectError("Connection lost"), 0, asyncio.CancelledError(),
        ])
        with patch("scripts.product_sync_worker.asyncio.sleep", new_callable=AsyncMock) as sleep:
            with self.assertLogs("selene.product_sync", level="ERROR"):
                with self.assertRaises(asyncio.CancelledError):
                    await run_worker(worker, 10, 5)
        self.assertEqual([call.args[0] for call in sleep.await_args_list],
                         [5, 10, 20, 40, 60, 60, 5, 5])
        self.assertEqual(worker.run_once.await_count, 10)

    async def test_once_surfaces_connection_failure_without_retry(self):
        worker = MagicMock()
        worker.run_once = AsyncMock(side_effect=httpx.ReadTimeout("Timed out"))
        with patch("scripts.product_sync_worker.asyncio.sleep", new_callable=AsyncMock) as sleep:
            with self.assertRaises(httpx.ReadTimeout):
                await run_worker(worker, 10, 5, once=True)
        sleep.assert_not_awaited()

    async def test_unexpected_errors_surface(self):
        worker = MagicMock()
        worker.run_once = AsyncMock(side_effect=ValueError("Invalid job"))
        with self.assertRaises(ValueError):
            await run_worker(worker, 10, 5)

    async def test_once_processes_one_batch(self):
        worker = MagicMock()
        worker.run_once = AsyncMock(return_value=1)
        await run_worker(worker, 10, 5, once=True)
        worker.run_once.assert_awaited_once_with(10)


if __name__ == "__main__":
    unittest.main()

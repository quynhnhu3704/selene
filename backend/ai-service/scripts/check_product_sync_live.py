"""Opt-in live checks using disposable records: python scripts/check_product_sync_live.py --execute."""
import argparse
import asyncio
import json
import logging
import socket
import threading
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx

from product_sync_worker import ProductSyncWorker, point_id, run_worker, COLLECTION


async def check():
    worker = ProductSyncWorker()
    db = worker.supabase
    token = 'sync-test-' + uuid.uuid4().hex[:12]
    report = {'test_id': token, 'started_at': datetime.now(timezone.utc).isoformat(),
              'disconnect_scope': 'Local HTTP socket closed during claim; subsequent claim uses real Supabase',
              'checks': []}
    report_path = Path(__file__).resolve().parent.parent / 'tests' / 'product_sync_live_result.json'
    ids = {'products': 'product_id', 'product_variants': 'variant_id',
           'categories': 'category_id', 'brands': 'brand_id'}

    def update(table, data):
        db.table(table).update(data).eq(ids[table], token).execute()

    def queue():
        rows = db.table('ai_product_sync_queue').select('*').eq('product_id', token).execute().data
        return rows[0] if rows else None

    def points():
        return worker.qdrant.retrieve(collection_name=COLLECTION, ids=[point_id(token)],
                                      with_payload=True, with_vectors=True)

    async def verify(label, predicate, previous=0):
        deadline = time.monotonic() + 180
        while time.monotonic() < deadline:
            row = queue()
            if row and row['revision'] > previous and row['revision'] == row['processed_revision']:
                found = points()
                if predicate(found):
                    result = {'case': label, 'revision': row['revision'], 'status': 'PASS'}
                    report['checks'].append(result)
                    print(json.dumps(result), flush=True)
                    return row['revision']
            await asyncio.sleep(1)
        raise AssertionError('Timed out: ' + label)

    # Generate a real HTTP disconnect on a local socket, scoped to this worker's
    # first claim. Subsequent claims use the actual Supabase client unchanged.
    listener = socket.socket()
    listener.bind(('127.0.0.1', 0))
    listener.listen(1)
    listener.settimeout(30)
    port = listener.getsockname()[1]

    def disconnect():
        try:
            conn, _ = listener.accept()
            with conn:
                conn.recv(65536)
                conn.shutdown(socket.SHUT_RDWR)
        finally:
            listener.close()

    threading.Thread(target=disconnect, daemon=True).start()
    original_claim = worker.claim
    recovery = {'disconnected': False, 'successful_claim': False}

    def claim(batch_size):
        if not recovery['disconnected']:
            try:
                httpx.get(f'http://127.0.0.1:{port}/claim', trust_env=False, timeout=10)
            except httpx.RemoteProtocolError:
                recovery['disconnected'] = True
                raise
            raise AssertionError('Expected RemoteProtocolError')
        jobs = original_claim(batch_size)
        recovery['successful_claim'] = True
        return jobs

    worker.claim = claim
    task = asyncio.create_task(run_worker(worker, 10, 1))
    try:
        db.table('categories').insert({'category_id': token, 'name': 'SYNC TEST CATEGORY', 'status': 'active'}).execute()
        db.table('brands').insert({'brand_id': token, 'name': 'SYNC TEST BRAND', 'status': 'active'}).execute()
        db.table('products').insert({'product_id': token, 'category_id': token, 'brand_id': token,
            'product_name': 'SYNC TEST - disposable', 'price': 1000, 'original_price': 1000,
            'description': 'Disposable integration check', 'status': 'active'}).execute()
        db.table('product_variants').insert({'variant_id': token, 'product_id': token,
            'size': 'M', 'color': 'Blue', 'stock_quantity': 2, 'status': 'active'}).execute()
        revision = await verify('create', lambda p: len(p) == 1)
        assert recovery['disconnected'] and recovery['successful_claim'] and not task.done()
        report['checks'].append({'case': 'socket_disconnect_then_real_supabase_claim', 'status': 'PASS'})
        before = points()[0].vector
        update('products', {'discount_price': 900})
        revision = await verify('price_metadata_vector_unchanged',
            lambda p: bool(p) and p[0].payload['price'] == 900 and p[0].vector == before, revision)
        for table, change, label, predicate in [
            ('products', {'status': 'inactive'}, 'inactive', lambda p: not p),
            ('products', {'status': 'active'}, 'reactivate', lambda p: bool(p)),
            ('product_variants', {'stock_quantity': 0}, 'zero_stock', lambda p: not p),
            ('product_variants', {'stock_quantity': 2}, 'restock', lambda p: bool(p)),
            ('categories', {'name': 'SYNC TEST CATEGORY CHANGED'}, 'category_rename',
             lambda p: bool(p) and p[0].payload['category'] == 'SYNC TEST CATEGORY CHANGED'),
            ('brands', {'name': 'SYNC TEST BRAND CHANGED'}, 'brand_rename',
             lambda p: bool(p) and p[0].payload['brand'] == 'SYNC TEST BRAND CHANGED'),
            ('categories', {'status': 'inactive'}, 'category_inactive', lambda p: not p),
            ('categories', {'status': 'active'}, 'category_reactivate', lambda p: bool(p)),
        ]:
            update(table, change)
            revision = await verify(label, predicate, revision)
        db.table('product_variants').delete().eq('variant_id', token).execute()
        db.table('products').delete().eq('product_id', token).execute()
        await verify('delete_product', lambda p: not p, revision)
    finally:
        try:
            for table in ('product_variants', 'products', 'categories', 'brands'):
                db.table(table).delete().eq(ids[table], token).execute()
            # Let the real worker ACK the deletion; retain the processed outbox
            # row as an audit record (service role has no queue DELETE grant).
            await verify('cleanup_queue_and_point', lambda p: not p)
            report['cleanup'] = 'PASS; processed queue audit row retained'
        finally:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass
            report['finished_at'] = datetime.now(timezone.utc).isoformat()
            report_path.write_text(json.dumps(report, indent=2), encoding='utf-8')
            print('Report: ' + str(report_path), flush=True)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--execute', action='store_true', required=True)
    parser.parse_args()
    logging.basicConfig(level=logging.WARNING)
    asyncio.run(check())

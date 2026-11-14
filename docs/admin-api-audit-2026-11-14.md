# Admin API audit — 2026-11-14

Scope: admin products, categories, customers, staff, profile/session, permissions, orders, product promotions and vouchers. Dashboard and support chat excluded. Existing workspace edits were preserved.

## Review and verification

- Compared frontend service URLs/methods with auth/product/order routes and gateway mounts; reviewed request/response handling and authorization middleware.
- Reviewed list/detail/create/update/status/export flows where exposed by the admin UI.
- `npm run test:admin`: 91 passing tests, zero failures. Includes mocked service tests, category/product HTTP multipart tests, authorization tests, and ten new promotion/voucher regressions. These are NOT 91 live endpoint checks.
- `npm run build --prefix frontend`: passed; bundle-size warning remains.
- Targeted ESLint on four promotion pages: fails on React Hooks/set-state-in-effect, dependency and existing code-cleanliness findings. Build success does not imply lint success.
- No listeners were found on local ports 5173/8000/8001/8002/8003 during this audit. Live authenticated CRUD, real database constraints, storage uploads and real exported data were not verified. No production records were changed by the tests.

## Fixes

1. Removed local/mock success fallback from promotion/voucher create and update. Failed requests retain the form and show an error.
2. Removed cached/mock data fallback from promotion/voucher list and detail. Empty responses now clear the list; API failure is no longer presented as current data.
3. Voucher status failure now stops the UI update and success notification.
4. Removed concurrent add-items request during promotion update; the update endpoint already replaces product associations.
5. Recalculate prices for both previous and new promotion products, including removal of every product.
6. Validate replacement products before writing promotion metadata.
7. Preserve item eligibility when manually pausing/resuming a promotion. Newly created associations remain eligible while the parent controls activation.
8. `scope_type: all` resolves the currently active products into actual associations instead of an empty list. This is a snapshot at save time; future products are not automatically enrolled.
9. Load all voucher pages instead of silently truncating at 100 entries.
10. Validate voucher fields, dates, discount bounds and quantities; normalize codes, reject duplicate codes on update, return 404 for missing vouchers and protect IDs/usage counters from form payloads.
11. Increase order gateway proxy timeout to 65 seconds to accommodate the frontend's 60-second order requests.
12. Repair the product HTTP test's auth dependency mock and add the root `test:admin` command with the module-mocking flag required by order tests.

## Remaining limits

Live deployment verification is still required before asserting every admin API works against the configured database/storage. Existing promotion multi-write operations are not database transactions; these tests do not establish atomicity under database/network failure or concurrent writes. Previously corrupted promotion data is not migrated by this patch.

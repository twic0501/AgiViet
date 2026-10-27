#!/usr/bin/env node
// Kiểm thử bảo mật tầng DB trên lược đồ đã chốt (db/migrations 0001–0020).
// Trình tự: migrations -> db/seed -> db/tests/000_khung + 010 (lấy hàm test.* của nhóm DB) -> security/sql/fixture.sql
// -> các CA TẤN CÔNG, mỗi ca trong giao dịch riêng, kích hoạt ràng buộc hoãn rồi LUÔN hoàn lại (các ca độc lập)
// -> security/sql/bat-bien-so-cai.sql (mong 0 vi phạm).
//
//   phai_chan : thao tác nguy hiểm, DB phải từ chối. Không bị chặn => "LỖ HỔNG" (mã đề xuất ở docs/bao-mat/06).
//   phai_qua  : thao tác hợp lệ, DB phải cho (chống kiểm thử giả).
// Ca dùng safeIf: SQL tự RAISE 'AN_TOAN' khi DB hành xử đúng (cho hành vi không tự sinh lỗi).
//
// Chạy:  (cd db && npm ci)   # đã ghim @electric-sql/pglite 0.3.16
//        node security/tests/db/kiem-tra-db.mjs [--chi-bao-cao] [--chi-tiet]
//   hoặc  PGLITE_DIR=<.../node_modules/@electric-sql/pglite> node security/tests/db/kiem-tra-db.mjs
// Giới hạn: PGlite một kết nối => không kiểm đua điều kiện giữa hai phiên; chạy bằng vai owner => RLS/GRANT không có hiệu lực ở đây.
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', '..');
const dbDir = join(root, 'db');
const secSql = join(here, '..', '..', 'sql');
const onlyReport = process.argv.includes('--chi-bao-cao');
const verbose = process.argv.includes('--chi-tiet');

const pgliteDir = process.env.PGLITE_DIR || join(dbDir, 'node_modules', '@electric-sql', 'pglite');
if (!existsSync(join(pgliteDir, 'dist', 'index.js'))) { console.error(`Không thấy PGlite ở ${pgliteDir} (chạy: cd db && npm ci, hoặc đặt PGLITE_DIR).`); process.exit(2); }
const mod = (p) => import(pathToFileURL(join(pgliteDir, 'dist', p)).href);
const { PGlite } = await mod('index.js');
const { btree_gist } = await mod('contrib/btree_gist.js');
const { pgcrypto } = await mod('contrib/pgcrypto.js');
const db = new PGlite({ extensions: { btree_gist, pgcrypto } });
await db.query(`SET timezone = 'Asia/Ho_Chi_Minh'`);

async function load(label, file) {
  try { await db.exec('BEGIN;\n' + readFileSync(file, 'utf8') + '\nCOMMIT;'); }
  catch (e) { console.error(`LỖI ${label}: ${e.message}${e.where ? '\n' + e.where : ''}`); process.exit(2); }
}
const migs = readdirSync(join(dbDir, 'migrations')).filter((f) => /^\d{4}_.*\.sql$/.test(f)).sort();
for (const f of migs) await load(`migration ${f}`, join(dbDir, 'migrations', f));
for (const f of readdirSync(join(dbDir, 'seed')).filter((f) => f.endsWith('.sql')).sort()) await load(`seed ${f}`, join(dbDir, 'seed', f));
await load('db/tests/000_khung.sql', join(dbDir, 'tests', '000_khung.sql'));
await load('db/tests/010_du_lieu_va_khung.sql', join(dbDir, 'tests', '010_du_lieu_va_khung.sql'));
await load('security/sql/fixture.sql', join(secSql, 'fixture.sql'));
console.log(`Đã áp ${migs.length} migration (${migs[0]} … ${migs.at(-1)}), seed, khung kiểm thử và dữ liệu SEC.`);

const O1 = `test.id('sec-order:SEC-1')`, O2 = `test.id('sec-order:SEC-2')`;
const DEP1 = `test.id('sec-dep:SEC-1')`;
const B01 = `test.org('TC-B01')`, B02 = `test.org('TC-B02')`, M01 = `test.org('TC-M01')`;
const HELPER = `'7b7e6c93-4397-5ca8-9b31-2abed6d958ee'::uuid`;   // người giúp của TC-B01 trong seed
const OPS_A = `'d3f73755-f74c-5842-b5ee-5f11f28f0053'::uuid`;    // Bùi Thị Thảo (VH-DS lập)
const OPS_B = `'4010ec3c-2a8d-5033-972b-9bdf751f4166'::uuid`;    // Đỗ Minh Trí (VH-DS duyệt)
const ctx = (user, org, actor) => `SELECT test.context(${user ? `'${user}'` : 'NULL'}, ${org ? `'${org}'` : 'NULL'}, '${actor}');`;
const ctxId = (uid, actor) => `SELECT set_config('app.user_id', (${uid})::text, true), set_config('app.actor_kind', '${actor}', true);`;
const lines = (arr) => `jsonb_build_array(${arr.map((l) => `jsonb_build_object(${Object.entries(l).map(([k, v]) => `'${k}', ${v}`).join(', ')})`).join(', ')})`;
const post = (kind, order, idem, ls, approved = 'NULL', eff = 'now()') =>
  `SELECT ledger.post('${kind}', ${order}, '${idem}', 'thử bảo mật', ${lines(ls)}, ${eff}, NULL, ${approved});`;
const safeIf = (cond) => `DO $sec$ BEGIN IF ${cond} THEN RAISE EXCEPTION 'AN_TOAN'; END IF; END $sec$;`;
const bi = (code, kind, amount, targetOrg, basis = 'excess') =>
  `INSERT INTO core.bank_instructions (code, kind, deposit_id, order_id, basis_kind, basis_id, amount_vnd, target_org_id, target_bank_code, target_account_masked, target_account_holder)
   VALUES ('${code}', '${kind}', ${DEP1}, ${O1}, '${basis}', ${O1}, ${amount}, ${targetOrg}, '970436', '****9999', 'THU');`;
const confirm = (dp, result, amount, by, ref = 'NULL') =>
  `INSERT INTO core.direct_payment_confirmations (direct_payment_id, result, amount_vnd, bank_txn_ref, confirmed_by) VALUES (${dp}, '${result}', ${amount}, ${ref}, ${by});`;
const newBank = (id, org, by, hash, name = "'NGUYEN THI NAM'", match = 'true') =>
  `INSERT INTO pii.bank_accounts (id, org_id, bank_code, account_number_enc, account_number_hash, account_masked, holder_name, name_match, requested_by, verify_factors, key_id)
   VALUES (test.id('${id}'), ${org}, '970422', '\\x00'::bytea, decode(repeat('${hash}', 32), 'hex'), '****0000', ${name}, ${match}, ${by}, ARRAY['otp','video'], 'k1');`;
const evDoc = (code, sha) => `INSERT INTO core.documents (id, code, doc_type, owner_org_id, order_id, series_key, version_no, content_sha256, file_sha256, storage_key, mime_type, size_bytes)
   VALUES (test.id('${code}'), '${code}', 'evidence', ${B01}, ${O1}, '${code}', 1, digest('${sha}', 'sha256'), digest('${sha}-f', 'sha256'), 'sec/x', 'image/jpeg', 10); SELECT test.context(NULL, NULL, 'system'); UPDATE core.documents SET status = 'awaiting_signature' WHERE id = test.id('${code}');`;
const sig = (doc, party, signer, org, sha) => `INSERT INTO core.signatures (document_id, party, signer_user_id, signer_org_id, method, signed_sha256, otp_challenge_id, device_id)
   VALUES (test.id('${doc}'), '${party}', ${signer}, ${org}, 'otp', digest('${sha}', 'sha256'), 'SEC-OTP-X', 'dev-x');`;
// cột: seq, is_final, V, D, C, N, C_nb công thức, chi lần này, hoàn, T_bm, T_nb
const settleRow = (seq, fin, v, d, c, n, cnb, rel, ref, tbm, tnb) => `INSERT INTO core.settlements (order_id, seq, is_final, v_vnd, d_vnd, c_vnd, n_vnd, c_nb_formula_vnd, release_vnd, refund_vnd, t_bm_vnd, t_nb_vnd, inputs)
   VALUES (${O1}, ${seq}, ${fin}, ${v}, ${d}, ${c}, ${n}, ${cnb}, ${rel}, ${ref}, ${tbm}, ${tnb}, '{"sec":true}');`;
const toSettlement = ctx(null, null, 'system') + `UPDATE core.orders SET status = 'awaiting_settlement' WHERE id = ${O1};`;
const GOOD_SETTLE = [44350000, 0, 13800000, 44350000, 13800000, 13800000, 0, 30550000, 0];

const CASES = [
  // ---- Sổ cái
  { id: 'DB-01', kind: 'phai_chan', title: 'Giao dịch sổ cái không cân', sql: ctxId(OPS_A, 'ops') + post('manual_adjustment', 'NULL', 'x1', [{ type: "'suspense'", amount: 1000 }, { type: "'external_unidentified'", amount: -999 }], OPS_B) },
  { id: 'DB-02', kind: 'phai_chan', title: 'Sửa số tiền một bút toán đã ghi', sql: `UPDATE ledger.entries SET amount_vnd = amount_vnd * 10 WHERE id = (SELECT min(id) FROM ledger.entries);` },
  { id: 'DB-03', kind: 'phai_chan', title: 'Xóa giao dịch sổ cái', sql: `DELETE FROM ledger.transactions WHERE id = (SELECT id FROM ledger.transactions LIMIT 1);` },
  { id: 'DB-04', kind: 'phai_chan', title: 'Rút cọc quá số đang giữ (cọc âm)', sql: ctxId(OPS_A, 'ops') + post('manual_adjustment', O1, 'x4', [{ type: "'deposit_escrow'", order: O1, amount: -99000000 }, { type: "'external'", org: B01, amount: 99000000 }], OPS_B) },
  { id: 'DB-05', kind: 'phai_chan', title: 'Tự duyệt điều chỉnh tiền (người lập = người duyệt)', sql: ctxId(OPS_A, 'ops') + post('manual_adjustment', O1, 'x5', [{ type: "'deposit_escrow'", order: O1, amount: -1000 }, { type: "'external'", org: B01, amount: 1000 }], OPS_A) },
  { id: 'DB-06', kind: 'phai_chan', fix: 'D-04', title: 'Điều chỉnh tiền thủ công không có người duyệt', sql: ctxId(OPS_A, 'ops') + post('manual_adjustment', O1, 'x6', [{ type: "'deposit_escrow'", order: O1, amount: -1000 }, { type: "'external'", org: B01, amount: 1000 }]) },
  { id: 'DB-07', kind: 'phai_chan', fix: 'D-02', title: 'Khóa chống lặp sổ cái trùng nhưng nội dung khác bị nuốt im lặng', sql: ctxId(OPS_A, 'ops') +
      `DO $sec$ DECLARE a uuid; b uuid; BEGIN
         a := ledger.post('manual_adjustment', NULL, 'x7', 'a', '[{"type":"suspense","amount":1000},{"type":"external_unidentified","amount":-1000}]'::jsonb, now(), NULL, ${OPS_B});
         b := ledger.post('manual_adjustment', NULL, 'x7', 'b', '[{"type":"suspense","amount":5000000},{"type":"external_unidentified","amount":-5000000}]'::jsonb, now(), NULL, ${OPS_B});
       END $sec$;` },
  { id: 'DB-08', kind: 'phai_chan', fix: 'D-03', title: 'Giao dịch của đơn 1 chuyển cọc sang tài khoản cọc của đơn 2', sql: ctxId(OPS_A, 'ops') + post('manual_adjustment', O1, 'x8', [{ type: "'deposit_escrow'", order: O1, amount: -1000000 }, { type: "'deposit_escrow'", order: O2, amount: 1000000 }], OPS_B) },
  { id: 'DB-09', kind: 'phai_chan', fix: 'D-03', title: 'Chi cọc của đơn 1 cho tổ chức không thuộc đơn', sql: ctxId(OPS_A, 'ops') + post('manual_adjustment', O1, 'x9', [{ type: "'deposit_escrow'", order: O1, amount: -1000000 }, { type: "'external'", org: B02, amount: 1000000 }], OPS_B) },
  { id: 'DB-10', kind: 'phai_chan', fix: 'D-11', title: 'Ghi lùi ngày hiệu lực giao dịch về năm 2020', sql: ctxId(OPS_A, 'ops') + post('manual_adjustment', 'NULL', 'x10', [{ type: "'suspense'", amount: 1000 }, { type: "'external_unidentified'", amount: -1000 }], OPS_B, "'2020-01-01'::timestamptz") },
  { id: 'DB-11', kind: 'phai_qua', title: 'Điều chỉnh hợp lệ (cân, có người duyệt khác người lập)', sql: ctxId(OPS_A, 'ops') + post('manual_adjustment', 'NULL', 'x11', [{ type: "'suspense'", amount: 1000 }, { type: "'external_unidentified'", amount: -1000 }], OPS_B) },

  // ---- Đơn, cọc, sự kiện ngân hàng
  { id: 'DB-12', kind: 'phai_chan', title: 'Đơn chưa có cọc chuyển sang "hiệu lực" (vai system)', sql: ctx(null, null, 'system') + `UPDATE core.orders SET status = 'active' WHERE id = ${O2};` },
  { id: 'DB-13', kind: 'phai_chan', fix: 'D-01', title: 'Phiên tự khai actor_kind=bank ghi khoản báo có giả rồi kích hoạt đơn', sql: ctx(null, null, 'bank') + `SELECT sec.bank_receipt('fake13', 6969000, 'AGV SEC2 COC');` + ctx(null, null, 'system') + `UPDATE core.orders SET status = 'active' WHERE id = ${O2};` },
  { id: 'DB-14', kind: 'phai_qua', title: 'Cọc đủ (đường ngân hàng) rồi đơn chuyển "hiệu lực"', sql: ctx(null, null, 'bank') + `SELECT sec.bank_receipt('ok14', 6969000, 'AGV SEC2 COC');` + ctx(null, null, 'system') + `UPDATE core.orders SET status = 'active' WHERE id = ${O2};` },
  { id: 'DB-15', kind: 'phai_chan', title: 'Đơn đang giữ cọc, còn khoản trả thẳng mở mà chuyển "hoàn tất"', sql: toSettlement + `UPDATE core.orders SET status = 'completed' WHERE id = ${O1};` },
  { id: 'DB-16', kind: 'phai_chan', fix: 'D-08', title: 'Tiền cọc đến sau khi đơn đã đóng vẫn vào "cọc đang giữ" của đơn', sql: ctx(null, null, 'system') +
      `UPDATE core.orders SET status = 'closed', close_reason = 'deposit_expired' WHERE id = ${O2};` + ctx(null, null, 'bank') + `SELECT sec.bank_receipt('late16', 6969000, 'AGV SEC2 COC');` +
      safeIf(`NOT EXISTS (SELECT 1 FROM ledger.v_account_balances WHERE order_id = ${O2} AND account_type IN ('deposit_escrow','fee_held') AND balance_vnd > 0)`) },
  { id: 'DB-17', kind: 'phai_chan', fix: 'D-09', title: 'Chèn webhook chữ ký sai ở trạng thái "đã áp dụng"', sql: `INSERT INTO evt.inbound_webhooks (provider, provider_event_id, event_type, signature_valid, payload, processed_at, process_result) VALUES ('bank_sim','SEC-FAKE','credit',false,'{}'::jsonb, now(), 'applied');` },
  { id: 'DB-18', kind: 'phai_qua', title: 'Sự kiện ngân hàng lặp được bỏ qua, không ghi hai lần', sql: ctx(null, null, 'bank') + `DO $sec$ BEGIN IF core.apply_bank_event(test.id('sec-ev:dep1')) <> 'duplicate_ignored' THEN RAISE EXCEPTION 'ghi lap'; END IF; END $sec$;` },
  { id: 'DB-44', kind: 'phai_chan', fix: 'D-09', title: 'Khoản báo có chỉ có webhook (không có dấu đã tra lại API ngân hàng) vẫn được ghi sổ', sql: ctx(null, null, 'bank') + `SELECT sec.bank_receipt('norequery', 6969000, 'AGV SEC2 COC');` + safeIf(`NOT EXISTS (SELECT 1 FROM ledger.v_account_balances WHERE order_id = ${O2} AND account_type = 'deposit_escrow' AND balance_vnd > 0)`) },

  // ---- Trả thẳng
  { id: 'DB-19', kind: 'phai_chan', title: 'Người giúp xác nhận đã nhận tiền', sql: ctxId(HELPER, 'helper') + confirm(`test.id('sec-dp1')`, 'full', 32200000, HELPER) },
  { id: 'DB-20', kind: 'phai_chan', title: 'Bên mua (bên trả) tự xác nhận "người bán đã nhận đủ"', sql: ctx('Lê Thị Lan', 'TC-M01', 'buyer') + confirm(`test.id('sec-dp1')`, 'full', 32200000, `test.person('Lê Thị Lan')`) },
  { id: 'DB-20b', kind: 'phai_chan', fix: 'D-01', title: 'Phiên bên mua đặt confirmed_by = người bán và tự khai vai seller', sql: `SELECT set_config('app.user_id', test.person('Lê Thị Lan')::text, true), set_config('app.actor_kind','seller',true);` + confirm(`test.id('sec-dp1')`, 'full', 32200000, `test.person('Nguyễn Thị Năm')`) },
  { id: 'DB-21', kind: 'phai_chan', title: 'Đổi thẳng trạng thái khoản trả thẳng sang "đã nhận đủ" không có xác nhận', sql: ctx('Lê Thị Lan', 'TC-M01', 'buyer') + `UPDATE core.direct_payments SET status = 'fully_received' WHERE id = test.id('sec-dp1');` },
  { id: 'DB-22', kind: 'phai_chan', title: 'Một mã giao dịch ngân hàng xác nhận cho hai khoản khác nhau', sql: ctx(null, null, 'system') +
      `INSERT INTO core.direct_payments (id, code, order_id, kind, direction, payer_org_id, payee_org_id, amount_due_vnd, due_trigger, status) VALUES (test.id('sec-dp1b'), 'SEC-TT1B', ${O1}, 'goods_extra', 'buyer_to_seller', ${M01}, ${B01}, 2000000, 'order_active', 'due');` +
      ctx('Nguyễn Thị Năm', 'TC-B01', 'seller') + confirm(`test.id('sec-dp1')`, 'partial', 1000000, `test.person('Nguyễn Thị Năm')`, "'FT-DUP'") + confirm(`test.id('sec-dp1b')`, 'partial', 1000000, `test.person('Nguyễn Thị Năm')`, "'FT-DUP'") },
  { id: 'DB-23', kind: 'phai_chan', title: 'Xác nhận vượt số phải trả', sql: ctx('Nguyễn Thị Năm', 'TC-B01', 'seller') + confirm(`test.id('sec-dp1')`, 'partial', 40000000, `test.person('Nguyễn Thị Năm')`) },
  { id: 'DB-24', kind: 'phai_qua', title: 'Người bán (chủ) xác nhận nhận đủ đúng số, có mã giao dịch', sql: ctx('Nguyễn Thị Năm', 'TC-B01', 'seller') + confirm(`test.id('sec-dp1')`, 'full', 32200000, `test.person('Nguyễn Thị Năm')`, "'FT-OK'") },
  { id: 'DB-45', kind: 'phai_chan', fix: 'D-10', title: 'Xác nhận "đã nhận đủ" chuyển khoản không có mã giao dịch ngân hàng (không chống trùng được)', sql: ctx('Nguyễn Thị Năm', 'TC-B01', 'seller') + confirm(`test.id('sec-dp1')`, 'full', 32200000, `test.person('Nguyễn Thị Năm')`) },

  // ---- Lệnh ngân hàng
  { id: 'DB-25', kind: 'phai_chan', title: 'Đổi số tiền/đích lệnh ngân hàng sau khi tạo', sql: ctx(null, null, 'system') + bi('SEC-BI-1', 'refund_deposit_to_buyer', 1000000, M01) + `UPDATE core.bank_instructions SET target_account_masked = '****1111', amount_vnd = 13000000 WHERE code = 'SEC-BI-1';` },
  { id: 'DB-26', kind: 'phai_chan', title: 'Hai lệnh cùng căn cứ, cùng loại đang hiệu lực (chi hai lần)', sql: ctx(null, null, 'system') + bi('SEC-BI-2', 'release_deposit_to_seller', 1000000, B01) + bi('SEC-BI-3', 'release_deposit_to_seller', 1000000, B01) },
  { id: 'DB-27', kind: 'phai_chan', title: 'Lệnh chi vượt cọc đang giữ', sql: ctx(null, null, 'system') + bi('SEC-BI-4', 'release_deposit_to_seller', 50000000, B01) },
  { id: 'DB-28', kind: 'phai_chan', fix: 'D-12', title: 'Lệnh chi cọc người bán trỏ tới tổ chức khác', sql: ctx(null, null, 'system') + bi('SEC-BI-5', 'release_deposit_to_seller', 1000000, B02) },
  { id: 'DB-29', kind: 'phai_chan', fix: 'D-12', title: 'Hoàn cọc bên mua trỏ tới tổ chức người bán', sql: ctx(null, null, 'system') + bi('SEC-BI-6', 'refund_deposit_to_buyer', 1000000, B01) },

  // ---- Tài khoản nhận tiền, người giúp
  { id: 'DB-30', kind: 'phai_chan', title: 'Kích hoạt tài khoản nhận tiền mới trước khi hết thời gian chờ', sql: ctx('Nguyễn Thị Năm', 'TC-B01', 'seller') + newBank('sec-bank30', B01, `test.person('Nguyễn Thị Năm')`, 'cd') + ctx(null, null, 'system') +
      `UPDATE pii.bank_accounts SET status = 'cooling_down' WHERE id = test.id('sec-bank30'); UPDATE pii.bank_accounts SET status = 'replaced' WHERE org_id = ${B01} AND status = 'active'; UPDATE pii.bank_accounts SET status = 'active', activated_at = now() WHERE id = test.id('sec-bank30');` },
  { id: 'DB-31', kind: 'phai_chan', title: 'Người giúp lập yêu cầu đổi tài khoản nhận tiền (khai đúng vai helper)', sql: ctxId(HELPER, 'helper') + newBank('sec-bank31', B01, HELPER, 'ef', "'NGUYEN VAN TEO'") },
  { id: 'DB-31b', kind: 'phai_chan', title: 'Người giúp tự khai vai seller để lập yêu cầu đổi tài khoản', sql: ctxId(HELPER, 'seller') + newBank('sec-bank31b', B01, HELPER, 'ee', "'NGUYEN VAN TEO'") },
  { id: 'DB-32', kind: 'phai_chan', title: 'Kích hoạt tài khoản có tên chủ không khớp', sql: ctx('Nguyễn Thị Năm', 'TC-B01', 'seller') + newBank('sec-bank32', B01, `test.person('Nguyễn Thị Năm')`, 'aa', "'TEN KHAC'", 'false') + ctx(null, null, 'system') +
      `UPDATE pii.bank_accounts SET status = 'cooling_down' WHERE id = test.id('sec-bank32'); UPDATE pii.bank_accounts SET status = 'replaced' WHERE org_id = ${B01} AND status = 'active'; UPDATE pii.bank_accounts SET status = 'active', activated_at = now() WHERE id = test.id('sec-bank32');` },
  { id: 'DB-33', kind: 'phai_chan', title: 'Ủy quyền cho người giúp quyền ký', sql: `INSERT INTO core.delegations (org_id, principal_user_id, helper_user_id, actions, valid_during) VALUES (${B02}, test.person('Trần Văn Sáu'), ${HELPER}, ARRAY['view','contract.sign'], tstzrange(now(), now() + interval '1 day'));` },
  { id: 'DB-34', kind: 'phai_chan', fix: 'D-14', title: 'Người đang là người giúp được gán thêm vai chủ (owner) trong cùng tổ chức (đường vòng K17)', sql: ctx('Nguyễn Thị Năm', 'TC-B01', 'seller') +
      `INSERT INTO core.memberships (id, org_id, user_id, status) VALUES (test.id('sec-m34'), ${B01}, ${HELPER}, 'active') ON CONFLICT (org_id, user_id) DO UPDATE SET status = 'active';
       INSERT INTO core.membership_roles (membership_id, role_code, granted_by) SELECT id, 'owner', test.person('Nguyễn Thị Năm') FROM core.memberships WHERE org_id = ${B01} AND user_id = ${HELPER};` },

  // ---- Chữ ký, tài liệu
  { id: 'DB-35', kind: 'phai_chan', title: 'Chữ ký trên mã băm khác tài liệu', sql: evDoc('SEC-EV-35', 'ev35') + ctx('Nguyễn Thị Năm', 'TC-B01', 'seller') + sig('SEC-EV-35', 'seller', `test.person('Nguyễn Thị Năm')`, B01, 'ban-da-sua') },
  { id: 'DB-36', kind: 'phai_chan', title: 'Người giúp ký (khai đúng vai helper)', sql: evDoc('SEC-EV-36', 'ev36') + ctxId(HELPER, 'helper') + "SELECT set_config('app.org_id', test.org('TC-B01')::text, true);" + sig('SEC-EV-36', 'seller', HELPER, B01, 'ev36') },
  { id: 'DB-37', kind: 'phai_chan', fix: 'D-15', title: 'Ghi chữ ký OTP của người khác (người ký ≠ người đang thao tác, mã OTP bịa)', sql: evDoc('SEC-EV-37', 'ev37') + ctx('Lê Thị Lan', 'TC-M01', 'buyer') + sig('SEC-EV-37', 'seller', `test.person('Nguyễn Thị Năm')`, B01, 'ev37') },
  { id: 'DB-37b', kind: 'phai_chan', fix: 'D-15', title: 'Chữ ký OTP đúng người nhưng mã thử thách OTP bịa (DB không biết OTP đã xác minh chưa)', sql: evDoc('SEC-EV-37B', 'ev37b') + ctx('Nguyễn Thị Năm', 'TC-B01', 'seller') + sig('SEC-EV-37B', 'seller', `test.person('Nguyễn Thị Năm')`, B01, 'ev37b') },
  { id: 'DB-38', kind: 'phai_chan', title: 'Phiên bản tài liệu trỏ sai mã băm bản trước', sql: evDoc('SEC-EV-38', 'ev38') +
      `INSERT INTO core.documents (code, doc_type, owner_org_id, order_id, series_key, version_no, prev_document_id, prev_content_sha256, content_sha256, file_sha256, storage_key, mime_type, size_bytes)
       VALUES ('SEC-EV-38-v2', 'evidence', ${B01}, ${O1}, 'SEC-EV-38', 2, test.id('SEC-EV-38'), digest('khac', 'sha256'), digest('v2', 'sha256'), digest('v2f', 'sha256'), 'sec/x', 'image/jpeg', 10);` },
  { id: 'DB-39', kind: 'phai_chan', title: 'Sửa tài liệu đã lưu', sql: `UPDATE core.documents SET storage_key = 's3://gia' WHERE id = test.id('sec-doc:SEC-1');` },

  // ---- Căn cứ lệnh
  { id: 'DB-46', kind: 'phai_chan', fix: 'D-17', title: 'Lệnh hoàn cho bên mua với căn cứ "excess" bịa (không có khoản nộp thừa thật)', sql: ctx(null, null, 'system') + bi('SEC-BI-7', 'refund_excess', 500000, M01) },
  // Quyết toán: công thức, quyết toán cuối duy nhất, khớp đầu vào với sổ cái đã được db/tests/050 và trigger 0013/0021 kiểm;
  // dựng đợt giao đóng cần QR, chuyến, nghiệm thu (xem db/tests/030) nên không lặp lại ở đây.
];

const results = [];
for (const c of CASES) {
  let blocked = false, msg = '';
  try {
    await db.exec('BEGIN;\n' + c.sql);
    await db.exec('SET CONSTRAINTS ALL IMMEDIATE;');
  } catch (e) { blocked = true; msg = e.message; }
  try { await db.exec('ROLLBACK;'); } catch {}
  results.push({ ...c, blocked, msg });
}

let holes = 0, wrongBlock = 0;
console.log('\nKết quả ca tấn công:');
for (const r of results) {
  let verdict;
  if (r.kind === 'phai_chan') { verdict = r.blocked ? 'CHẶN' : 'LỖ HỔNG'; if (!r.blocked) holes++; }
  else { verdict = r.blocked ? 'SAI(chặn nhầm)' : 'QUA'; if (r.blocked) wrongBlock++; }
  const why = r.blocked && (verbose || r.kind === 'phai_qua') ? `\n             -> ${r.msg.split('\n')[0].slice(0, 160)}` : '';
  console.log(`  ${verdict.padEnd(8)} ${r.id.padEnd(6)} ${r.title}${!r.blocked && r.fix ? `  [${r.fix}]` : ''}${why}`);
}

console.log('\nBất biến (security/sql/bat-bien-so-cai.sql):');
const inv = readFileSync(join(secSql, 'bat-bien-so-cai.sql'), 'utf8').split(/^-- @kiem /m).slice(1);
let invBad = 0, invSkip = 0;
for (const block of inv) {
  const [head, ...rest] = block.split('\n');
  const sql = rest.join('\n').replace(/^--.*$/gm, '').trim();
  try {
    const r = await db.query(sql);
    if (r.rows.length) { invBad++; console.log(`  VI PHẠM ${head} (${r.rows.length} dòng)`); }
    else console.log(`  đạt     ${head}`);
  } catch (e) { invSkip++; console.log(`  bỏ qua  ${head}: ${e.message.split('\n')[0]}`); }
}
const nb = results.filter((r) => r.kind === 'phai_chan').length;
console.log(`\nTổng: ${results.length} ca (${nb} phải chặn, ${results.length - nb} phải qua). Bị chặn đúng: ${nb - holes}. LỖ HỔNG: ${holes}. Chặn nhầm: ${wrongBlock}. Bất biến vi phạm: ${invBad}, bỏ qua: ${invSkip}.`);
process.exit(wrongBlock || invBad ? 1 : holes && !onlyReport ? 1 : 0);

-- Hồi quy theo rà soát commit 70611c2: kiểm QUA LỆNH NGHIỆP VỤ, không chèn số sẵn vào bảng.
SELECT set_config('app.test_time','2026-11-04 07:00+07',true);

-- Kịch bản N08 dựng lại cho một đơn bất kỳ: đã cọc, trả trước 32.200.000, nghiệm thu 4 dòng,
-- dòng 3 tranh chấp chất lượng 100 kg, bên mua ứng phí kiểm định 280.000.
CREATE FUNCTION test.e1_kich_ban(k text, p_policy smallint) RETURNS void LANGUAGE plpgsql AS $f$ BEGIN
 PERFORM test.command_order(k,'TC-M01','Trần Thu Hà','spot'); -- chụp tài khoản nhận tiền hiện hành của người bán
 PERFORM test.sign_order(k,'TC-M01','Trần Thu Hà');
 UPDATE core.orders SET policy_version=p_policy WHERE id=test.id(k);
 PERFORM test.fund_order(k);
 INSERT INTO core.direct_payments(id,code,order_id,kind,direction,payer_org_id,payee_org_id,amount_due_vnd,due_trigger,status)
  VALUES(test.id(k||':goods'),'TEST-'||k||'-GOODS',test.id(k),'goods_after_days','buyer_to_seller',test.org('TC-M01'),test.org('TC-B01'),32200000,'after_days','due');
 PERFORM test.context('Nguyễn Thị Năm','TC-B01','seller');
 INSERT INTO core.direct_payment_confirmations(direct_payment_id,result,amount_vnd,confirmed_by,bank_txn_ref,otp_challenge_id)
  VALUES(test.id(k||':goods'),'full',32200000,ref.ctx_user(),k||'-GOODS',test.payment_otp(test.id(k||':goods'),32200000,ref.ctx_user()));
 PERFORM test.start_delivery(k,1,2000000,'TC-M01','Võ Hoàng Phúc');
 INSERT INTO core.acceptance_lines(id,acceptance_id,line_no,lot_id,kind,qty,payable_qty,unit_price_vnd,value_vnd,reason_code,evidence_document_id)
 SELECT test.id(k||':line:'||n),test.id(k||':accept:1'),n,test.id(k||':lot'),kind,qty,payable,price,value,reason,test.id(k||':bbnt:1') FROM (VALUES
  (1::smallint,'accepted',1750000,1750000,23000,40250000,NULL::text),
  (2::smallint,'downgraded',120000,120000,15000,1800000,'TRAY_VO'),
  (3::smallint,'rejected',100000,0,0,0,'DAP'),
  (4::smallint,'rejected',30000,0,0,0,'DAP'))t(n,kind,qty,payable,price,value,reason);
 PERFORM test.context('Nguyễn Thị Năm','TC-B01','seller');
 UPDATE core.acceptance_lines SET status='closed' WHERE acceptance_id=test.id(k||':accept:1') AND line_no<>3;
 PERFORM test.context('Võ Hoàng Phúc','TC-M01','buyer');
 UPDATE core.acceptance_lines SET status='disputed' WHERE id=test.id(k||':line:3');
 INSERT INTO core.disputes(id,line_id,order_id,disputed_qty,opened_by,reason,claim_kind)
  VALUES(test.id(k||':dispute'),test.id(k||':line:3'),test.id(k),100000,ref.ctx_user(),'Khác mẫu','quality');
 INSERT INTO core.inspections(id,delivery_id,dispute_id,provider_org_id,kind,fee_vnd,prepaid_by_org_id,due_at)
  VALUES(test.id(k||':inspection'),test.id(k||':batch:1'),test.id(k||':dispute'),test.org('DT-KD'),'sample',280000,test.org('TC-M01'),now()+interval '1 day');
 PERFORM test.context(NULL,NULL,'system');
END $f$;

-- 1) E1 qua cmd.create_settlement, đơn chính sách 23.
SELECT test.e1_kich_ban('R59A',23::smallint);
SELECT set_config('test.r59.a',test.id('R59A')::text,false);
SELECT test.as_login('db_test_system',$$SELECT set_config('test.r59.sa',cmd.create_settlement(current_setting('test.r59.a')::uuid,false,'R59A-TAM')::text,false)$$);
SELECT test.check('R1 lệnh quyết toán chạy được trên đơn bản 23 (không còn lỗi ck_st_interim)',
 EXISTS(SELECT 1 FROM core.settlements WHERE id=current_setting('test.r59.sa')::uuid));
SELECT test.check('R1 khoản giữ thêm = 0, phiên bản công thức 3',
 (SELECT additional_hold_vnd=0 AND hold_formula_version=3 FROM core.settlements WHERE id=current_setting('test.r59.sa')::uuid));
SELECT test.check('R1 chi đủ phần công nhận: release = min(C, V−D) trừ phần đã chi',
 (SELECT release_vnd=ledger.interim_release(v_vnd,d_vnd,c_vnd,0,prior_released_vnd) AND release_vnd>0 FROM core.settlements WHERE id=current_setting('test.r59.sa')::uuid));
SELECT test.check('R1 lệnh chi cho người bán tạo đúng số đã tính',
 (SELECT b.amount_vnd=s.release_vnd AND b.kind='release_deposit_to_seller' FROM core.bank_instructions b JOIN core.settlements s ON s.id=b.basis_id WHERE s.id=current_setting('test.r59.sa')::uuid));
SELECT test.check('R1 khoản đòi thêm 280.000 vẫn ghi, chưa bảo đảm',
 core.dispute_claim_amount(test.id('R59A'))=280000 AND EXISTS(SELECT 1 FROM core.v_unsecured_claims WHERE order_id=test.id('R59A') AND inspection_fee_vnd=280000));

-- 2) Đơn chính sách cũ (ký trước bản 23): vẫn giữ 280.000 theo điều khoản đã ký.
SELECT test.e1_kich_ban('R59B',22::smallint);
SELECT set_config('test.r59.b',test.id('R59B')::text,false);
SELECT test.as_login('db_test_system',$$SELECT set_config('test.r59.sb',cmd.create_settlement(current_setting('test.r59.b')::uuid,false,'R59B-TAM')::text,false)$$);
SELECT test.check('R2 đơn cũ giữ chính sách cũ: giữ 280.000, phiên bản công thức 2',
 (SELECT additional_hold_vnd=280000 AND hold_formula_version=2 FROM core.settlements WHERE id=current_setting('test.r59.sb')::uuid));
SELECT test.check('R2 chênh lệch hai đơn đúng bằng khoản giữ',
 (SELECT a.release_vnd-b.release_vnd=280000 FROM core.settlements a, core.settlements b WHERE a.id=current_setting('test.r59.sa')::uuid AND b.id=current_setting('test.r59.sb')::uuid));
SELECT test.check('R2 đơn có trước migration 0059 mang chính sách 22',
 NOT EXISTS(SELECT 1 FROM core.orders WHERE created_at<(SELECT applied_at FROM public.schema_migrations WHERE name LIKE '0059%') AND policy_version<>22));
SELECT test.expect_error('R2 vai runtime không có quyền sửa đơn trực tiếp (gồm chính sách)',
 $$SELECT test.as_login('db_test_system','UPDATE core.orders SET policy_version=22 WHERE id=current_setting(''test.r59.a'')::uuid')$$,'permission denied');

-- 3) Liên lạc khảo sát: đúng người gọi, đúng khung giờ.
INSERT INTO core.survey_visits(id,lot_id,buyer_org_id,seller_org_id,visitor_user_ids,visit_window,requested_by,seller_consented_by,seller_consented_at)
VALUES(test.id('KS:dang'),(SELECT id FROM core.lots WHERE seller_org_id=test.org('TC-B01') ORDER BY code LIMIT 1),test.org('TC-M01'),test.org('TC-B01'),
 ARRAY[test.person('Võ Hoàng Phúc')],tstzrange(ref.clock_at()-interval '1 hour',ref.clock_at()+interval '5 hours'),test.person('Võ Hoàng Phúc'),test.person('Nguyễn Thị Năm'),ref.clock_at()-interval '1 day'),
 (test.id('KS:sau'),(SELECT id FROM core.lots WHERE seller_org_id=test.org('TC-B01') ORDER BY code LIMIT 1),test.org('TC-M01'),test.org('TC-B01'),
 ARRAY[test.person('Võ Hoàng Phúc')],tstzrange(ref.clock_at()+interval '12 hours',ref.clock_at()+interval '16 hours'),test.person('Võ Hoàng Phúc'),test.person('Nguyễn Thị Năm'),ref.clock_at()-interval '1 day');
SELECT test.context('Trần Thu Hà','TC-M01','buyer');
SELECT test.expect_error('R3 người bên mua KHÔNG có tên đi khảo sát không đọc được liên lạc người bán',
 $$SELECT pii.read_survey_contact(test.id('KS:dang'),test.person('Nguyễn Thị Năm'))$$,'KHONG_CO_QUYEN');
SELECT test.context('Võ Hoàng Phúc','TC-M01','buyer');
SELECT test.expect_ok('R3 người đến đã khai đọc được liên lạc người bán trong khung giờ',
 $$SELECT pii.read_survey_contact(test.id('KS:dang'),test.person('Nguyễn Thị Năm'))$$);
SELECT test.expect_error('R3 trước khung giờ 12 tiếng: chưa mở',
 $$SELECT pii.read_survey_contact(test.id('KS:sau'),test.person('Nguyễn Thị Năm'))$$,'CONTACT_LOCKED');
SELECT test.context('Nguyễn Thị Năm','TC-B01','seller');
SELECT test.expect_error('R3 người bán không đọc liên lạc người bên mua không đi khảo sát',
 $$SELECT pii.read_survey_contact(test.id('KS:dang'),test.person('Trần Thu Hà'))$$,'KHONG_CO_QUYEN');
SELECT test.context(NULL,NULL,'system');

-- 4) Ký thay bên mua trên đơn bản 23: kiểm qua đúng chuỗi lệnh TH-040b ở tests/175 (V23FM).

-- ---------- Hồi quy theo Codex rà d37991a ----------
-- P1-1: đơn đã quyết toán theo E1 không hạ về chính sách cũ; hàm sửa dữ liệu trả đơn về 23.
-- (Rà 1614c70) Luật đúng: phân loại theo LÚC KÝ, không theo công thức đã chạy.
SELECT test.expect_ok('P1-1b đơn ký trước khi E1 có hiệu lực về 22 dù đã có quyết toán công thức 3', $$DO $b$ BEGIN
 SET LOCAL session_replication_role=replica; -- giả lập: chữ ký hai bên của R59A có trước 0058
 UPDATE core.signatures SET signed_at=(SELECT applied_at FROM public.schema_migrations WHERE name LIKE '0058%')-interval '1 day'
  WHERE document_id=(SELECT document_id FROM core.order_versions WHERE order_id=test.id('R59A') AND version_no=1);
 SET LOCAL session_replication_role=origin;
 PERFORM core.backfill_order_policy();
 IF (SELECT policy_version FROM core.orders WHERE id=test.id('R59A'))<>22 THEN RAISE EXCEPTION 'đơn ký trước E1 không về 22'; END IF;
 IF NOT EXISTS(SELECT 1 FROM core.settlements WHERE order_id=test.id('R59A') AND hold_formula_version=3) THEN RAISE EXCEPTION 'lịch sử quyết toán bị sửa'; END IF;
 RAISE EXCEPTION 'hoàn tác' USING ERRCODE='T0002';
EXCEPTION WHEN SQLSTATE 'T0002' THEN NULL;
END $b$;$$);
SELECT test.expect_ok('P1-1 hàm sửa dữ liệu trả đơn E1 về 23, không đụng đơn cũ thật', $$DO $b$ BEGIN
 -- Giả lập dữ liệu lệch do 0059 để lại (bỏ qua trigger chỉ trong lệnh thử này).
 SET LOCAL session_replication_role=replica;
 UPDATE core.orders SET policy_version=22 WHERE id=test.id('R59A');
 SET LOCAL session_replication_role=origin;
 PERFORM core.backfill_order_policy();
 IF (SELECT policy_version FROM core.orders WHERE id=test.id('R59A'))<>23 THEN RAISE EXCEPTION 'không trả về 23'; END IF;
END $b$;$$);
-- Ghi chú: R59B là đơn "cũ" giả lập nhưng được tạo sau 0058, nên theo luật Codex chốt (đơn tạo khi E1 đã hiệu lực là đơn E1)
-- hàm sửa dữ liệu sẽ trả về 23; không dùng R59B để kiểm nhánh "đơn cũ thật".
-- P1-2: không có NULL trong danh sách người đến.
SELECT test.expect_error('P1-2 danh sách người đến không chứa NULL',
 $$UPDATE core.survey_visits SET visitor_user_ids=ARRAY[test.person('Võ Hoàng Phúc'),NULL::uuid] WHERE id=test.id('KS:dang')$$,'ck_survey_visitors_no_null');
-- P1-3: người đến bị khóa không đọc được; người bán không đọc được số của tài khoản bị khóa.
CREATE FUNCTION test.p13_lot() RETURNS text LANGUAGE plpgsql AS $f$ DECLARE r text:='';
BEGIN
 UPDATE core.users SET disabled_at=now() WHERE id=test.person('Võ Hoàng Phúc');
 PERFORM test.context('Võ Hoàng Phúc','TC-M01','buyer');
 BEGIN PERFORM pii.read_survey_contact(test.id('KS:dang'),test.person('Nguyễn Thị Năm')); r:=r||'nguoi-bi-khoa-doc-duoc;'; EXCEPTION WHEN OTHERS THEN NULL; END;
 PERFORM test.context('Nguyễn Thị Năm','TC-B01','seller');
 BEGIN PERFORM pii.read_survey_contact(test.id('KS:dang'),test.person('Võ Hoàng Phúc')); r:=r||'lo-so-tai-khoan-bi-khoa;'; EXCEPTION WHEN OTHERS THEN NULL; END;
 UPDATE core.users SET disabled_at=NULL WHERE id=test.person('Võ Hoàng Phúc');
 PERFORM test.context(NULL,NULL,'system');
 RETURN r;
END $f$;
SELECT test.check('P1-3 tài khoản bị khóa không đọc và không bị lộ liên lạc khảo sát',test.p13_lot()='');

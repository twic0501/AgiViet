-- Hồi quy 0074: chỉ rút lời chào khi bên kia chưa trả lời (quy trình B3).
SELECT set_config('app.test_time','',true);
-- Lô đang bán của TC-B01 chưa có lời chào mở từ TC-M01; giá chào trên giá thấp nhất để không tự từ chối
SELECT set_config('test.r.lot',(SELECT l.id::text FROM core.lots l WHERE l.seller_org_id=test.org('TC-B01') AND l.status='on_sale'
  AND NOT EXISTS(SELECT 1 FROM core.offers o WHERE o.lot_id=l.id AND o.buyer_org_id=test.org('TC-M01') AND o.status='sent')
  AND EXISTS(SELECT 1 FROM ledger.qty_balances q WHERE q.lot_id=l.id AND q.bucket='available' AND q.qty>=20000) ORDER BY l.code LIMIT 1),false);
SELECT set_config('test.r.gia',coalesce((SELECT (floor_price_vnd+1000)::text FROM core.lot_price_versions WHERE lot_id=current_setting('test.r.lot')::uuid ORDER BY id DESC LIMIT 1),'30000'),false);
SELECT test.check('Tiền đề 0074: có lô đang bán để chào',coalesce(current_setting('test.r.lot',true),'') <> '');

-- 1) Lời chào chưa ai trả lời: bên gửi rút được
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.r.a',cmd.send_offer('R0074A',current_setting('test.r.lot')::uuid,NULL,test.org('TC-M01'),'buyer_bid',current_setting('test.r.gia')::bigint,10000)::text,false)$$);
SELECT test.as_login('db_test_buyer',$$SELECT cmd.reply_offer(current_setting('test.r.a')::uuid,'withdraw')$$);
SELECT test.check('0074 chưa có trả lời: bên gửi rút được',EXISTS(SELECT 1 FROM core.offers WHERE code='R0074A' AND status='withdrawn'));

-- 2) Bên kia đã trả giá: bên gửi KHÔNG rút được, lời chào vẫn mở
SELECT test.as_login('db_test_buyer',$$SELECT set_config('test.r.b',cmd.send_offer('R0074B',current_setting('test.r.lot')::uuid,NULL,test.org('TC-M01'),'buyer_bid',current_setting('test.r.gia')::bigint,10000)::text,false)$$);
SELECT test.as_login('db_test_seller',$$SELECT cmd.reply_offer(current_setting('test.r.b')::uuid,'counter',current_setting('test.r.gia')::bigint+500,10000)$$);
SELECT test.as_login('db_test_buyer',$$SELECT test.expect_error('0074 đã có trả giá: bên gửi không rút được','SELECT cmd.reply_offer(current_setting(''test.r.b'')::uuid,''withdraw'')','ck_offer_withdraw_replied')$$);
SELECT test.check('0074 lời chào đã có trả giá vẫn mở, đúng 2 vòng',EXISTS(SELECT 1 FROM core.offers WHERE code='R0074B' AND status='sent' AND current_round=2));
-- Đường đúng sau khi bên kia trả giá: từ chối (không bán/không mua) vẫn làm được
SELECT test.as_login('db_test_buyer',$$SELECT cmd.reply_offer(current_setting('test.r.b')::uuid,'reject')$$);
SELECT test.check('0074 sau trả giá vẫn từ chối được',EXISTS(SELECT 1 FROM core.offers WHERE code='R0074B' AND status='rejected'));

-- Hồi quy 0075: đăng trước mùa (D10) khi vườn còn cách ly; hàng có ngay vẫn bị chặn.
DELETE FROM cmd.test_clock;
SELECT set_config('app.test_time','',true);
SELECT set_config('test.ly.site',(SELECT site_id::text FROM core.lots WHERE code='L-0412'),true),
 set_config('test.ly.product',(SELECT product_id::text FROM core.lots WHERE code='L-0412'),true),
 set_config('test.ly.today',((now() AT TIME ZONE 'Asia/Ho_Chi_Minh')::date)::text,true);
-- Phun hôm nay, cách ly 7 ngày → hết cách ly hôm nay + 7
SELECT test.as_login('db_test_seller',$$SELECT cmd.record_cultivation(current_setting('test.ly.site')::uuid,jsonb_build_object('occurred_on',current_setting('test.ly.today')::date,'activity','spray','note','Thuốc ảo kiểm 0075','medicine_name','Mẫu ảo','withdrawal_days',7),'LY75-SPRAY')$$);
SELECT set_config('test.ly.base',jsonb_build_object('site_id',current_setting('test.ly.site')::uuid,'product_id',current_setting('test.ly.product')::uuid,'profile_version',1,'grade_code','L1','qty_basis','estimated','declared_qty',500000)::text,true);
CREATE FUNCTION pg_temp.lo_ly(ma text,them jsonb) RETURNS uuid LANGUAGE sql AS $$
 SELECT test.as_login('db_test_seller',format('SELECT cmd.create_lot(%L::jsonb)',current_setting('test.ly.base')::jsonb||jsonb_build_object('code',ma)||them))::uuid $$;
-- 1. Có hàng ngay, còn cách ly → chặn
SELECT set_config('test.ly.a',pg_temp.lo_ly('LY75-NGAY','{}')::text,true);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('0075 hàng có ngay khi còn cách ly bị chặn',
 'SELECT cmd.publish_lot(current_setting(''test.ly.a'')::uuid,23000,20000)','ck_lot_withdrawal')$$);
-- 2. Sắp có hàng, có hàng và hái sau ngày hết cách ly → đăng được, thành upcoming
SELECT set_config('test.ly.b',pg_temp.lo_ly('LY75-SAP',jsonb_build_object('available_from',current_setting('test.ly.today')::date+10,'harvest_on',current_setting('test.ly.today')::date+10))::text,true);
SELECT test.as_login('db_test_seller',$$SELECT cmd.publish_lot(current_setting('test.ly.b')::uuid,23000,20000)$$);
SELECT test.check('0075 đăng trước mùa khi còn cách ly: lô sắp có hàng, mốc cách ly lấy từ nhật ký',
 EXISTS(SELECT 1 FROM core.lots WHERE id=current_setting('test.ly.b')::uuid AND status='upcoming' AND spray_clear_on=current_setting('test.ly.today')::date+7));
-- 3. Có hàng trước ngày hết cách ly → chặn
SELECT set_config('test.ly.c',pg_temp.lo_ly('LY75-SOM',jsonb_build_object('available_from',current_setting('test.ly.today')::date+3))::text,true);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('0075 ngày có hàng trước hết cách ly bị chặn',
 'SELECT cmd.publish_lot(current_setting(''test.ly.c'')::uuid,23000,20000)','ck_lot_withdrawal')$$);
-- 4. Có hàng sau cách ly nhưng ngày hái trước → chặn
SELECT set_config('test.ly.d',pg_temp.lo_ly('LY75-HAI-SOM',jsonb_build_object('available_from',current_setting('test.ly.today')::date+10,'harvest_on',current_setting('test.ly.today')::date+3))::text,true);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('0075 ngày hái trước hết cách ly bị chặn',
 'SELECT cmd.publish_lot(current_setting(''test.ly.d'')::uuid,23000,20000)','ck_lot_withdrawal')$$);
-- 5. Client khai hết cách ly sớm hơn không qua được mốc nhật ký
SELECT set_config('test.ly.e',pg_temp.lo_ly('LY75-KHAI-SOM',jsonb_build_object('available_from',current_setting('test.ly.today')::date+5,'spray_clear_on','2020-01-01'))::text,true);
SELECT test.as_login('db_test_seller',$$SELECT test.expect_error('0075 khai cách ly sớm vẫn bị nhật ký chặn',
 'SELECT cmd.publish_lot(current_setting(''test.ly.e'')::uuid,23000,20000)','ck_lot_withdrawal')$$);

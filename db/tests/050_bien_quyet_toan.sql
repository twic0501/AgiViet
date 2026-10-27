SELECT test.check('TH024 trả lại nhiều: người bán hoàn 3100000', (SELECT release_vnd=0 AND refund_vnd=13800000 AND t_nb_vnd=3100000 FROM ledger.split_settlement(29100000,32200000,13800000)));
SELECT test.check('TH025 trả lại hết: hoàn 32200000', (SELECT refund_vnd=13800000 AND t_nb_vnd=32200000 FROM ledger.split_settlement(0,32200000,13800000)));
SELECT test.check('TH037 trong dung sai: hoàn cọc 920000', (SELECT release_vnd=12880000 AND refund_vnd=920000 FROM ledger.split_settlement(45080000,32200000,13800000)));
SELECT test.check('TH037 vượt lượng: mua trả thêm 2300000', (SELECT release_vnd=13800000 AND t_bm_vnd=2300000 FROM ledger.split_settlement(48300000,32200000,13800000)));
SELECT test.check('TH038 thiếu không báo: chia đúng 9315000 và 4485000', (SELECT n_vnd=41515000 AND release_vnd=9315000 AND refund_vnd=4485000 FROM ledger.split_settlement(42550000,32200000,13800000,1035000)));
SELECT test.check('TH029 người bán sai: hoàn 4230000, không hoàn ngoài app', (SELECT n_vnd=41770000 AND release_vnd=0 AND refund_vnd=4230000 AND t_nb_vnd=0 FROM ledger.split_settlement(42050000,32200000,13800000,280000,0,9570000)));
SELECT test.check('TH029 người bán đúng: chi thêm 2580000', (SELECT release_vnd=2580000 AND refund_vnd=1650000 AND t_nb_vnd=0 FROM ledger.split_settlement(44350000,32200000,13800000,0,0,9570000)));
SELECT test.check('TH055 vật tư: ròng đợt 47960000', (SELECT n_vnd=47960000 AND release_vnd=9000000 AND t_bm_vnd=38960000 FROM ledger.split_settlement(53460000,0,9000000,500000,0,0,5000000)));
SELECT test.check('TH058 tôm: 1480kg x 105000',ref.div_round(1480000::numeric*105000,1000)=155400000);
SELECT test.check('TH059 lúa: quy đổi 30000kg ẩm27 về ẩm25',ref.div_round(30000000::numeric*7300,7500)=29200000 AND ref.div_round(29200000::numeric*6600,1000)=192720000);
SELECT test.check('Tập xác định 500 phép quyết toán đều bảo toàn',NOT EXISTS(
 SELECT 1 FROM generate_series(1,500)n CROSS JOIN LATERAL ledger.split_settlement(n*997::bigint,n*411::bigint,n*387::bigint,n*13::bigint,n*7::bigint,n*111::bigint) s
 WHERE n*411+s.release_vnd+n*111+s.t_bm_vnd-s.t_nb_vnd<>s.n_vnd OR n*111+s.release_vnd+s.refund_vnd<>n*387));
SELECT test.expect_error('Không sửa mẫu nguồn sự kiện webhook', $$UPDATE evt.inbound_webhooks SET payload='{"tampered":true}'$$,'ck_append_only');
SELECT test.expect_error('Không đảo bút toán đảo', $$SELECT ledger.reverse((SELECT id FROM ledger.transactions WHERE kind='reversal' LIMIT 1),'Đảo lần hai')$$,'ck_ledger_reverse_of_reverse');
SELECT test.expect_error('Không xóa xác nhận tiền', $$DELETE FROM core.direct_payment_confirmations WHERE id=test.id('confirm1')$$,'ck_append_only');
SELECT test.expect_error('Không xóa lịch sử trạng thái', $$DELETE FROM evt.state_history WHERE entity_id=test.id('order')$$,'ck_append_only');
SELECT test.check('N08 TH029 chi tạm 9570000 giữ 4230000',ledger.interim_release(42050000,32200000,13800000,280000)=9570000
 AND 13800000-ledger.interim_release(42050000,32200000,13800000,280000)=4230000);
SELECT test.check('N08 TH031 chia 50/50: chi 1290000 hoàn 2940000 không ngoài app',
 (SELECT n_vnd=43060000 AND release_vnd=1290000 AND refund_vnd=2940000 AND t_nb_vnd=0 AND t_bm_vnd=0 FROM ledger.split_settlement(43200000,32200000,13800000,140000,0,9570000)));
SELECT test.check('N08 khoản giữ lớn hơn quyền chi tạm không làm chi âm',ledger.interim_release(100,50,200,1000)=0);
SELECT test.check('N08 lần tạm sau trừ phần đã chi, không trừ G hai lần',ledger.interim_release(42050000,32200000,13800000,280000,9000000)=570000);

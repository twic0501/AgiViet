-- Lỗi đua bắt được khi kiểm hai kết nối PostgreSQL thật (backend/scripts/kiem-dong-thoi.mjs, 28/10/2026):
-- hai cam kết cùng lúc cùng đọc công nợ cũ, cả hai qua kiểm mức cho nợ → nghĩa vụ vượt mức (15/20 lần).
-- Sửa: khóa giao dịch theo cặp bên mua–người bán trước khi đọc công nợ; mọi lần tăng nghĩa vụ của cặp xếp hàng.
-- Ở READ COMMITTED, câu đọc công nợ sau khi lấy khóa thấy cam kết của phiên trước đã commit.
CREATE OR REPLACE FUNCTION core.check_commit_capacity(p_alloc uuid,p_added_vnd bigint) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,core,ref AS $$
DECLARE a core.sourcing_allocations%ROWTYPE; g core.sourcing_agreements%ROWTYPE; t core.seller_credit_terms%ROWTYPE;
BEGIN
 SELECT * INTO a FROM core.sourcing_allocations WHERE id=p_alloc;
 SELECT g2.* INTO g FROM core.sourcing_days d JOIN core.sourcing_agreements g2 ON g2.id=d.agreement_id WHERE d.id=a.day_id;
 PERFORM pg_advisory_xact_lock(hashtextextended('agv-credit:'||g.buyer_org_id::text||':'||a.seller_org_id::text,0));
 IF g.status<>'active' THEN RAISE EXCEPTION 'Thỏa thuận đã dừng: không nhận cam kết mới hay tăng cam kết' USING HINT='ck_sourcing_stopped'; END IF;
 IF core.pair_has_overdue(g.buyer_org_id,a.seller_org_id) THEN RAISE EXCEPTION 'Bên mua đang có khoản quá hạn với người bán này' USING HINT='ck_credit_overdue'; END IF;
 SELECT * INTO t FROM core.seller_credit_terms WHERE buyer_org_id=g.buyer_org_id AND seller_org_id=a.seller_org_id;
 IF coalesce(t.pay_after_days,0)>0 AND core.pair_exposure(g.buyer_org_id,a.seller_org_id)+p_added_vnd>coalesce(t.credit_limit_vnd,0) THEN
  RAISE EXCEPTION 'Vượt mức cho nợ người bán đã đặt' USING HINT='ck_credit_limit'; END IF;
END $$;

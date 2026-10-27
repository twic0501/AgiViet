-- Hàm công nợ dùng ref.div_round (không cấp cho vai đọc của backend). Chạy bằng quyền chủ DB, search_path cố định,
-- để API đọc được công nợ/quá hạn mà không mở thêm quyền gọi hàm nội bộ. (Phát hiện khi chạy kiểm thử API TH-B23-DK.)
ALTER FUNCTION core.pair_exposure(uuid,uuid) SECURITY DEFINER SET search_path=pg_catalog,core,ref;
ALTER FUNCTION core.pair_has_overdue(uuid,uuid) SECURITY DEFINER SET search_path=pg_catalog,core,ref;
ALTER FUNCTION core.dispute_claim_amount(uuid) SECURITY DEFINER SET search_path=pg_catalog,core,ref;
ALTER FUNCTION core.complaint_window_hours(uuid) SECURITY DEFINER SET search_path=pg_catalog,core,ref;

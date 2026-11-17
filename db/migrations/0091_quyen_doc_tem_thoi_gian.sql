-- 0091: Vai đọc của backend cần SELECT bảng tem mới (0090). Trên Neon vai đã tồn tại từ trước nên GRANT ngay;
-- trên PGlite vai tạo sau migration và được GRANT SELECT ON ALL TABLES lúc khởi tạo.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='agv_backend_read') THEN
    GRANT SELECT ON core.signature_timestamps TO agv_backend_read;
  END IF;
END $$;

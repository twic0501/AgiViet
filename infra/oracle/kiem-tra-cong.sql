-- Chặn phiên bản lỗi ĐÃ BIẾT (đề xuất backend mục 17), không thay kiểm nghiệp vụ.
-- Không sửa hàm của DB từ infra, không nới gateway thành owner để né lỗi.
DO $$ BEGIN
 IF NOT EXISTS(SELECT FROM public.schema_migrations WHERE name='0055_phien_ben_cho_dang_ky_va_nguoi_giup.sql') THEN
   RAISE EXCEPTION 'Cần migrations 0054–0055 trước khi mở ingress';
 END IF;
 IF NOT EXISTS(SELECT FROM cmd.trusted_gateways WHERE login_name='agv_backend_gateway' AND enabled) THEN
   RAISE EXCEPTION 'Gateway chưa được owner đăng ký trong cmd.trusted_gateways';
 END IF;
 IF pg_get_functiondef('cmd.enter_actor()'::regprocedure) ~* 'login_name\s*=\s*session_user' THEN
   RAISE EXCEPTION 'CHẶN TRIỂN KHAI: cmd.enter_actor vẫn tra session_user; gateway SET ROLE không đổi session_user'
     USING HINT='Cần migration của nhóm DB xử lý docs/backend/de-xuat-csdl.md mục 17, rồi kiểm command PostgreSQL thật. Không dùng owner cho backend.';
 END IF;
END $$;

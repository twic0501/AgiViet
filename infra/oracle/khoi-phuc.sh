#!/usr/bin/env bash
# Restore vào DB mới *_restore; chạy lại cùng archive/đích đã hoàn tất là no-op.
# Không đổi kết nối app, không xóa DB cũ, không ghi đè volume artifacts đang dùng.
set -euo pipefail
source "$(dirname "$0")/chung.sh"
archive="${1:?Cách dùng: khoi-phuc.sh archive.tar.age agiviet ten_restore}"
source_db="${2:?Cần tên DB nguồn}"; target="${3:?Cần tên DB đích mới có hậu tố _restore}"
[[ "$source_db" == agiviet ]] || fail 'DB nguồn không thuộc bộ sao lưu'
[[ "$target" =~ ^[a-z][a-z0-9_]*_restore$ && ${#target} -le 63 ]] || fail 'Đích phải là tên DB mới *_restore, tối đa 63 ký tự'
: "${BACKUP_AGE_IDENTITY:?Đặt đường dẫn khóa age trên máy phục hồi}"
[[ -r "$archive" && -r "$BACKUP_AGE_IDENTITY" ]] || fail 'Không đọc được archive hoặc khóa age'
operation_lock
archive_hash="$(sha256sum "$archive" | cut -d' ' -f1)"
stage="$(mktemp -d "$BACKUP_DIR/.restore-XXXXXXXX")"
trap 'rm -rf -- "$stage"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM
age -d -i "$BACKUP_AGE_IDENTITY" -o "$stage/bundle.tar" "$archive"
# Chỉ lấy 5 tệp dữ liệu + SHA256SUMS cố định, không giải nén đường dẫn tùy ý từ bundle.
tar -xf "$stage/bundle.tar" -C "$stage" -- agiviet.dump artifacts.tar ai-audit.tar roles.sql manifest.txt SHA256SUMS
expected="$(printf '%s\n' agiviet.dump artifacts.tar ai-audit.tar roles.sql manifest.txt | sort)"
actual="$(awk '{print $2}' "$stage/SHA256SUMS" | sort)"
[[ "$actual" == "$expected" ]] || fail 'Manifest hash không đúng danh sách file'
(cd "$stage" && sha256sum -c SHA256SUMS)
recovered="$BACKUP_DIR/recovered-$archive_hash"
mkdir -p "$recovered"
cp "$stage/roles.sql" "$stage/manifest.txt" "$recovered/"
# Roles phải được đối chiếu/cấp trước restore. Không tự chạy pg_dumpall có thể cấp đặc quyền owner.
# Lỗi role thiếu: giữ DB dở, đọc roles.sql và dùng đích mới sau khi provision đúng.
dc exec -T db pg_restore --list < "$stage/$source_db.dump" >/dev/null
exists="$(dc exec -T db psql -U agiviet_owner -d postgres -Atqc "SELECT 1 FROM pg_database WHERE datname='$target'")"
if [[ "$exists" == 1 ]]; then
  receipt_table="$(dc exec -T db psql -U agiviet_owner -d "$target" -Atqc "SELECT to_regclass('public.oracle_restore_receipt') IS NOT NULL")"
  [[ "$receipt_table" == t ]] || fail 'DB đích đã tồn tại nhưng không có biên nhận hoàn tất; không ghi đè'
  receipt="$(dc exec -T db psql -U agiviet_owner -d "$target" -Atqc "SELECT archive_sha256||':'||source_db FROM public.oracle_restore_receipt WHERE id=1")"
  [[ "$receipt" == "$archive_hash:$source_db" ]] || fail 'DB đích thuộc bản phục hồi khác; chọn đích mới'
else
  dc exec -T db createdb -U agiviet_owner --template=template0 "$target"
  dc exec -T db psql -U agiviet_owner -d postgres -v ON_ERROR_STOP=1 -X -q -c "REVOKE CONNECT,TEMPORARY ON DATABASE \"$target\" FROM PUBLIC; GRANT CONNECT ON DATABASE \"$target\" TO agv_backend_gateway;"
  # Giữ ownership/ACL; các cluster role phải được tạo bởi migration trên máy đích trước.
  # Lỗi giữ DB lại để điều tra; chạy lại không tự ghi đè DB phục hồi dở.
  dc exec -T db pg_restore -U agiviet_owner --exit-on-error --single-transaction -d "$target" < "$stage/$source_db.dump"
  dc exec -T db psql -U agiviet_owner -d "$target" -v ON_ERROR_STOP=1 -X -q <<SQL
CREATE TABLE IF NOT EXISTS public.oracle_restore_receipt (id int PRIMARY KEY CHECK(id=1), archive_sha256 text NOT NULL, source_db text NOT NULL);
INSERT INTO public.oracle_restore_receipt VALUES (1,'$archive_hash','$source_db')
ON CONFLICT(id) DO UPDATE SET archive_sha256=EXCLUDED.archive_sha256, source_db=EXCLUDED.source_db;
SQL
  dc exec -T db vacuumdb -U agiviet_owner --analyze-only "$target"
fi
# Tệp được đưa ra thư mục phục hồi riêng; chưa giải nén vào volume đang phục vụ.
recovered="$BACKUP_DIR/recovered-$archive_hash"
mkdir -p "$recovered"
mv "$stage/artifacts.tar" "$stage/ai-audit.tar" "$stage/roles.sql" "$stage/manifest.txt" "$recovered/"
printf 'Đã khôi phục DB %s; tệp ở %s. Đối soát rồi mới chuyển kết nối/volume.\n' "$target" "$recovered"

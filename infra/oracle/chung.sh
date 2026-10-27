#!/usr/bin/env bash
# Thư viện được source; cấu hình ở /etc là mã Bash đáng tin, không nhận từ HTTP.
set -euo pipefail
umask 077
ORACLE_HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$ORACLE_HERE/../.." && pwd)"
ORACLE_ENV_FILE="${ORACLE_ENV_FILE:-/etc/agiviet/oracle.env}"
fail() { echo "Lỗi: $*" >&2; exit 2; }
[[ -r "$ORACLE_ENV_FILE" ]] || fail "Thiếu cấu hình ngoài repo: $ORACLE_ENV_FILE"
case "$(realpath "$ORACLE_ENV_FILE")" in "$REPO_DIR"/*) fail 'Không đặt cấu hình bí mật trong repo';; esac
# Chỉ root hoặc người đang chạy được sở hữu cấu hình, cấm group/world write và world read.
owner="$(stat -c %u "$ORACLE_ENV_FILE")"; mode="$(stat -c %a "$ORACLE_ENV_FILE")"
[[ "$owner" == 0 || "$owner" == "$EUID" ]] || fail 'Sai chủ sở hữu oracle.env'
(( (8#$mode & 0027) == 0 )) || fail 'oracle.env phải có quyền 0600 hoặc 0640'
set -a
# shellcheck source=/dev/null
source "$ORACLE_ENV_FILE"
set +a

: "${DOMAIN:?}" "${ACME_EMAIL:?}" "${CADDY_PASSWORD_HASH:?}"
secret_names=(DB_PASSWORD AGV_GATEWAY_PASSWORD AGV_SESSION_SECRET AGV_OTP_PEPPER AGV_WEBHOOK_SECRET AGV_FALLBACK_SECRET AGV_AI_API_KEY)
seen='|'
for secret_name in "${secret_names[@]}"; do
  value="${!secret_name:-}"
  [[ "$value" =~ ^[a-fA-F0-9]{64}$ ]] || fail "$secret_name phải là 64 ký tự hex"
  [[ "$seen" != *"|$value|"* ]] || fail 'Không dùng chung mật khẩu/khóa'
  seen+="$value|"
done
OCI_SIZE="${OCI_SIZE:-12}"
case "$OCI_SIZE" in
  6) AGV_PG_POOL_MAX="${AGV_PG_POOL_MAX:-4}";;
  12|24) AGV_PG_POOL_MAX="${AGV_PG_POOL_MAX:-6}";;
  *) fail 'OCI_SIZE chỉ nhận 6, 12 hoặc 24';;
esac
[[ "$AGV_PG_POOL_MAX" =~ ^[1-9][0-9]*$ && "$AGV_PG_POOL_MAX" -le 20 ]] || fail 'AGV_PG_POOL_MAX cần từ 1 đến 20'
[[ "$OCI_SIZE" != 6 || "$AGV_PG_POOL_MAX" -le 4 ]] || fail 'Máy 6 GB cần AGV_PG_POOL_MAX <=4 (hoặc để trống để chọn tự động)'
ENABLE_AI="${ENABLE_AI:-1}"
case "$ENABLE_AI" in
  1) ORACLE_AI_URL=http://ai:8091;;
  0) ORACLE_AI_URL='';;
  *) fail 'ENABLE_AI chỉ nhận 0|1';;
esac
export OCI_SIZE AGV_PG_POOL_MAX ENABLE_AI ORACLE_AI_URL
: "${AGV_QR_PRIVATE_PEM_B64:?}" "${AGV_PDF_PRIVATE_PEM_B64:?}"
[[ "$AGV_QR_PRIVATE_PEM_B64" != "$AGV_PDF_PRIVATE_PEM_B64" ]] || fail 'QR và PDF cần hai khóa khác nhau'
[[ "$CADDY_PASSWORD_HASH" =~ ^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$ ]] || fail 'Cần hash bcrypt hợp lệ'
[[ "$DOMAIN" =~ ^[a-zA-Z0-9]([a-zA-Z0-9.-]*[a-zA-Z0-9])?$ && "$DOMAIN" == *.* && "$DOMAIN" != *example* ]] || fail 'Cần hostname DNS thật'
[[ "${AGV_MOI_TRUONG:-production}" == production || "${AGV_MOI_TRUONG:-production}" == thu ]] || fail 'Sai AGV_MOI_TRUONG'
[[ "${SEED_DEMO:-0}" == 0 || "${SEED_DEMO:-0}" == 1 ]] || fail 'SEED_DEMO chỉ nhận 0|1'
[[ "${SEED_DEMO:-0}" == 0 || "${AGV_MOI_TRUONG:-production}" == thu ]] || fail 'Seed ảo chỉ dùng với chế độ thu'
STATE_DIR="${STATE_DIR:-/var/lib/agiviet}"; BACKUP_DIR="${BACKUP_DIR:-$STATE_DIR/backups}"
[[ "$STATE_DIR" == /* && "$BACKUP_DIR" == /* ]] || fail 'Runtime cần đường dẫn tuyệt đối'
mkdir -p "$STATE_DIR" "$BACKUP_DIR"
DC=(docker compose --project-name agiviet-oracle --env-file "$ORACLE_ENV_FILE" -f "$ORACLE_HERE/docker-compose.oracle.yml")
case "$OCI_SIZE" in
  6) DC+=(-f "$ORACLE_HERE/docker-compose.oracle-6gb.yml");;
  12) ;;
  24) [[ "${OCI_24GB_CONFIRMED:-0}" == 1 ]] || fail 'Cần xác nhận quota 24 GB'; DC+=(-f "$ORACLE_HERE/docker-compose.oracle-24gb.yml");;
esac
if [[ "$ENABLE_AI" == 1 ]]; then DC+=(--profile ai); fi
# Dùng dc cho cả thao tác thủ công; không in `config` đầy đủ vì có mật khẩu.
dc() { "${DC[@]}" "$@"; }
operation_lock() {
  if [[ "${ORACLE_LOCK_HELD:-0}" == 1 && -e /proc/self/fd/9 ]]; then
    [[ "$(readlink /proc/self/fd/9)" == "$STATE_DIR/operation.lock" ]] || fail 'Sai khóa kế thừa'
    flock -n 9 || fail 'Không giữ khóa kế thừa'
  else
    exec 9>"$STATE_DIR/operation.lock"
    flock -n 9 || fail 'Đang có deploy/backup/restore khác'
  fi
}
remote_check() {
  : "${REMOTE_BACKUP:?Cần kho sao lưu ngoài máy}" "${BACKUP_AGE_RECIPIENT:?Cần age recipient}" "${RCLONE_CONFIG:?}"
  [[ "$REMOTE_BACKUP" =~ ^[a-zA-Z0-9_-]+:[a-zA-Z0-9._/-]+$ && "$REMOTE_BACKUP" == *:*/* && "$REMOTE_BACKUP" != *..* ]] || fail 'Remote phải có bucket/prefix riêng'
  [[ -r "$RCLONE_CONFIG" ]] || fail 'Chưa cấu hình rclone ngoài repo'
  KEEP_BACKUPS="${KEEP_BACKUPS:-7}"; MAX_REMOTE_BYTES="${MAX_REMOTE_BYTES:-8589934592}"
  [[ "$KEEP_BACKUPS" =~ ^[1-9][0-9]*$ && "$MAX_REMOTE_BYTES" =~ ^[1-9][0-9]*$ ]] || fail 'Retention/budget phải là số nguyên dương'
}
rc() { timeout 1800 rclone --config "$RCLONE_CONFIG" --retries 1 --low-level-retries 1 --contimeout 15s --timeout 5m "$@"; }

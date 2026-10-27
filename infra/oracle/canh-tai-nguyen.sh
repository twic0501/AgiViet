#!/usr/bin/env bash
# Một lượt kiểm hữu hạn. Mặc định chỉ đọc; timer gọi --clean trên VM riêng.
# Tuyệt đối không prune volume/container, không xóa DB/uploads/backup/audit.
set -euo pipefail
source "$(dirname "$0")/chung.sh"
[[ "${1:---check}" == --check || "${1:-}" == --clean ]] || fail 'Dùng: canh-tai-nguyen.sh [--check|--clean]'
action="${1:---check}"
operation_lock
# Timer root có thể tạo lock trước deploy đầu tiên. Giữ quyền cho user vận hành.
if [[ "$EUID" == 0 ]]; then chown --reference="$STATE_DIR" "$STATE_DIR/operation.lock"; fi
warn=0; errors=0
log() { printf '%s [%s] %s\n' "$(date --iso-8601=seconds)" "$1" "$2"; }
warning() { warn=1; log WARNING "$*"; }
error() { errors=1; log ERROR "$*"; }
disk_pct="${RESOURCE_DISK_WARN_PCT:-80}"; ram_pct="${RESOURCE_RAM_WARN_PCT:-85}"
db_gib="${RESOURCE_DB_WARN_GIB:-20}"; upload_gib="${RESOURCE_UPLOAD_WARN_GIB:-10}"
ai_gib="${RESOURCE_AI_WARN_GIB:-1}"; cache_gib="${RESOURCE_CACHE_WARN_GIB:-5}"
temp_gib="${RESOURCE_TEMP_WARN_GIB:-1}"
for number in "$disk_pct" "$ram_pct" "$db_gib" "$upload_gib" "$ai_gib" "$cache_gib" "$temp_gib"; do
  [[ "$number" =~ ^[1-9][0-9]{0,3}$ ]] || fail 'Ngưỡng cần số nguyên 1..9999'
done
(( disk_pct <= 100 && ram_pct <= 100 )) || fail 'Ngưỡng phần trăm tối đa 100'
check_fs() {
  local path="$1" used inodes
  used="$(df -P -- "$path" | awk 'END {gsub(/%/,"",$5);print $5}')"
  inodes="$(df -Pi -- "$path" | awk 'END {gsub(/%/,"",$5);print $5}')"
  log INFO "filesystem=$path used=${used}% inodes=${inodes}%"
  if (( used >= disk_pct || inodes >= disk_pct )); then warning "Filesystem gần đầy: $path"; fi
}
measure() {
  local name="$1" path="$2" gib="$3" bytes
  if ! bytes="$(timeout 30 du -sx --block-size=1 -- "$path" | cut -f1)"; then
    error "Không đo được $name trong 30s"; return
  fi
  log INFO "$name bytes=$bytes warn_gib=$gib"
  if (( bytes >= gib * 1073741824 )); then warning "$name vượt ngưỡng; dữ liệu được giữ nguyên"; fi
}
check_fs /
check_fs "$STATE_DIR"
ram_used="$(awk '/MemTotal:/ {t=$2} /MemAvailable:/ {a=$2;seen=1} END {if(t>0 && seen) printf "%d", (t-a)*100/t; else exit 1}' /proc/meminfo)"
log INFO "RAM used=${ram_used}% (dùng MemAvailable, không cộng cache có thể thu hồi)"
if (( ram_used >= ram_pct )); then warning 'RAM vượt ngưỡng; không kill DB, không drop OS cache'; fi
docker_root="$(timeout 15 docker info --format '{{.DockerRootDir}}')"
[[ -d "$docker_root" ]] || fail 'Không đọc được DockerRootDir'
check_fs "$docker_root"
for spec in "${AGV_PG_VOLUME:-agiviet_oracle_v2_pgdata}:$db_gib" "${ORACLE_ARTIFACTS_VOLUME:-agiviet_oracle_v2_artifacts}:$upload_gib" "${ORACLE_AI_VOLUME:-agiviet_oracle_v2_ai_audit}:$ai_gib"; do
  volume="${spec%:*}"; threshold="${spec##*:}"
  # AI chưa từng bật có thể chưa có volume. Nếu đã có audit thì vẫn phải đo/giữ.
  if [[ "$ENABLE_AI" == 0 && "$volume" == "${ORACLE_AI_VOLUME:-agiviet_oracle_v2_ai_audit}" ]]; then
    if ! all_volumes="$(timeout 10 docker volume ls -q)"; then error 'Không liệt kê được volume'; continue; fi
    if ! grep -Fxq "$volume" <<< "$all_volumes"; then log INFO 'AI tắt, chưa có volume audit; bỏ qua'; continue; fi
  fi
  if ! mountpoint="$(timeout 10 docker volume inspect --format '{{.Mountpoint}}' "$volume")"; then
    error "Thiếu volume $volume; không tạo volume thay thế"; continue
  fi
  if [[ ! -d "$mountpoint" ]]; then error "Không đọc được mountpoint $volume"; continue; fi
  check_fs "$mountpoint"
  measure "$volume" "$mountpoint" "$threshold"
done
# Chỉ thư mục tmp riêng của tác vụ hạ tầng. Không dùng /tmp toàn máy hay glob trong /data.
temp_dir="$STATE_DIR/tmp"
if [[ -d "$temp_dir" && ! -L "$temp_dir" && "$(realpath "$temp_dir")" == "$(realpath "$STATE_DIR")/tmp" ]]; then
  case "$(realpath -m "$BACKUP_DIR")/" in
    "$(realpath "$temp_dir")/"*) fail 'BACKUP_DIR nằm trong tmp; từ chối dọn';;
  esac
  case "$(realpath "$temp_dir")/" in
    "$(realpath -m "$BACKUP_DIR")/"*) fail 'tmp nằm trong BACKUP_DIR; từ chối dọn';;
  esac
  measure infra_tmp "$temp_dir" "$temp_gib"
else
  temp_dir=''
  log INFO 'Không có thư mục tmp riêng hợp lệ; bỏ qua dọn tmp'
fi
# Đọc thống kê trước; không in inspect/env có secrets. Kích thước tính theo Docker.
if usage="$(timeout 30 docker system df --format '{{json .}}')"; then
  log INFO "$usage"
  cache_bytes="$(printf '%s\n' "$usage" | python3 -c '
import json,re,sys
total=0
for line in sys.stdin:
    value=json.loads(line)
    for row in value if isinstance(value,list) else [value]:
        if row.get("Type") not in ("Images","Build Cache"): continue
        match=re.fullmatch(r"([0-9.]+)\s*([KMGT]?)(i?B)", str(row["Size"]))
        if not match: raise SystemExit("Không đọc được kích thước Docker")
        n,unit,suffix=match.groups()
        total+=int(float(n)*(1024 if suffix=="iB" else 1000)**("KMGT".index(unit)+1 if unit else 0))
print(total)
')"
  if (( cache_bytes >= cache_gib * 1073741824 )); then warning 'Image/build cache vượt ngưỡng'; fi
else
  error 'Không đọc được docker system df'
fi
if [[ "$action" == --clean && "$warn" == 1 ]]; then
  log WARNING 'Dọn an toàn: dangling image >7 ngày, dangling build cache >7 ngày; giữ cache 2 GB'
  timeout 90 docker image prune --force --filter until=168h || error 'Dọn image thất bại'
  timeout 90 docker builder prune --force --filter until=168h --keep-storage 2GB || error 'Dọn build cache thất bại'
  if [[ -n "$temp_dir" ]]; then
    # Không theo symlink, không qua filesystem khác, chỉ *.tmp/*.part cũ >48h.
    timeout 30 find -P "$temp_dir" -xdev -type f \( -name '*.tmp' -o -name '*.part' \) -mmin +2880 -print -delete || error 'Dọn tmp thất bại'
  fi
  check_fs "$docker_root"
  log WARNING 'Đã thử dọn phần an toàn. DB/uploads/backup còn nguyên; kiểm và xử lý ngưỡng thủ công qua journal.'
elif [[ "$warn" == 1 ]]; then
  log WARNING 'Chế độ --check: không xóa gì'
else
  log INFO 'Chưa vượt ngưỡng; không dọn'
fi
(( errors == 0 )) || exit 2
# Không đánh dấu đã phục hồi chỉ vì prune thành công; để systemd/journal báo cần xem.
(( warn == 0 )) || exit 1

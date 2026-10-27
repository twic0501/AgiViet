#!/usr/bin/env bash
# Chỉ tải + kiểm SHA-256; tuyệt đối không login/tạo tunnel/đổi DNS/chạy connector.
set -euo pipefail
umask 077
repo="$(cd "$(dirname "$0")/../.." && pwd)"
version=2026.10.4
case "$(uname -m)" in
 x86_64) arch=amd64; sha=ae5e8add7884b0531d66bbca4570d1de491ff6da51e4ebe7eb160cdf241d9e42;;
 aarch64) arch=arm64; sha=2b7203b4fb0ba28a0c1e12f8855ce2c25f76d266a8d5edafac5540b6812acff6;;
 *) echo 'Chỉ Linux x64/ARM64' >&2; exit 2;;
esac
[[ "$(uname -s)" == Linux ]] || exit 2
dir="$repo/infra/.local/cloudflared-$version"
mkdir -p "$dir"
stage="$(mktemp "$dir/.download-XXXXXX")"
trap 'rm -f "$stage"' EXIT
url="https://github.com/cloudflare/cloudflared/releases/download/$version/cloudflared-linux-$arch"
curl --fail --location --proto '=https' --connect-timeout 10 --max-time 180 --retry 2 "$url" -o "$stage"
printf '%s  %s\n' "$sha" "$stage" | sha256sum --check --status
chmod 700 "$stage"
mv "$stage" "$dir/cloudflared"
printf '%s  cloudflared\n' "$sha" > "$dir/SHA256SUMS"
printf 'version=%s\nsource=%s\nsha256=%s\n' "$version" "$url" "$sha" > "$dir/source.txt"
"$dir/cloudflared" --version

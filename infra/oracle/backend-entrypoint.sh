#!/usr/bin/env bash
set -euo pipefail
# B64 cho dotenv/Bash cùng biểu diễn; config backend nhận PEM nhiều dòng thật.
AGV_QR_PRIVATE_PEM="$(printf '%s' "${AGV_QR_PRIVATE_PEM_B64:?}" | base64 -d)"
AGV_PDF_PRIVATE_PEM="$(printf '%s' "${AGV_PDF_PRIVATE_PEM_B64:?}" | base64 -d)"
export AGV_QR_PRIVATE_PEM AGV_PDF_PRIVATE_PEM
unset AGV_QR_PRIVATE_PEM_B64 AGV_PDF_PRIVATE_PEM_B64
exec "$@"

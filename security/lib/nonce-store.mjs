// Kho nonce/jti dùng một lần, có hạn sống.
// Bản trong bộ nhớ chỉ dùng cho kiểm thử và một tiến trình.
// Production: dùng bảng DB có UNIQUE (scope, nonce) và expires_at, hoặc Redis `SET key 1 NX EX ttl`.
// Yêu cầu bắt buộc: thao tác "kiểm và ghi" phải nguyên tử (không tách SELECT rồi INSERT).

export class MemoryNonceStore {
  constructor() {
    this.map = new Map(); // key -> expiresAtSec
  }

  /** Trả true nếu nonce mới (và ghi lại), false nếu đã thấy và còn hạn. */
  checkAndSet(scope, nonce, ttlSec, nowSec) {
    this.#sweep(nowSec);
    const key = scope + '\u0000' + nonce;
    const exp = this.map.get(key);
    if (exp !== undefined && exp > nowSec) return false;
    this.map.set(key, nowSec + ttlSec);
    return true;
  }

  #sweep(nowSec) {
    if (this.map.size < 10000) return;
    for (const [k, exp] of this.map) if (exp <= nowSec) this.map.delete(k);
  }
}

/** SQL tham khảo cho kho nonce trên Postgres (backend dùng; không nằm trong migration của nhóm DB). */
export const NONCE_TABLE_SQL = `
CREATE TABLE evt.used_nonces (
  scope       text        NOT NULL,          -- 'webhook:bank_sim', 'qr:recv', 'otp'
  nonce       text        NOT NULL,
  expires_at  timestamptz NOT NULL,
  PRIMARY KEY (scope, nonce)
);
-- Kiểm và ghi nguyên tử: 1 dòng trả về = nonce mới; 0 dòng = phát lại.
-- INSERT INTO evt.used_nonces (scope, nonce, expires_at) VALUES ($1, $2, now() + $3::interval)
-- ON CONFLICT (scope, nonce) DO UPDATE SET expires_at = EXCLUDED.expires_at
--   WHERE evt.used_nonces.expires_at < now()
-- RETURNING 1;
`;

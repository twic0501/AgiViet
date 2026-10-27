// Giới hạn tần suất cửa sổ trượt (đếm sự kiện trong các cửa sổ). Bản bộ nhớ cho kiểm thử;
// production dùng Redis (ZADD/ZREMRANGEBYSCORE/ZCARD trong một MULTI) hoặc bảng DB có khóa hàng.

export class SlidingWindowLimiter {
  /** rules: [{ windowSec, max }] — phải thỏa TẤT CẢ quy tắc. */
  constructor(rules) {
    this.rules = rules;
    this.events = new Map(); // key -> mảng thời điểm (giây)
  }

  /** Kiểm và ghi nhận nếu được phép. Trả { ok, retryAfterSec }. */
  hit(key, now) {
    const maxWin = Math.max(...this.rules.map((r) => r.windowSec));
    const arr = (this.events.get(key) || []).filter((t) => t > now - maxWin);
    for (const r of this.rules) {
      const inWin = arr.filter((t) => t > now - r.windowSec);
      if (inWin.length >= r.max) {
        const oldest = inWin[inWin.length - r.max];
        this.events.set(key, arr);
        return { ok: false, retryAfterSec: oldest + r.windowSec - now };
      }
    }
    arr.push(now);
    this.events.set(key, arr);
    return { ok: true, retryAfterSec: 0 };
  }
}

/** Mức đề xuất cho AgiViet (chỉnh trong cấu hình vận hành, có ghi lịch sử thay đổi). */
export const OTP_SEND_RULES = Object.freeze({
  perPhone: [ { windowSec: 60, max: 1 }, { windowSec: 15 * 60, max: 3 }, { windowSec: 24 * 3600, max: 10 } ],
  perUser:  [ { windowSec: 15 * 60, max: 5 }, { windowSec: 24 * 3600, max: 15 } ],
  perIp:    [ { windowSec: 3600, max: 30 } ],
  // chống "bơm SMS" (SMS pumping) tốn tiền: trần toàn hệ thống theo đầu số quốc gia
  global:   [ { windowSec: 60, max: 600 } ],
});

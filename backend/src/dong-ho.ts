// Đồng hồ của backend. Production: luôn giờ hệ thống. Môi trường thử: có độ lệch tua được (chỉ tiến).
// DB runtime không đọc đồng hồ thử (migration 0028); backend chỉ truyền app.test_time khi chạy bằng owner trong môi trường thử.

export const T0_THU = Date.parse('2026-11-02T08:00:00+07:00');

export class DongHo {
  private lechMs = 0;
  constructor(private choPhepTua: boolean) {}
  now(): Date { return new Date(Date.now() + this.lechMs); }
  ms(): number { return Date.now() + this.lechMs; }
  giay(): number { return Math.floor(this.ms() / 1000); }
  /** Đặt đồng hồ thử tới mốc (không lùi về trước giờ thật để các CHECK theo now() của DB vẫn đúng). */
  datMoc(msMoc: number) {
    if (!this.choPhepTua) throw new Error('Đồng hồ thử chỉ có ở môi trường thử');
    this.lechMs = Math.max(0, msMoc - Date.now());
  }
  tua(ms: number) {
    if (!this.choPhepTua) throw new Error('Đồng hồ thử chỉ có ở môi trường thử');
    if (ms < 0) throw new Error('Không tua lùi');
    this.lechMs += ms;
  }
  laThu(): boolean { return this.choPhepTua; }
}

export const GIO = 3600_000;
export const PHUT = 60_000;

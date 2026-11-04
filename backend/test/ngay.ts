// Ngày trong kịch bản kiểm thử ghi theo mốc 04/11/2026 rồi DỜI theo giờ thật: đồng hồ thử chỉ tiến, không lùi
// về trước giờ thật (dong-ho.ts), nên ngày ghi cứng đã qua sẽ làm hỏng kịch bản. Dời nguyên ngày, giữ giờ trong ngày.
const GOC = Date.parse('2026-11-04T00:00:00+07:00');
const BU = Math.max(0, Math.ceil((Date.now() + 86_400_000 - GOC) / 86_400_000)) * 86_400_000;
export const ng = (s: string) => new Date(Date.parse(s) + BU).toISOString();

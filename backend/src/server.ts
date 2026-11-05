// Khởi động máy chủ HTTP. Môi trường thử chạy PGlite trong tiến trình; bộ hẹn giờ chạy mỗi 30 giây.
import { dungApp } from './app.ts';
import { chayHenGio } from './nghiep-vu/hen-gio.ts';
import { chayOutbox } from './nghiep-vu/outbox.ts';

const { app, ht } = await dungApp();
await app.listen({ port: ht.cfg.cong, host: ht.cfg.host });
const timer = setInterval(() => {
  chayHenGio(ht).catch((e) => app.log.error(e, 'hen_gio'));
  chayOutbox(ht).catch((e) => app.log.error(e, 'outbox'));
}, 30_000);
// Giữ dịch vụ AI thức (Render ngủ sau ~15 phút; lần thức mất ~12 s làm chatbot hết giờ, rơi về câu soạn sẵn)
const giuAi = ht.cfg.aiUrl ? setInterval(() => { fetch(`${ht.cfg.aiUrl}/health`, { signal: AbortSignal.timeout(20_000) }).catch(() => {}); }, 10 * 60_000) : undefined;
// Không còn ai giữ hộ → đưa dữ liệu thử về ban đầu, chạy nền; có người vào giữa chừng thì bỏ qua, lượt sau làm lại
let dangLamMoi = false;
const lamMoi = setInterval(async () => {
  if (dangLamMoi || !ht.cfg.tinhNangThu || !ht.db.datLaiCham) return;
  const m = await import('./demo/doi-tac-ao.ts');
  if (!m.LAM_MOI.can || m.dangDung().length) return;
  dangLamMoi = true;
  try { if ((await ht.datLai(() => !m.dangDung().length)) !== false) { m.datLaiBoNho(); m.DANG_DUNG.clear(); m.LAM_MOI.can = false; app.log.info('da_lam_moi_du_lieu_thu'); } }
  catch (e) { m.LAM_MOI.can = false; app.log.warn(e, 'lam_moi_du_lieu_thu'); } // thiếu cấu hình mẫu thì khỏi thử lại mỗi phút
  dangLamMoi = false;
}, 30_000);
const dung = async () => { clearInterval(lamMoi); clearInterval(timer); if (giuAi) clearInterval(giuAi); await app.close(); await ht.db.dong(); process.exit(0); };
process.on('SIGINT', dung);
process.on('SIGTERM', dung);

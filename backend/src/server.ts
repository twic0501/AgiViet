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
const dung = async () => { clearInterval(timer); if (giuAi) clearInterval(giuAi); await app.close(); await ht.db.dong(); process.exit(0); };
process.on('SIGINT', dung);
process.on('SIGTERM', dung);

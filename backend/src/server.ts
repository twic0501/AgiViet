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
const dung = async () => { clearInterval(timer); await app.close(); await ht.db.dong(); process.exit(0); };
process.on('SIGINT', dung);
process.on('SIGTERM', dung);

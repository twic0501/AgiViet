#!/usr/bin/env node
// =====================================================================
// DỊCH VỤ AI GIẢ LẬP (placeholder) — chỉ để đo hạ tầng. Không có mô hình thật.
// Mô phỏng hai đặc tính quan trọng cho hạ tầng:
//   1. Độ trễ dài và lệch (giọng nói: trung vị ~1,2 s, đuôi dài) — như gọi Whisper/API ngoài.
//   2. Sức chứa cố định (AI_SLOTS lượt chạy song song, giống số GPU/luồng suy luận); vượt hàng chờ
//      AI_QUEUE_MAX thì trả 503 ngay thay vì treo.
// Kỹ sư AI thay file này bằng dịch vụ thật ở ai/ (giữ /health và hợp đồng API).
// =====================================================================
import http from 'node:http';

const PORT = Number(process.env.PORT || 8090);
const SLOTS = Number(process.env.AI_SLOTS || 4);
const QUEUE_MAX = Number(process.env.AI_QUEUE_MAX || 50);
let running = 0;
const queue = [];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// log-chuẩn: median * exp(sigma * N(0,1))
const lognormal = (median, sigma) => {
  const u = 1 - Math.random(), v = Math.random();
  return median * Math.exp(sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v));
};
const acquire = () => new Promise((res, rej) => {
  if (running < SLOTS) { running++; return res(); }
  if (queue.length >= QUEUE_MAX) return rej(new Error('full'));
  queue.push(res);
});
const release = () => { const n = queue.shift(); if (n) n(); else running--; };

http.createServer(async (req, res) => {
  const send = (s, o) => { res.writeHead(s, { 'content-type': 'application/json; charset=utf-8', 'x-gia-lap': 'ai-stub' }); res.end(JSON.stringify(o)); };
  for await (const _ of req);
  if (req.url === '/health') return send(200, { ok: true, gia_lap: true, running, queued: queue.length, slots: SLOTS });
  if (req.method !== 'POST') return send(404, {});
  try { await acquire(); } catch { return send(503, { loi: 'AI đang bận, thử lại sau', queued: queue.length }); }
  try {
    if (req.url === '/voice/transcribe') {
      await sleep(Math.min(lognormal(1200, 0.45), 15000));
      return send(200, { text: 'xoài cát chu loại một hai tấn hái thứ bảy (GIẢ LẬP)', confidence: 0.82 });
    }
    if (req.url === '/match/rerank') {
      await sleep(lognormal(60, 0.3));
      return send(200, { order: [], gia_lap: true });
    }
    send(404, {});
  } finally { release(); }
}).listen(PORT, () => console.log(`[ai-stub] GIẢ LẬP nghe cổng ${PORT}, ${SLOTS} lượt song song`));

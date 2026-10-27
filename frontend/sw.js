// Service worker AgiViet: lưu vỏ app để mở được như app thật, kể cả khi mạng yếu.
// KHÔNG lưu phiên đăng nhập, API (/v1, /health), ảnh chứng từ hay phản hồi giao dịch.
// Vỏ app (HTML/JS/CSS): ưu tiên mạng, mất mạng thì dùng bản đã lưu (online luôn có mã mới).
// Ảnh, font, ảnh trâu: dùng bản đã lưu trước, cập nhật nền.
const VO = "agiviet-shell-v3";
const ANH = "agiviet-asset-v3";
const SAN = [
  "/ban/", "/ban/seller.css", "/ban/manifest.webmanifest",
  "/shared/style.css", "/shared/select.css", "/shared/app.js", "/shared/seller.js",
  "/shared/api.js", "/shared/ui.js", "/shared/format.js", "/shared/market.js", "/shared/orders.js",
  "/shared/services.js", "/shared/enrollment.js", "/shared/login-options.js", "/shared/virtual-money.js",
  "/shared/form-errors.js", "/shared/amendments.js",
  "/assets/logo.svg", "/assets/icon-192.png", "/assets/qr.js",
  "/tham-khao/hieu-ung-va-linh-vat/hieu-ung-app.js", "/tham-khao/hieu-ung-va-linh-vat/hieu-ung-app.css",
  "/tham-khao/hieu-ung-va-linh-vat/linh-vat-nguyen.js",
];
self.addEventListener("install", (event) => {
  // Tệp nào lỗi thì bỏ qua, không làm hỏng cả lần cài.
  event.waitUntil(caches.open(VO).then((c) => Promise.allSettled(SAN.map((u) => c.add(u)))));
  self.skipWaiting();
});
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("agiviet-") && ![VO, ANH].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  ),
);
const laVo = (u) => /\.(html|js|css|webmanifest)$/.test(u.pathname) || u.pathname.endsWith("/");
const laAnh = (u) => /\.(png|jpe?g|webp|svg|woff2?)$/.test(u.pathname);
self.addEventListener("fetch", (event) => {
  const req = event.request;
  const u = new URL(req.url);
  if (req.method !== "GET" || u.origin !== self.location.origin) return;
  if (u.pathname.startsWith("/v1") || u.pathname.startsWith("/health") || u.pathname === "/frontend-capabilities.json") return;
  if (laAnh(u)) {
    event.respondWith(caches.open(ANH).then(async (c) => {
      const cu = await c.match(req);
      const moi = fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => cu);
      return cu || moi;
    }));
    return;
  }
  if (laVo(u)) {
    event.respondWith(
      fetch(req)
        .then((r) => { if (r.ok) { const ban = r.clone(); caches.open(VO).then((c) => c.put(req, ban)); } return r; })
        .catch(async () => (await caches.match(req)) || (req.mode === "navigate" ? caches.match("/ban/") : Response.error())),
    );
  }
});

import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
const root = fileURLToPath(new URL(".", import.meta.url));
const backend = process.env.API_ORIGIN || "http://127.0.0.1:8080";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
};
http
  .createServer(async (req, res) => {
    try {
      const url = new URL(req.url, "http://localhost");
      const normalized = path.posix.normalize(decodeURIComponent(url.pathname).replaceAll("\\", "/"));
      if ((normalized === "/quan-tri" || normalized.startsWith("/quan-tri/")) && req.headers["x-agv-operator"] !== "1") {
        res.writeHead(404, {"cache-control":"no-store"}); res.end("Không tìm thấy trang."); return;
      }
      if (["/ban", "/mua", "/quan-tri"].includes(url.pathname)) {
        res.writeHead(302, { location: url.pathname + "/" });
        res.end();
        return;
      }
      if (url.pathname === "/frontend-capabilities.json") {
        res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
        res.end(JSON.stringify({ test_tools: true }));
        return;
      }
      if (
        url.pathname.startsWith("/v1/") ||
        url.pathname.startsWith("/health")
      ) {
        const upstream = http.request(
          new URL(req.url, backend),
          {
            method: req.method,
            headers: { ...req.headers, host: new URL(backend).host },
          },
          (r) => {
            res.writeHead(r.statusCode, r.headers);
            r.pipe(res);
          },
        );
        upstream.on("error", () => {
          res.writeHead(502, { "content-type": "application/json" });
          res.end(
            JSON.stringify({
              errors: [
                {
                  code: "CAN_MANG",
                  message: "Chưa kết nối được máy chủ.",
                  fix: "Kiểm tra kết nối rồi thử lại.",
                },
              ],
            }),
          );
        });
        req.pipe(upstream);
        return;
      }
      const target = path.resolve(root, "." + decodeURIComponent(url.pathname));
      if ((target !== path.resolve(root) && !target.startsWith(root)) || url.pathname.includes("/.")) {
        res.writeHead(403);
        res.end();
        return;
      }
      let file = target;
      if ((await stat(file)).isDirectory())
        file = path.join(file, "index.html");
      const data = await readFile(file);
      res.writeHead(200, {
        "content-type": mime[path.extname(file)] || "application/octet-stream",
        "cache-control": "no-cache",
        "x-content-type-options": "nosniff",
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Không tìm thấy trang.");
    }
  })
  .listen(Number(process.env.PORT || 8090), "127.0.0.1", () =>
    console.log("AgiViet: http://127.0.0.1:8090/ban/, /mua/ và /quan-tri/"),
  );

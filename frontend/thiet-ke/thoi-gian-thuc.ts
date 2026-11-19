// Kênh real-time dùng chung hai app: đọc luồng Server-Sent Events /v1/events bằng fetch (gửi được Authorization),
// mỗi lần máy chủ báo "thay_doi" thì phát window event "agv-thay-doi" (detail: { giao_dich, tin }) để màn đang mở tự cập nhật.
// Rớt kênh thì nối lại sau 2 → 30 giây; tab ẩn thì đóng, hiện lại thì mở. Các màn vẫn giữ nhịp hỏi lại chậm làm dự phòng.
let dangMo = false, huy = null, cho = 2000;

/** Bật kênh một lần cho cả trang. layToken: () => Promise<string|null>. Trả về hàm kiểm "đang sống". */
export function moKenh(layToken) {
  if (dangMo || typeof window === "undefined") return () => dangSong;
  dangMo = true;
  const noi = async () => {
    if (document.hidden) return;
    const tk = await layToken().catch(() => null); if (!tk) return;
    const ac = new AbortController(); huy = ac;
    try {
      const r = await fetch("/v1/events", { headers: { authorization: "Bearer " + tk, accept: "text/event-stream" }, signal: ac.signal, cache: "no-store" });
      if (!r.ok || !r.body) throw new Error("HTTP " + r.status);
      dangSong = window.__agvKenhSong = true; cho = 2000;
      const rd = r.body.getReader(), dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await rd.read(); if (done) break;
        buf += dec.decode(value, { stream: true });
        let i; while ((i = buf.indexOf("\n\n")) >= 0) {
          const khoi = buf.slice(0, i); buf = buf.slice(i + 2);
          if (/^event: thay_doi$/m.test(khoi)) {
            let d = {}; try { d = JSON.parse(khoi.match(/^data: (.*)$/m)?.[1] ?? "{}"); } catch {}
            window.dispatchEvent(new CustomEvent("agv-thay-doi", { detail: d }));
          }
        }
      }
    } catch {}
    dangSong = window.__agvKenhSong = false; huy = null;
    if (!ac.signal.aborted && !document.hidden) { setTimeout(noi, cho); cho = Math.min(cho * 2, 30000); }
  };
  document.addEventListener("visibilitychange", () => { if (document.hidden) huy?.abort(); else if (!huy) { window.dispatchEvent(new CustomEvent("agv-thay-doi", { detail: { giao_dich: true, tin: true } })); noi(); } });
  noi();
  return () => dangSong;
}
let dangSong = false;
export const kenhSong = () => dangSong;

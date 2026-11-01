// Trò chuyện THẬT hai bên (màn 38) — cùng bố cục với bản mô phỏng tro-chuyen.js, dữ liệu từ backend:
// mỗi lời chào giá / hợp đồng với một bên mua là một hội thoại; tin qua /v1/messages, backend che liên lạc trước khi lưu.
import { esc, giuThamSo, phien } from "./chung.js";
const $ = (id) => document.getElementById(id);
const SVG = (p, w = 20) => `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${p}"/></svg>`;
const I = { lui: "M15 5l-7 7 7 7", khien: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z", canh: "M12 3l10 18H2zM12 10v5M12 18v.5", gui: "M4 12l16-8-6 16-2-7z", lich: "M4 5h16v16H4zM4 10h16M8 3v4M16 3v4", co: "M5 21V4h11l-2 4 2 4H5", giay: "M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8zM9 13h6M9 17h4", tich: "M5 12l5 5 9-10" };
const gioNgan = (s) => { const d = new Date(s), n = new Date(); return d.toDateString() === n.toDateString() ? d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" }); };
// Chữ viết tắt bên kia, cùng kiểu Trang chủ / Tin nhắn (NB = Nhà hàng Bếp Sen, NĐ = Nhà máy sấy Đồng Xanh)
const vietTat = (ten = "") => { const t = ten.trim().split(/\s+/); const sau = t.slice(1).find((x) => /^\p{Lu}/u.test(x)); return (t[0]?.[0] ?? "") + (sau?.[0] ?? t[1]?.[0] ?? ""); };
const TT_CHAO = { sent: "đang chờ trả lời", accepted: "đã đồng ý giá" };
const KHOA = "agv-tc-that-da-xem";
const daXem = () => { try { return JSON.parse(localStorage.getItem(KHOA) || "{}"); } catch { return {}; } };
const ghiXem = (ma, luc) => { try { const x = daXem(); x[ma] = luc; localStorage.setItem(KHOA, JSON.stringify(x)); } catch {} };

let token = null, ds = [];
const goi = async (duong, than) => {
  const r = await fetch(duong, than ? { method: "POST", headers: { "content-type": "application/json", authorization: "Bearer " + token }, body: JSON.stringify({ idempotency_key: crypto.randomUUID(), ...than }) } : { headers: { authorization: "Bearer " + token } });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error([j.errors?.[0]?.message, j.errors?.[0]?.fix].filter(Boolean).join(" ") || `Lỗi ${r.status}`);
  return j;
};

/** Tải danh sách hội thoại: lời chào còn mở + hợp đồng chưa xong, kèm tin cuối. */
export async function tai() {
  token = await phien();
  const [chao, don, tom] = await Promise.all([goi("/v1/offers").catch(() => []), goi("/v1/orders").catch(() => []), goi("/v1/messages/summary").catch(() => [])]);
  const dsChao = Array.isArray(chao) ? chao : chao.items || [];
  const coDon = new Set(don.map((d) => d.offer_id).filter(Boolean));
  const xem = daXem();
  ds = [
    ...don.filter((d) => !/cancel|declin|withdrawn/.test(d.status)).map((d) => ({ ma: "d-" + d.id, loai: "don", id: d.id, ben: d.buyer_name || "Bên mua", ghi: `Hợp đồng ${d.code}` })),
    ...dsChao.filter((c) => /sent|accepted/.test(c.status) && !coDon.has(c.id)).map((c) => ({ ma: "o-" + c.id, loai: "chao", id: c.id, ben: c.buyer_name || "Bên mua", ghi: [c.vong_cuoi ? `${Number(c.vong_cuoi.qty_g) / 1000} kg · ${Number(c.vong_cuoi.price_vnd).toLocaleString("vi-VN")} đ/kg` : null, TT_CHAO[c.status] ?? c.status, `lô ${c.lot_code}`].filter(Boolean).join(" · ") })),
  ];
  for (const h of ds) {
    const t = tom.find((x) => (h.loai === "don" ? x.order_id === h.id : x.offer_id === h.id));
    h.cuoi = t ? { chu: `${t.la_cua_toi ? "Bác: " : ""}${t.body}`, luc: t.created_at, cuaToi: t.la_cua_toi } : null;
    h.chuaDoc = t && !t.la_cua_toi && (!xem[h.ma] || new Date(t.created_at) > new Date(xem[h.ma])) ? 1 : 0;
  }
  ds.sort((a, b) => new Date(b.cuoi?.luc || 0) - new Date(a.cuoi?.luc || 0));
  return ds;
}
export const soChuaDoc = () => ds.reduce((t, h) => t + h.chuaDoc, 0);
export const timHoiThoai = (ma) => ds.find((x) => x.ma === ma);

// ── Danh sách hội thoại ──
export function veDanhSach(khoi) {
  khoi.innerHTML = `
    <div class="tc-khoa-bao">${SVG(I.khien)}<span>Nhắn qua AgiViet để có bằng chứng khi tranh chấp. Số điện thoại, Zalo, số tài khoản trong tin sẽ bị che.</span></div>
    ${ds.length ? `<div class="tc-ds">${ds.map((h) => `<a class="tc-dong ${h.chuaDoc ? "tc-moi" : ""}" href="./ban-tin-nhan.html${esc(location.search)}#tro=${h.ma}" data-tro="${h.ma}"><span class="tc-anh">${esc(vietTat(h.ben))}</span>
        <span style="min-width:0"><b>${esc(h.ben)}</b><small>${esc(h.cuoi?.chu || `${h.ghi} · chưa có tin nhắn`)}</small></span>
        <span class="tc-ben"><span>${h.cuoi ? esc(gioNgan(h.cuoi.luc)) : ""}</span>${h.chuaDoc ? `<span class="tc-dem">${h.chuaDoc}</span>` : ""}</span></a>`).join("")}</div>`
      : `<p class="tc-ghi" style="padding:16px 4px">Chưa có ai để nhắn. Khi bên mua chào giá lô hàng của bác, cuộc trò chuyện sẽ hiện ở đây.</p>`}`;
  giuThamSo(khoi);
}

// ── Khung chat ──
const veTin = (m) => m.k === "he"
  ? `<div class="tc-he ${m.canh ? "tc-canh" : ""}">${m.trau ? `<img src="/assets/trau/tu-the/18-canh-bao.webp" width="56" height="56" alt="">` : SVG(m.canh ? I.canh : I.khien, 16)}<span>${esc(m.t)}</span></div>`
  : `<div class="tc-tin ${m.cuaToi ? "tc-toi" : "tc-ho"}">${esc(m.t).replace(/•••[ •]*/g, (x) => `<span class="tc-che">${x}</span>`)}<small>${esc(gioNgan(m.luc))}${m.daChe ? " · đã che liên lạc" : ""}</small></div>`;

export function veChat(h) {
  const cuoc = h.loai === "don" ? { order_id: h.id } : { offer_id: h.id };
  const den = h.loai === "don" ? `./ban-don.html${location.search}${location.search ? "&" : "?"}id=${encodeURIComponent(h.id)}` : `./ban-tin-nhan.html${location.search}#chao=${h.id}`;
  $("dau").innerHTML = `<button class="nut-tron" type="button" id="dong" aria-label="Quay lại">${SVG(I.lui, 22)}</button><div style="flex:1;min-width:0"><p class="chao">${esc(h.ghi)}</p><h1>${esc(h.ben)}</h1></div>`;
  $("dong").onclick = () => { location.href = "./ban-tin-nhan.html" + location.search + "#tro"; };
  $("noi").innerHTML = `<div class="tc-chat" id="chat"><div class="tc-he">${SVG(I.khien, 16)}<span>Tin nhắn lưu trong app làm bằng chứng. Số điện thoại, Zalo, số tài khoản sẽ bị che.</span></div><div id="tin"></div></div>`;
  const day = document.createElement("div"); day.className = "tc-day";
  day.innerHTML = `<div class="tc-nhanh"><a href="${esc(den)}" class="tc-nut-lk">${SVG(I.giay, 18)}${h.loai === "don" ? "Mở hợp đồng" : "Xem lời chào"}</a><button type="button" id="hen">${SVG(I.lich, 18)}Hẹn xem vườn</button><button type="button" id="bao">${SVG(I.co, 18)}Báo cáo</button></div>
    <div class="tc-go tc-hai-cot"><textarea id="go" rows="1" placeholder="Nhắn cho ${esc(h.ben)}" aria-label="Nội dung tin nhắn" maxlength="1000"></textarea><button type="button" class="tc-gui" id="gui" aria-label="Gửi">${SVG(I.gui, 22)}</button></div>`;
  document.querySelector(".trang").appendChild(day);
  giuThamSo(day);
  const he = []; // dòng hệ thống chỉ hiện ở máy này (cảnh báo che, đã gửi báo cáo)
  let hen = 0, soCu = -1;
  const tai = async (cuon) => {
    clearTimeout(hen);
    try {
      const r = await goi(`/v1/messages?${h.loai === "don" ? "order_id" : "offer_id"}=${h.id}`);
      const tin = r.tin.map((m) => ({ k: "tin", t: m.body, cuaToi: m.la_cua_toi, luc: m.created_at, daChe: m.da_che }));
      const tat = [...tin, ...he];   // dòng hệ thống (che liên lạc, đã báo cáo) luôn ở sau tin vừa gửi — không sắp theo giờ máy
      if (tat.length !== soCu) {
        $("tin").innerHTML = tat.length ? tat.map(veTin).join("") : `<div style="display:grid;justify-items:center;gap:6px;padding:12px"><img src="/assets/trau/tu-the/04-nghe.webp" width="110" height="110" alt=""><p class="tc-ghi" style="text-align:center;margin:0">Chưa có tin nhắn. Bác nhắn ngày hái, hỏi lịch xe và cách trả tiền ở đây.</p></div>`;
        if (cuon || soCu >= 0) scrollTo({ top: document.body.scrollHeight, behavior: soCu >= 0 ? "smooth" : "auto" });
        soCu = tat.length;
      }
      const cuoiHo = r.tin.filter((m) => !m.la_cua_toi).at(-1); if (cuoiHo) ghiXem(h.ma, cuoiHo.created_at);
    } catch (e) { $("tin").innerHTML = `<p class="bao loi">${esc(e.message)}</p>`; }
    hen = setTimeout(() => tai(false), 4000);
  };
  const go = $("go");
  go.addEventListener("input", () => { go.style.height = "auto"; go.style.height = Math.min(120, go.scrollHeight) + "px"; });
  const gui = async (chu) => {
    chu = chu.trim(); if (!chu) return;
    $("gui").disabled = true;
    try {
      const kq = await goi("/v1/messages", { ...cuoc, body: chu });
      go.value = ""; go.style.height = "auto";
      if (kq.data?.da_che) he.push({ k: "he", canh: true, trau: true, t: kq.data.canh_bao, luc: new Date().toISOString() });
      await tai(true);
    } catch (e) { he.push({ k: "he", canh: true, t: e.message, luc: new Date().toISOString() }); soCu = -2; await tai(true); }
    $("gui").disabled = false; go.focus();
  };
  $("gui").addEventListener("click", () => gui(go.value));
  go.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); gui(go.value); } });
  const tam = (html, gan) => {
    const n = document.createElement("div"); n.className = "tc-che-nen";
    n.innerHTML = `<div class="tc-tam" role="dialog" aria-modal="true">${html}</div>`;
    const dong = () => n.remove();
    n.addEventListener("click", (e) => { if (e.target === n || e.target.closest("[data-dong]")) dong(); });
    document.body.appendChild(n); gan?.(n, dong);
  };
  $("hen").addEventListener("click", () => tam(`<h2>Hẹn xem vườn</h2><label>Ngày<input type="date" id="ngay-hen"></label><label>Giờ<input id="gio-hen" value="8:00"></label><p class="tc-ghi">Lời hẹn gửi thành tin nhắn cho ${esc(h.ben)}. Địa chỉ chi tiết chỉ gửi khi hai bên đồng ý lịch hẹn.</p><div class="tc-tam-day"><button class="nut phu-nut" type="button" data-dong>Đóng</button><button class="nut chinh-nut" type="button" id="gui-hen">Gửi lời hẹn</button></div>`,
    (n, dong) => n.querySelector("#gui-hen").addEventListener("click", () => {
      const ngay = n.querySelector("#ngay-hen").value, gio = n.querySelector("#gio-hen").value.trim();
      dong(); gui(`Mời bên mình qua xem vườn${ngay ? " ngày " + ngay.split("-").reverse().join("/") : ""} lúc ${gio || "8:00"}. Bên mình xác nhận giúp nha.`);
    })));
  $("bao").addEventListener("click", () => tam(`<h2>Báo cáo ${esc(h.ben)}</h2>${["Đòi số điện thoại, Zalo trước khi có cọc", "Ép giá, dọa bỏ", "Nói lời khiếm nhã", "Nghi lừa đảo"].map((t, i) => `<label style="flex-direction:row;display:flex;gap:10px;align-items:center;min-height:48px;font-weight:500;color:var(--muc)"><input type="radio" name="bc" value="${esc(t)}" ${i ? "" : "checked"} style="width:22px;min-height:22px">${t}</label>`).join("")}<div class="tc-tam-day"><button class="nut phu-nut" type="button" data-dong>Đóng</button><button class="nut chinh-nut" type="button" id="gui-bc">Gửi báo cáo</button></div>`,
    (n, dong) => n.querySelector("#gui-bc").addEventListener("click", async () => {
      const ly = n.querySelector("[name=bc]:checked").value; dong();
      try { await goi("/v1/support", { message: `Báo cáo ${h.ben} (${h.ghi}): ${ly}`, ...(h.loai === "don" ? { order_id: h.id } : {}) }); he.push({ k: "he", t: "AgiViet đã nhận báo cáo của bác, nhân viên sẽ xem và gọi lại.", luc: new Date().toISOString() }); }
      catch (e) { he.push({ k: "he", canh: true, t: e.message, luc: new Date().toISOString() }); }
      soCu = -2; tai(true);
    })));
  tai(true);
}

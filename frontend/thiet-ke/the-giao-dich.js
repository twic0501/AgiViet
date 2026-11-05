// Thẻ giao dịch trong khung chat, dùng chung app bán + app mua: giá → điều khoản → tạo hợp đồng → tới lượt ai.
// Mọi thay đổi đều qua nút của người dùng; số giá trong tin nhắn chỉ thành gợi ý "Gửi giá này", bấm mới có hiệu lực.

/** Đọc giá đ/kg từ câu nhắn: "14.700", "15 ngàn", "14ngàn 700", "14k7", "14,5 ngàn". Không có giá → null. */
export function docGia(tin) {
  const t = String(tin || "").toLowerCase();
  let m = t.match(/(\d+)\s*(?:ngàn|ngan|nghìn|nghin|k)\s*(\d{1,3})\b/);
  if (m) return Number(m[1]) * 1000 + Number(m[2].padEnd(3, "0"));
  m = t.match(/(\d+(?:[.,]\d+)?)\s*(?:ngàn|ngan|nghìn|nghin|k)\b/);
  if (m) return Math.round(Number(m[1].replace(",", ".")) * 1000);
  m = t.match(/\b(\d{1,3}(?:[.,]\d{3})+|\d{4,7})\b/);
  if (m) { const n = Number(m[1].replace(/[.,]/g, "")); return n >= 1000 ? n : null; }
  return null;
}

const vnd = (n) => Number(n || 0).toLocaleString("vi-VN");
const kg = (g) => vnd(Number(g || 0) / 1000);
const e = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const ngay = (s) => new Date(s).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
const TRA = { on_receipt: "Trả khi nhận hàng", inspect_then_before_loading: "Kiểm tại vườn, trả rồi mới bốc" };
const XE = { buyer: "Bên mua lo xe", seller: "Người bán lo xe" };
const CSS = `.tgd{display:grid;gap:8px;margin:8px 0;padding:12px;border:1.5px solid #1f4d3a;border-radius:14px;background:#fffdf7;color:#1f2a22}
.tgd b.g{font-size:18px}.tgd p{margin:0;font-size:14px;line-height:1.4}.tgd .ghi{color:#55604f}.tgd .hang{display:flex;gap:8px;flex-wrap:wrap}
.tgd button,.tgd a.n{min-height:44px;padding:0 14px;border-radius:12px;border:1.5px solid #1f4d3a;background:#fff;color:#1f4d3a;font:600 15px inherit;cursor:pointer;display:inline-flex;align-items:center;text-decoration:none}
.tgd .c{background:#1f4d3a;color:#fff}.tgd label{display:grid;gap:4px;font-size:14px;font-weight:600}.tgd input,.tgd select{min-height:44px;width:100%;box-sizing:border-box;padding:0 10px;border:1.5px solid #b9bfae;border-radius:10px;font:inherit;background:#fff}
.tgd dl{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;margin:0;font-size:14px}.tgd dd{margin:0;font-weight:600}.tgd .loi{color:#a12c22}`;

const veDK = (b) => `<dl><dt>Ngày giao</dt><dd>${ngay(b.delivery_from)}</dd><dt>Giá xuống loại</dt><dd>${vnd(b.downgrade_price_vnd)} đ/kg</dd><dt>Trả tiền</dt><dd>${e(TRA[b.payment_timing] || b.payment_timing)}</dd><dt>Xe</dt><dd>${e(XE[b.transport_by] || b.transport_by)}</dd></dl>${b.ghi_chu ? `<p class="ghi">Ghi chú: ${e(b.ghi_chu)}</p>` : ""}`;
const formDK = (b) => `<div data-fdk style="display:grid;gap:8px"><label>Ngày giao<input type="date" data-f="ngay" value="${new Date(b.delivery_from).toISOString().slice(0, 10)}"></label>
<label>Giá xuống loại (đ/kg)<input inputmode="numeric" data-f="hc" value="${Number(b.downgrade_price_vnd)}"></label>
<label>Trả tiền<select data-f="tra">${Object.entries(TRA).map(([k, v]) => `<option value="${k}"${k === b.payment_timing ? " selected" : ""}>${v}</option>`).join("")}</select></label>
<label>Xe<select data-f="xe">${Object.entries(XE).map(([k, v]) => `<option value="${k}"${k === b.transport_by ? " selected" : ""}>${v}</option>`).join("")}</select></label>
<label>Ghi chú<input maxlength="300" data-f="ghi" value="${e(b.ghi_chu || "")}"></label><button class="c" data-l="gui-dk">Gửi đề xuất cho bên kia</button></div>`;

/** ctx: { goi(path, body) → dữ liệu, cuoc: {offer_id}|{order_id}, linkDon(id), nguoiNhan(), sauLam() }. Trả về { ve(tinCuoiCuaToi) }. */
export function gnTheGD(o, ctx) {
  if (!document.getElementById("tgd-css")) document.head.append(Object.assign(document.createElement("style"), { id: "tgd-css", textContent: CSS }));
  let cu = "", sua = false, tinCuoi = "", loiCu = "", lc = null, dk = null;
  const the = (x) => `<section class="tgd" aria-live="polite">${x}${loiCu ? `<p class="loi" role="alert">${e(loiCu)}</p>` : ""}</section>`;
  const theDon = async (id) => { const d = await ctx.goi(`/v1/orders/${id}`); const tl = d.hien_thi?.toi_luot, toi = tl && tl.phia === ctx.ben;
    return the(`<b>Hợp đồng ${e(d.code)} · ${e(d.hien_thi?.ten || d.status)}</b><p>${tl ? `${toi ? "Tới lượt bạn" : tl.phia === "ops" ? "AgiViet" : "Bên kia"}: ${e(tl.viec)}` : ""}</p><a class="n ${toi ? "c" : ""}" href="${ctx.linkDon(id)}">${toi ? "Làm bước này" : "Mở hợp đồng"}</a>`); };
  const html = async () => {
    if (ctx.cuoc.order_id) return theDon(ctx.cuoc.order_id);
    lc = await ctx.goi(`/v1/offers/${ctx.cuoc.offer_id}`);
    const v = lc.rounds?.at(-1); if (!v) return "";
    if (lc.hold?.order_id) return theDon(lc.hold.order_id);
    const gia = `<b class="g">${vnd(v.price_vnd)} đ/kg</b> × ${kg(v.qty_g)} kg`;
    if (lc.status === "sent") {
      if (!lc.toi_luot_toi) return the(`<p>Giá bạn đưa: ${gia}</p><p class="ghi">Chờ bên kia trả lời.</p>`);
      const g = docGia(tinCuoi), dangDoi = g && g !== Number(v.price_vnd);
      return the(`<p>Bên kia đưa: ${gia}</p>${dangDoi ? `<button class="c" data-l="gia-chat" data-g="${g}">Gửi giá ${vnd(g)} đ/kg vào lời chào</button>` : ""}
        <div class="hang"><button class="${dangDoi ? "" : "c"}" data-l="dong-y">Đồng ý giá này</button><button data-l="mo-tra">Đổi giá${lc.luot_tra_gia_con != null ? ` (còn ${lc.luot_tra_gia_con} lần)` : ""}</button><button data-l="tu-choi">Không chốt</button></div>
        <div data-otra hidden style="display:grid;gap:8px"><label>Giá mới (đ/kg)<input inputmode="numeric" data-gia></label><label>Lượng (kg)<input inputmode="numeric" data-kg value="${Number(v.qty_g) / 1000}"></label><button class="c" data-l="gui-gia">Gửi giá mới</button></div>`);
    }
    if (lc.status !== "accepted") return the(`<p>Lời chào đã đóng. Giá cuối ${gia}.</p>`);
    dk = await ctx.goi(`/v1/offers/${ctx.cuoc.offer_id}/terms`);
    const dau = `<b>Hai bên đã chốt ${gia}</b>`, ban = dk.ban || dk.mac_dinh;
    if (sua) return the(`${dau}<p>Đề xuất điều khoản hợp đồng:</p>${formDK(ban)}`);
    if (dk.trang_thai === "da_thong_nhat") return the(`${dau}<p>Hai bên đã thống nhất điều khoản:</p>${veDK(ban)}${ctx.ben === "buyer" ? `<button class="c" data-l="tao-hd">Tạo hợp đồng để ký</button>` : `<p class="ghi">Chờ bên mua tạo hợp đồng để ký.</p>`}`);
    if (dk.trang_thai === "cho_tra_loi") return the(`${dau}<p>${dk.de_xuat_boi === ctx.ben ? "Bạn đã đề xuất, chờ bên kia trả lời" : "Bên kia đề xuất điều khoản"} (bản ${dk.phien_ban}):</p>${veDK(ban)}${dk.de_xuat_boi === ctx.ben ? "" : `<div class="hang"><button class="c" data-l="dk-dy">Đồng ý điều khoản</button><button data-l="mo-sua">Đề xuất sửa</button><button data-l="dk-tc">Không đồng ý</button></div>`}`);
    return the(`${dau}<p>${dk.trang_thai === "bi_tu_choi" ? "Điều khoản vừa bị từ chối. Sửa lại rồi gửi:" : "Bước tiếp: thống nhất điều khoản hợp đồng."}</p>${veDK(ban)}<div class="hang"><button class="c" data-l="gui-mac-dinh">Gửi điều khoản này</button><button data-l="mo-sua">Sửa trước khi gửi</button></div>`);
  };
  const ve = async (tin, ep) => {
    if (tin !== undefined) tinCuoi = tin;
    if (!ep && o.contains(document.activeElement) && /INPUT|SELECT/.test(document.activeElement.tagName)) return;
    if (!ep && !o.querySelector("[data-otra]")?.hidden && o.querySelector("[data-otra]")) return;
    const h = await html().catch((x) => the(`<p class="loi">${e(x.message)}</p>`));
    if (h !== cu) { cu = h; o.innerHTML = h; }
  };
  const lam = async (f) => { loiCu = ""; try { await f(); sua = false; ctx.sauLam?.(); } catch (x) { loiCu = x.message; } await ve(undefined, true); };
  const O = () => `/v1/offers/${ctx.cuoc.offer_id}`;
  o.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-l]"); if (!b) return; const l = b.dataset.l;
    if (l === "mo-tra") { o.querySelector("[data-otra]").hidden = false; return; }
    if (l === "mo-sua") { sua = true; return ve(undefined, true); }
    b.disabled = true;
    const v = lc?.rounds?.at(-1), gom = () => { const q = (k) => o.querySelector(`[data-f="${k}"]`).value, tu = new Date(`${q("ngay")}T07:00:00+07:00`);
      return { delivery_from: tu.toISOString(), delivery_to: new Date(tu.getTime() + 8 * 36e5).toISOString(), payment_timing: q("tra"), downgrade_price_vnd: Number(q("hc").replace(/\D/g, "")), transport_by: q("xe"), ghi_chu: q("ghi") }; };
    const tac = { "dong-y": () => ctx.goi(`${O()}/accept`, { expected_revision: lc.revision }), "tu-choi": () => ctx.goi(`${O()}/reject`, {}),
      "gia-chat": () => ctx.goi(`${O()}/counter`, { price_vnd: Number(b.dataset.g), qty_g: Number(v.qty_g) }),
      "gui-gia": () => { const g = Number(o.querySelector("[data-gia]").value.replace(/\D/g, "")), k = Number(o.querySelector("[data-kg]").value); if (!(g >= 1000 && k > 0)) throw new Error("Nhập giá và lượng hợp lệ."); return ctx.goi(`${O()}/counter`, { price_vnd: g, qty_g: Math.round(k * 1000) }); },
      "gui-mac-dinh": () => ctx.goi(`${O()}/terms`, dk.ban || dk.mac_dinh), "gui-dk": () => ctx.goi(`${O()}/terms`, gom()),
      "dk-dy": () => ctx.goi(`${O()}/terms/accept`, { phien_ban: dk.phien_ban }), "dk-tc": () => ctx.goi(`${O()}/terms/reject`, { phien_ban: dk.phien_ban }),
      "tao-hd": async () => ctx.goi("/v1/orders", { offer_id: lc.id, delivery_mode: "at_farm", designated_receiver_user_id: await ctx.nguoiNhan(), silent_accept_hours: 2 }) }[l];
    lam(tac);
  });
  return { ve };
}

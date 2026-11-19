// Thẻ giao dịch trong khung chat, dùng chung app bán + app mua: giá → điều khoản → tạo hợp đồng → tới lượt ai.
// Mọi thay đổi đều qua nút của người dùng; số giá trong tin nhắn chỉ thành gợi ý "Gửi giá này", bấm mới có hiệu lực.

/** Đọc giá đ/kg từ câu nhắn: "14.700", "15 ngàn", "14ngàn 700", "14k7", "14,5 ngàn". Không có giá → null. */
export function docGia(tin) {
  const t = String(tin || "").toLowerCase();
  let m = t.match(/(\d+)\s*(?:ngàn|ngan|nghìn|nghin|k)?\s*(?:rưỡi|rưởi|ruoi)/);
  if (m) return Number(m[1]) * 1000 + 500;
  m = t.match(/(\d+)\s*(?:ngàn|ngan|nghìn|nghin|k)\s*(\d{1,3})\b/);
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
const ngay = (s) => new Date(s).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" });
const TRA = { on_receipt: "Trả khi nhận hàng", inspect_then_before_loading: "Kiểm tại vườn, trả rồi mới bốc" };
const XE = { buyer: "Người mua lo xe", seller: "Người bán lo xe" };
const CSS = `.tgd{display:grid;gap:8px;margin:8px 0;padding:12px;border:1.5px solid #1f4d3a;border-radius:14px;background:#fffdf7;color:#1f2a22}
.tgd b.g{font-size:18px}.tgd p{margin:0;font-size:14px;line-height:1.4}.tgd .ghi{color:#55604f}.tgd .hang{display:flex;gap:8px;flex-wrap:wrap}
.tgd button,.tgd a.n{min-height:44px;padding:0 14px;border-radius:12px;border:1.5px solid #1f4d3a;background:#fff;color:#1f4d3a;font-family:inherit;font-weight:600;font-size:15px;cursor:pointer;display:inline-flex;align-items:center;text-decoration:none}
.tgd .c{background:#1f4d3a;color:#fff}.tgd label{display:grid;gap:4px;font-size:14px;font-weight:600}.tgd input,.tgd select{min-height:44px;width:100%;box-sizing:border-box;padding:0 10px;border:1.5px solid #b9bfae;border-radius:10px;font:inherit;background:#fff}
.tgd dl{display:grid;grid-template-columns:auto 1fr;gap:6px 10px;margin:0;font-size:14px}.tgd dd{margin:0;font-weight:600;display:flex;flex-wrap:wrap;gap:6px;align-items:center}.tgd dd select{min-height:36px;width:auto;font-size:13px}.tgd .loi{color:#a12c22}.tgd .gom-dai{margin:0;padding:6px 10px;border-radius:10px;background:#e7efe5;color:#1f4d3a;font-size:13px;font-weight:600}
.tgd details{border-top:1px solid #e3ddcc;padding:8px 0}.tgd summary{font-weight:600;font-size:14px;cursor:pointer;min-height:28px}.tgd details p{margin-top:6px}
.tgd .mr{display:grid;gap:6px;padding:8px;border-radius:10px;background:#f4efe2}.tgd textarea{width:100%;box-sizing:border-box;padding:8px 10px;border:1.5px solid #b9bfae;border-radius:10px;font:inherit;background:#fff}
.tgd .yk{font-size:12px;padding:2px 8px;border-radius:999px;background:#f6dcd5;color:#a12c22}.tgd .yk.sua{background:#f7ecc8;color:#6b4e00}`;

// Mục điều khoản: 4 mục cố định + mục riêng hai bên tự thêm. Khóa dùng cho ý kiến từng mục (y_kien).
const YK = { dong_y: "Đồng ý", sua: "Cần sửa", khong: "Không đồng ý" };
const cacMuc = (b) => [["ngay_giao", "Ngày giao", ngay(b.delivery_from)], ["xuong_loai", "Giá xuống loại", `${vnd(b.downgrade_price_vnd)} đ/kg`],
  ["tra_tien", "Trả tiền", TRA[b.payment_timing] || b.payment_timing], ["xe", "Xe", XE[b.transport_by] || b.transport_by],
  ...(b.ghi_chu ? [["ghi_chu", "Ghi chú", b.ghi_chu]] : []), ...(b.muc_rieng || []).map((m, i) => [`rieng:${i}`, m.ten, m.noi_dung])];
const veDK = (b, yk?: Record<string, any>, chon?: any) => `<dl>${cacMuc(b).map(([k, t, v]) => `<dt>${e(t)}</dt><dd>${e(v)}${yk?.[k] && yk[k] !== "dong_y" ? ` <span class="yk ${yk[k]}">${YK[yk[k]]}</span>` : ""}${chon ? `<select data-yk="${k}" aria-label="Ý kiến về ${e(t)}">${Object.entries(YK).map(([a, n]) => `<option value="${a}">${n}</option>`).join("")}</select>` : ""}</dd>`).join("")}</dl>`;
const veKhung = (kc) => `<p><b>Khung điều khoản chung của AgiViet</b></p><p class="ghi">Áp cho mọi hợp đồng trên AgiViet. Đọc trước, sau đó hai bên thương lượng điều khoản riêng.</p>
  ${(kc?.muc || []).map((m) => `<details><summary>${e(m.ten)}</summary><p>${e(m.noi_dung)}</p></details>`).join("")}`;
const formDK = (b) => `<div data-fdk style="display:grid;gap:8px"><label>Ngày giao<input type="date" data-f="ngay" min="${new Date(Date.now() + 864e5 + 7 * 36e5).toISOString().slice(0, 10)}" value="${new Date(b.delivery_from).toISOString().slice(0, 10)}"></label>
<label>Giá xuống loại (đ/kg)<input inputmode="numeric" data-f="hc" value="${Number(b.downgrade_price_vnd)}"></label>
<label>Trả tiền<select data-f="tra">${Object.entries(TRA).map(([k, v]) => `<option value="${k}"${k === b.payment_timing ? " selected" : ""}>${v}</option>`).join("")}</select></label>
<label>Xe<select data-f="xe">${Object.entries(XE).map(([k, v]) => `<option value="${k}"${k === b.transport_by ? " selected" : ""}>${v}</option>`).join("")}</select></label>
<label>Ghi chú<input maxlength="300" data-f="ghi" value="${e(b.ghi_chu || "")}"></label>
<p><b>Mục riêng</b> <span class="ghi">(đóng gói, giờ cắt, chứng từ…)</span></p><div data-mrs style="display:grid;gap:8px">${(b.muc_rieng || []).map(dongMuc).join("")}</div>
<button data-l="them-muc">Thêm mục</button><button class="c" data-l="gui-dk">Gửi đề xuất cho bên kia</button></div>`;
const dongMuc = (m: Record<string, any> = {}) => `<div data-mr class="mr"><input maxlength="80" data-mt placeholder="Tên mục" aria-label="Tên mục" value="${e(m.ten || "")}"><textarea maxlength="400" data-mn rows="2" placeholder="Nội dung" aria-label="Nội dung mục">${e(m.noi_dung || "")}</textarea><button data-l="bo-muc">Bỏ mục</button></div>`;

/** ctx: { goi(path, body) → dữ liệu, cuoc: {offer_id}|{order_id}, linkDon(id), nguoiNhan(), sauLam() }. Trả về { ve(tinCuoiCuaToi) }. */
export function gnTheGD(o, ctx) {
  if (!document.getElementById("tgd-css")) document.head.append(Object.assign(document.createElement("style"), { id: "tgd-css", textContent: CSS }));
  let cu = "", sua = false, yKien = false, tinCuoi = "", loiCu = "", lc = null, dk = null, vongTin = null;
  // Lời chào thuộc đơn gom: một dòng nói rõ phần của hộ này trong tổng lượng (không lộ các hộ khác)
  const gomDai = () => { const g = lc?.don_gom, v = lc?.rounds?.at(-1); return g?.can_g && v ? `<p class="gom-dai">Thuộc đơn gom ${kg(g.can_g)} kg · ${ctx.ben === "seller" ? "phần của bác" : "phần hộ này"} ${kg(v.qty_g)} kg</p>` : ""; };
  const the = (x) => `<section class="tgd" aria-live="polite">${gomDai()}${x}${loiCu ? `<p class="loi" role="alert">${e(loiCu)}</p>` : ""}</section>`;
  const nutTua = async (d) => { // chỉ bản thử: chờ tới giờ giao thì tua được, có người khác đang thử thì báo rõ
    const cw = (d.dot_giao || []).map((x) => x.window_from).filter(Boolean)[0]; if (!cw) return "";
    const cap = await fetch("/frontend-capabilities.json").then((r) => r.json()).catch(() => ({})); if (!cap.test_tools) return "";
    const now = await fetch("/v1/test/clock").then((r) => r.json()).catch(() => ({})); if (!now.now || new Date(now.now) >= new Date(cw)) return "";
    return `<p class="ghi">Chưa tới giờ giao (${ngay(cw)}).</p><button data-l="tua" data-t="${cw}">Bản thử: tới giờ giao</button>`; };
  // Đã có hợp đồng: vẫn hiện điều khoản chính ngay trong chat (trước đây chỉ có trạng thái → người bán không biết đọc điều khoản ở đâu)
  const dkDon = (k) => !k || !k.unit_price_vnd ? "" : `<dl><dt>Lượng</dt><dd>${kg(k.qty_g)} kg</dd><dt>Giá</dt><dd>${vnd(k.unit_price_vnd)} đ/kg</dd>
    ${k.downgrade_price_vnd ? `<dt>Giá xuống loại</dt><dd>${vnd(k.downgrade_price_vnd)} đ/kg</dd>` : ""}<dt>Giá trị</dt><dd>${vnd(k.contract_value_vnd)} đ</dd>
    <dt>Cọc (ngân hàng giữ)</dt><dd>${vnd(k.deposit_vnd)} đ</dd><dt>Trả tiền</dt><dd>${e(TRA[k.payment_timing] || (k.payment_timing === "after_days" ? `Sau khi nhận ${k.pay_after_days} ngày` : k.payment_timing || ""))}</dd>
    ${k.delivery_from ? `<dt>Ngày nhận</dt><dd>${ngay(k.delivery_from)}</dd>` : ""}<dt>Xe</dt><dd>${e(XE[k.transport_by] || (k.delivery_mode === "at_farm" ? "Người mua lo xe" : "Theo hợp đồng"))}</dd></dl>`;
  const theDon = async (id) => { const d = await ctx.goi(`/v1/orders/${id}`); const tl = d.hien_thi?.toi_luot, toi = tl && tl.phia === ctx.ben;
    return the(`<b>Hợp đồng ${e(d.code)} · ${e(d.hien_thi?.ten || d.status)}</b><p>${tl ? `${toi ? "Tới lượt bạn" : tl.phia === "ops" ? "AgiViet" : "Bên kia"}: ${e(tl.viec)}` : ""}</p>
      ${dkDon(d.dieu_khoan)}<div class="hang"><a class="n ${toi ? "c" : ""}" href="${ctx.linkDon(id)}">${toi ? `${e(tl.viec)}` : "Đọc toàn bộ hợp đồng"}</a>${toi ? `<a class="n" href="${ctx.linkDon(id)}#dieu-khoan">Đọc toàn bộ hợp đồng</a>` : ""}</div>${await nutTua(d)}`); };
  const html = async () => {
    if (ctx.cuoc.order_id) return theDon(ctx.cuoc.order_id);
    lc = await ctx.goi(`/v1/offers/${ctx.cuoc.offer_id}`);
    const v = lc.rounds?.at(-1); if (!v) return "";
    if (lc.hold?.order_id) return theDon(lc.hold.order_id);
    const gia = `<b class="g">${vnd(v.price_vnd)} đ/kg</b> × ${kg(v.qty_g)} kg`;
    if (lc.status === "sent") {
      if (!lc.toi_luot_toi) return the(`<p>Giá bạn đưa: ${gia}</p><p class="ghi">Chờ bên kia trả lời.</p>`);
      // Giá trong tin chỉ gợi ý cho đúng vòng lúc nhắn; bên kia đã trả tiếp thì bỏ để khỏi bấm nhầm mất lượt
      if (vongTin === null) vongTin = v.round_no; const g0 = vongTin === v.round_no ? docGia(tinCuoi) : null, g = g0 && g0 >= Number(v.price_vnd) * 0.6 && g0 <= Number(v.price_vnd) * 1.6 ? g0 : null, dangDoi = g && g !== Number(v.price_vnd);
      return the(`<p>Bên kia đưa: ${gia}</p>${dangDoi ? `<button class="c" data-l="gia-chat" data-g="${g}">Gửi giá ${vnd(g)} đ/kg vào lời chào</button>` : ""}
        <div class="hang"><button class="${dangDoi ? "" : "c"}" data-l="dong-y">Đồng ý giá này</button><button data-l="mo-tra">Đổi giá${lc.luot_tra_gia_con != null ? ` (còn ${lc.luot_tra_gia_con} lần)` : ""}</button><button data-l="tu-choi">Không chốt</button></div>
        <div data-otra hidden style="display:grid;gap:8px"><label>Giá mới (đ/kg)<input inputmode="numeric" data-gia></label><label>Lượng (kg)<input inputmode="numeric" data-kg value="${Number(v.qty_g) / 1000}"></label><button class="c" data-l="gui-gia">Gửi giá mới</button></div>`);
    }
    if (lc.status !== "accepted") return the(`<p><b>Không thành giao dịch.</b> Giá sau cùng ${vnd(v.price_vnd)} đ/kg chưa được hai bên đồng ý.</p><p class="ghi">Muốn mua bán tiếp thì gửi lời chào mới ở lô này.</p>`);
    dk = await ctx.goi(`/v1/offers/${ctx.cuoc.offer_id}/terms`);
    const dau = `<b>Hai bên đã chốt ${gia}</b>`, ban = dk.ban || dk.mac_dinh;
    if (dk.da_doc_khung && !dk.da_doc_khung[dk.ben_toi]) return the(`${dau}<p>Bước 1/3: đọc khung điều khoản chung.</p>${veKhung(dk.khung_chung)}<button class="c" data-l="doc-khung">Tôi đã đọc khung điều khoản chung</button>`);
    if (yKien) return the(`${dau}<p>Ý kiến của bạn cho từng mục (bản ${dk.phien_ban}):</p>${veDK(ban, null, true)}<label>Lời nhắn cho bên kia<input maxlength="300" data-lydo placeholder="vd: giá xuống loại thấp quá"></label><div class="hang"><button class="c" data-l="gui-yk">Gửi ý kiến</button><button data-l="huy-yk">Quay lại</button></div>`);
    const benKia = dk.da_doc_khung ? (dk.da_doc_khung[dk.ben_toi === "buyer" ? "seller" : "buyer"] ? "" : `<p class="ghi">Bên kia chưa đọc khung điều khoản chung.</p>`) : "";
    const tc = dk.lich_su?.filter((x) => x.loai === "tu_choi").at(-1);
    if (sua) return the(`${dau}<p>Đề xuất điều khoản hợp đồng:</p>${formDK(ban)}`);
    if (dk.trang_thai === "da_thong_nhat") return the(`${dau}<p>Bước 3/3: hai bên đã thống nhất điều khoản, tạo hợp đồng để ký.</p>${veDK(ban)}${ctx.ben === "buyer" ? `<button class="c" data-l="tao-hd">Tạo hợp đồng để ký</button>` : `<p class="ghi">Chờ người mua tạo hợp đồng để ký.</p>`}`);
    if (dk.trang_thai === "cho_tra_loi") return the(`${dau}${benKia}<p>${dk.de_xuat_boi === ctx.ben ? "Bạn đã đề xuất, chờ bên kia trả lời" : "Bên kia đề xuất điều khoản"} (bản ${dk.phien_ban}):</p>${veDK(ban)}${dk.de_xuat_boi === ctx.ben ? "" : `<div class="hang"><button class="c" data-l="dk-dy">Đồng ý tất cả</button><button data-l="mo-yk">Có mục chưa ưng</button><button data-l="mo-sua">Tự sửa và gửi lại</button></div>`}`);
    const daTc = dk.trang_thai === "bi_tu_choi", cuaToi = daTc && tc?.ben !== dk.ben_toi;
    return the(`${dau}${benKia}<p>${daTc ? (cuaToi ? `Bên kia chưa đồng ý bản ${dk.phien_ban}${tc?.ly_do ? `: “${e(tc.ly_do)}”` : ""}. Sửa các mục được đánh dấu rồi gửi lại:` : "Bạn đã gửi ý kiến, chờ bên kia sửa lại.") : "Bước 2/3: thống nhất điều khoản riêng. Sửa, thêm hoặc bỏ mục rồi gửi bên kia."}</p>${veDK(ban, daTc ? tc?.y_kien : null)}<div class="hang"><button class="c" data-l="${daTc ? "mo-sua" : "gui-mac-dinh"}">${daTc ? "Sửa điều khoản" : "Gửi điều khoản này"}</button>${daTc ? "" : `<button data-l="mo-sua">Sửa trước khi gửi</button>`}</div>`);
  };
  const ve = async (tin?: string, ep?: boolean) => {
    if (tin !== undefined && tin !== tinCuoi) { tinCuoi = tin; vongTin = null; }
    if (!ep && o.contains(document.activeElement) && /INPUT|SELECT/.test(document.activeElement.tagName)) return;
    if (!ep && !o.querySelector("[data-otra]")?.hidden && o.querySelector("[data-otra]")) return;
    const h = await html().catch((x) => the(`<p class="loi">${e(x.message)}</p>`));
    if (h !== cu) { cu = h; o.innerHTML = h; }
    if (lc && ctx.dauTrang) { const v = lc.rounds?.at(-1), tt = lc.status === "sent" ? (lc.toi_luot_toi ? "tới lượt bạn" : "chờ bên kia") : lc.status === "accepted" ? "đã chốt giá" : "không thành"; if (v) ctx.dauTrang(`${kg(v.qty_g)} kg · ${vnd(v.price_vnd)} đ/kg · ${tt}`); }
  };
  const lam = async (f) => { loiCu = ""; try { await f(); sua = false; yKien = false; ctx.sauLam?.(); await ve(undefined, true); } catch (x) { loiCu = x.message; const c = o.querySelector(".loi") ?? o.querySelector(".tgd")?.appendChild(Object.assign(document.createElement("p"), { className: "loi" })); if (c) c.textContent = x.message; o.querySelectorAll("button").forEach((n) => (n.disabled = false)); } };
  const O = () => `/v1/offers/${ctx.cuoc.offer_id}`;
  o.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-l]"); if (!b) return; const l = b.dataset.l;
    if (l === "mo-tra") { o.querySelector("[data-otra]").hidden = false; return; }
    if (l === "mo-sua") { sua = true; yKien = false; return ve(undefined, true); }
    if (l === "mo-yk") { yKien = true; return ve(undefined, true); }
    if (l === "huy-yk") { yKien = false; return ve(undefined, true); }
    if (l === "them-muc") { const k = o.querySelector("[data-mrs]"); if (k.children.length < 8) k.insertAdjacentHTML("beforeend", dongMuc()); k.lastElementChild?.querySelector("input")?.focus(); return; }
    if (l === "bo-muc") { b.closest("[data-mr]").remove(); return; }
    if (l === "tu-choi" && !b.dataset.chac) { b.dataset.chac = "1"; b.textContent = "Bấm lần nữa để không chốt"; return; }
    b.disabled = true;
    const v = lc?.rounds?.at(-1), gom = () => { const q = (k) => o.querySelector(`[data-f="${k}"]`).value, tu = new Date(`${q("ngay")}T07:00:00+07:00`);
      return { delivery_from: tu.toISOString(), delivery_to: new Date(tu.getTime() + 8 * 36e5).toISOString(), payment_timing: q("tra"), downgrade_price_vnd: Number(q("hc").replace(/\D/g, "")), transport_by: q("xe"), ghi_chu: q("ghi"),
        muc_rieng: [...o.querySelectorAll("[data-mr]")].map((r) => ({ ten: r.querySelector("[data-mt]").value.trim(), noi_dung: r.querySelector("[data-mn]").value.trim() })).filter((m) => m.ten || m.noi_dung) }; };
    const tac = { tua: async () => { const r = await fetch("/v1/test/clock", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ set: b.dataset.t }) }); if (!r.ok) throw new Error((await r.json().catch(() => ({}))).errors?.[0]?.message || "Chưa tua giờ được."); },
      "dong-y": () => ctx.goi(`${O()}/accept`, { expected_revision: lc.revision }), "tu-choi": () => ctx.goi(`${O()}/reject`, {}),
      "gia-chat": () => ctx.goi(`${O()}/counter`, { price_vnd: Number(b.dataset.g), qty_g: Number(v.qty_g) }),
      "gui-gia": () => { const g = Number(o.querySelector("[data-gia]").value.replace(/\D/g, "")), k = Number(o.querySelector("[data-kg]").value); if (!(g >= 1000 && k > 0)) throw new Error("Nhập giá và lượng hợp lệ."); return ctx.goi(`${O()}/counter`, { price_vnd: g, qty_g: Math.round(k * 1000) }); },
      "gui-mac-dinh": () => ctx.goi(`${O()}/terms`, dk.ban || dk.mac_dinh), "gui-dk": () => ctx.goi(`${O()}/terms`, gom()),
      "dk-dy": () => ctx.goi(`${O()}/terms/accept`, { phien_ban: dk.phien_ban }), "gui-yk": () => { const y = Object.fromEntries([...o.querySelectorAll("[data-yk]")].map((x) => [x.dataset.yk, x.value])); if (Object.values(y).every((v) => v === "dong_y")) return ctx.goi(`${O()}/terms/accept`, { phien_ban: dk.phien_ban });
        return ctx.goi(`${O()}/terms/reject`, { phien_ban: dk.phien_ban, y_kien: y, ly_do: o.querySelector("[data-lydo]").value }); },
      "doc-khung": () => ctx.goi(`${O()}/terms/framework-read`, {}),
      "tao-hd": async () => ctx.goi("/v1/orders", { offer_id: lc.id, delivery_mode: "at_farm", designated_receiver_user_id: await ctx.nguoiNhan(), silent_accept_hours: 2 }) }[l];
    lam(tac);
  });
  return { ve };
}

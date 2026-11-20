// Giao nhận · nghiệm thu · trả tiền cho người bán · nhận tại kho — chuyển từ mua.html (veGiao/veNghiemThu/veTien/veDenNoi),
// giữ nguyên kiểm tra và API, đổi sang hệ class của app mua. Nghiệm thu theo món (buổi gọi hàng khung) vẫn ở màn cũ.
import { api, manCu } from "../api";
import { esc, gio, vnd } from "../ui";

type D = any;
const kgc = (kgv: number) => `${kgv.toLocaleString("vi-VN")} kg`;
const anhBase64 = (tep: File) => new Promise<string>((ok, l) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(",")[1]); r.onerror = l; r.readAsDataURL(tep); });
const veQr = async (el: HTMLElement | null, chuoi: string) => {
  if (!el || !chuoi) return;
  try { const { default: QR } = await import(/* @vite-ignore */ "/assets/qr.js" as string); const c = document.createElement("canvas"); await QR.toCanvas(c, chuoi, { width: 220, margin: 2, errorCorrectionLevel: "M" }); el.replaceChildren(c); } catch { /* không vẽ được QR: vẫn còn số tài khoản */ }
};
/** Gắn nút: tắt khi đang gửi, báo lỗi ngay dưới khối, xong thì vẽ lại màn đơn. */
const lam = (khoi: HTMLElement, lai: () => void) => async (nut: HTMLButtonElement, fn: () => Promise<unknown>) => {
  const b = khoi.querySelector<HTMLElement>("[data-bao]")!; nut.disabled = true; b.textContent = "Đang gửi…";
  try { await fn(); lai(); } catch (e) { b.textContent = (e as Error).message; nut.disabled = false; }
};

async function veGiao(o: HTMLElement, dot: D, lai: () => void) {
  const [rd, me] = await Promise.all([api<any[]>(`/v1/deliveries/${dot.id}/readiness`), api<any>("/v1/me")]);
  const xeOk = rd.find((x) => x.ma === "xe")?.ok, nhanOk = rd.find((x) => x.ma === "nguoi_nhan")?.ok;
  const xe = xeOk ? [] : ((await api<any[]>("/v1/vehicles").catch(() => [])) || []);
  o.insertAdjacentHTML("beforeend", `<section class="the" id="giao"><h2>Giao nhận · đợt ${dot.batch_no} (${kgc(Number(dot.planned_qty_g) / 1000)})</h2>
    <p><b>Nhận tại vườn ${esc(gio(dot.window_from))} – ${esc(new Date(dot.window_to).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }))}</b></p>
    ${rd.map((x) => `<p class="${x.ok ? "" : "phu"}"><span class="chip ${x.ok ? "la" : "do"}">${x.ok ? "Xong" : "Chưa"}</span> ${esc(x.ten)}${x.ok ? "" : ` — ${esc(x.ly_do || "chưa xong")}`}</p>`).join("")}
    <p>Người nhận: <b>${dot.receiver_user_id === me.user_id ? `Bạn (${esc(me.name)})` : dot.receiver_user_id ? "Thành viên khác của tổ chức" : "Chưa chỉ định"}</b></p>
    ${!dot.receiver_user_id ? `<button type="button" class="nut vien rong" id="g-nhan">Tôi sẽ nhận hàng</button>` : ""}
    ${!xeOk ? `<datalist id="g-bien-ds">${xe.map((x) => `<option value="${esc(x.plate_no)}">${kgc(Number(x.capacity_qty) / 1000)}</option>`).join("")}</datalist>
      <label class="o-nhap">Biển số xe<input id="g-bien" list="g-bien-ds" placeholder="Chọn xe trong danh sách" autocapitalize="characters"></label>
      <label class="o-nhap">Cước xe (đ, bạn trả nhà xe)<input id="g-cuoc" inputmode="numeric" placeholder="vd 1500000"></label>
      <button type="button" class="nut chinh rong" id="g-xe">Đặt xe</button>` : ""}
    ${nhanOk ? `<button type="button" class="nut ${xeOk ? "chinh" : "vien"} rong" id="g-qr">Hiện mã nhận hàng</button><div id="g-ma" class="the" hidden></div>` : ""}
    <p class="phu">Khi xe tới vườn, người nhận đưa mã này cho người bán quét để bắt đầu cân. Không đưa mã qua tin nhắn ngoài app.</p><p class="phu" data-bao role="status"></p></section>`);
  const k = o.querySelector<HTMLElement>("#giao")!, chay = lam(k, lai);
  k.querySelector<HTMLButtonElement>("#g-nhan")?.addEventListener("click", (e) => chay(e.currentTarget as HTMLButtonElement, () => api(`/v1/deliveries/${dot.id}/receiver`, { user_id: me.user_id })));
  k.querySelector<HTMLButtonElement>("#g-xe")?.addEventListener("click", (e) => {
    const bien = k.querySelector<HTMLInputElement>("#g-bien")!.value.trim().toUpperCase(), cuoc = Number(k.querySelector<HTMLInputElement>("#g-cuoc")!.value.replace(/\D/g, ""));
    if (!bien) { k.querySelector("[data-bao]")!.textContent = "Chọn một xe trong danh sách."; return; }
    chay(e.currentTarget as HTMLButtonElement, () => api(`/v1/deliveries/${dot.id}/trip`, { plate_no: bien, ...(cuoc ? { freight_vnd: cuoc } : {}) }));
  });
  k.querySelector<HTMLButtonElement>("#g-qr")?.addEventListener("click", async (e) => {
    const nut = e.currentTarget as HTMLButtonElement; nut.disabled = true;
    try { const r = await api<any>(`/v1/deliveries/${dot.id}/receipt-qr`, {}); const ma = r.qr_token ?? r.data?.qr_token, sau = String(r.ma_6_so ?? r.data?.ma_6_so ?? ""); const hop = k.querySelector<HTMLElement>("#g-ma")!; hop.hidden = false;
      hop.innerHTML = `${sau ? `<p>Đọc mã này cho người bán nhập:</p><p class="so" style="font-size:32px;font-weight:700;letter-spacing:6px">${esc(sau.slice(0, 3))} ${esc(sau.slice(3))}</p>` : ""}<div data-qr></div><p class="phu">Hết hạn ${r.expires_at ? esc(gio(r.expires_at)) : "theo đợt"}</p>`;
      await veQr(hop.querySelector("[data-qr]"), ma); k.querySelector("[data-bao]")!.textContent = ""; }
    catch (err) { k.querySelector("[data-bao]")!.textContent = (err as Error).message; } nut.disabled = false;
  });
}

async function veNghiemThu(o: HTMLElement, d: D, dot: D, lai: () => void) {
  if ((d.dong_mon || []).length) { // buổi gọi hàng khung: nhiều món, giữ màn cũ đã kiểm E2E
    o.insertAdjacentHTML("beforeend", `<section class="the"><h2>Nghiệm thu từng món · đợt ${dot.batch_no}</h2><a class="nut chinh rong" href="${manCu("chi-tiet-don", `don=${d.id}`)}">Nhập kết quả từng món</a></section>`); return;
  }
  const k0 = d.dieu_khoan || {}, gia = Number(k0.unit_price_vnd), giaHc = k0.downgrade_price_vnd ? Number(k0.downgrade_price_vnd) : null;
  const ly: any[] = d.san_pham?.code ? ((await fetch(`/v1/products/${d.san_pham.code}/profile`).then((r) => r.json()).then((j) => j.data ?? j).catch(() => ({}))).reject_reasons || []) : [];
  const chonLy = (id: string) => `<select id="${id}"><option value="">Chọn lý do</option>${ly.map((x) => `<option value="${esc(x.reason_code)}">${esc(x.label_vi)}${x.is_safety ? " (an toàn thực phẩm)" : ""}</option>`).join("")}</select>`;
  const keHoach = Number(dot.planned_qty_g) / 1000;
  o.insertAdjacentHTML("beforeend", `<section class="the" id="nt"><h2>Nghiệm thu · đợt ${dot.batch_no}</h2>
    <p class="phu">Đợt ${kgc(keHoach)}. Cân xong chia lượng cân thành ba phần. Người bán xem và đồng ý hoặc phản đối từng dòng.</p>
    <label class="o-nhap">Lượng cân thực tế (kg)<input id="nt-can" inputmode="decimal" value="${keHoach}"></label>
    <label class="o-nhap">Đạt (kg) · ${vnd(gia)} đ/kg<input id="nt-dat" inputmode="decimal" value="${keHoach}"></label>
    ${giaHc ? `<label class="o-nhap">Xuống loại (kg) · ${vnd(giaHc)} đ/kg<input id="nt-ha" inputmode="decimal" value="0"></label><label class="o-nhap" id="nt-ha-ly" hidden>Lý do xuống loại${chonLy("nt-ha-lydo")}</label>` : `<p class="phu">Hợp đồng không đặt giá xuống loại: hàng không đạt chỉ có thể trả lại.</p>`}
    <label class="o-nhap">Trả lại (kg) · 0 đ<input id="nt-tra" inputmode="decimal" value="0"></label><label class="o-nhap" id="nt-tra-ly" hidden>Lý do trả lại${chonLy("nt-tra-lydo")}</label>
    <label class="o-nhap" id="nt-anh-o" hidden>Ảnh chụp hàng không đạt (chụp tại chỗ)<input id="nt-anh" type="file" accept="image/*" capture="environment"></label>
    <label class="o-nhap">Mã niêm phong mẫu lưu<input id="nt-niem" placeholder="vd M-7710"></label>
    <p id="nt-tong" role="status"><b></b></p>
    <label class="o-nhap">Mã PIN ký biên bản (4 số · bản thử: 2468)<input id="nt-pin" inputmode="numeric" maxlength="4" type="password" autocomplete="off"></label>
    <button type="button" class="nut chinh rong" id="nt-gui">Ký và gửi kết quả cho người bán</button><p class="phu" data-bao role="status"></p></section>`);
  const k = o.querySelector<HTMLElement>("#nt")!, $n = <T extends HTMLElement = HTMLInputElement>(s: string) => k.querySelector<T>(s);
  const soKg = (s: string) => Number(($n(s)?.value || "0").replace(",", "."));
  const tinh = () => {
    const can = soKg("#nt-can"), dat = soKg("#nt-dat"), ha = soKg("#nt-ha"), tra = soKg("#nt-tra"), lech = Math.round((dat + ha + tra - can) * 1000) / 1000;
    const hl = $n<HTMLElement>("#nt-ha-ly"); if (hl) hl.hidden = !(ha > 0); $n<HTMLElement>("#nt-tra-ly")!.hidden = !(tra > 0); $n<HTMLElement>("#nt-anh-o")!.hidden = !(ha > 0 || tra > 0);
    $n<HTMLElement>("#nt-tong")!.innerHTML = lech ? `<b class="do">Ba phần cộng ${kgc(dat + ha + tra)}, lệch ${kgc(Math.abs(lech))} so với lượng cân.</b>` : `<b>Tiền hàng tạm tính: ${vnd(Math.round(dat * gia + ha * (giaHc || 0)))} đ</b>`;
    return { can, dat, ha, tra, lech };
  };
  k.oninput = tinh; tinh();
  $n<HTMLButtonElement>("#nt-gui")!.onclick = async (e) => {
    const nut = e.currentTarget as HTMLButtonElement, b = $n<HTMLElement>("[data-bao]")!, x = tinh();
    if (!(x.can > 0)) return void (b.textContent = "Nhập lượng cân.");
    if (x.lech) return void (b.textContent = "Ba phần phải cộng đúng lượng cân.");
    if (x.can > keHoach) return void (b.textContent = `Cân vượt lượng đợt (${kgc(keHoach)}). Chỉ ghi lượng hợp đồng, phần vượt cần phụ lục.`);
    if (x.ha > 0 && !$n<HTMLSelectElement>("#nt-ha-lydo")?.value) return void (b.textContent = "Chọn lý do xuống loại.");
    if (x.tra > 0 && !$n<HTMLSelectElement>("#nt-tra-lydo")?.value) return void (b.textContent = "Chọn lý do trả lại.");
    const tep = $n("#nt-anh")?.files?.[0];
    if ((x.ha > 0 || x.tra > 0) && !tep) return void (b.textContent = "Chụp ảnh hàng không đạt để người bán thấy chứng cứ.");
    if (!/^\d{4}$/.test($n("#nt-pin")!.value)) return void (b.textContent = "Nhập mã PIN 4 số.");
    nut.disabled = true; b.textContent = "Đang gửi…";
    try {
      const anhId = tep ? (await api<any>("/v1/files", { mime: tep.type || "image/jpeg", data_base64: await anhBase64(tep), entity: "delivery", entity_id: dot.id, captured_in_app: true })).id : undefined;
      const g = (v: number) => Math.round(v * 1000), lines: any[] = [{ kind: "accepted", qty_g: g(x.dat) }];
      if (x.ha > 0) lines.push({ kind: "downgraded", qty_g: g(x.ha), reason_code: $n<HTMLSelectElement>("#nt-ha-lydo")!.value, evidence_document_id: anhId });
      if (x.tra > 0) lines.push({ kind: "rejected", qty_g: g(x.tra), reason_code: $n<HTMLSelectElement>("#nt-tra-lydo")!.value, evidence_document_id: anhId });
      await api(`/v1/deliveries/${dot.id}/acceptance`, { weighed_g: g(x.can), lines, seal_code: $n("#nt-niem")!.value.trim() || undefined, pin: $n("#nt-pin")!.value });
      lai();
    } catch (err) { b.textContent = (err as Error).message; nut.disabled = false; }
  };
}

const TT_TIEN: Record<string, string> = { due: "Chưa trả", payer_reported: "Đã báo chuyển · chờ người bán xác nhận", partially_confirmed: "Người bán xác nhận một phần", confirmed: "Người bán đã xác nhận nhận đủ", fully_received: "Người bán đã xác nhận nhận đủ", mismatch: "Lệch số tiền · AgiViet đang xem" };
const KHOAN: Record<string, string> = { goods_on_receipt: "Tiền hàng khi nhận", goods_before_loading: "Tiền hàng trước khi bốc", goods_after_days: "Tiền hàng trả sau" };

async function veTienBan(o: HTMLElement, d: D, lai: () => void) {
  const ds = ((await api<any[]>(`/v1/orders/${d.id}/payments`).catch(() => [])) || []).filter((p) => p.direction === "buyer_to_seller");
  for (const p of ds) {
    const can = ["due", "partially_confirmed"].includes(p.status), xong = /confirmed|fully_received/.test(p.status);
    const hd = can ? await api<any>(`/v1/payments/${p.id}/instruction`).catch(() => null) : null;
    o.insertAdjacentHTML("beforeend", `<section class="the${can ? " toi-luot" : ""}" data-khoan="${p.id}">
      <div class="hang"><h2>${esc(KHOAN[p.kind] || "Khoản trả")}</h2><span class="chip ${xong ? "la" : can ? "do" : ""}">${esc(TT_TIEN[p.status] || p.status)}</span></div>
      <b class="so" style="font-size:28px">${vnd(hd ? hd.so_tien_con_vnd : p.amount_due_vnd)} đ</b>
      ${p.due_at ? `<p><b>Hạn trả: ${esc(gio(p.due_at))}</b></p>` : ""}
      ${hd?.tai_khoan ? `<div data-qr></div>
        <p>${esc(hd.tai_khoan.ngan_hang)} · ${esc(hd.tai_khoan.chu_tai_khoan)}</p>
        <div class="hang"><b class="so" style="font-size:20px">${esc(hd.tai_khoan.so_tai_khoan)}</b><button type="button" class="nut vien" data-chep="${esc(hd.tai_khoan.so_tai_khoan)}">Chép</button></div>
        <div class="hang"><span>Nội dung: <b>${esc(hd.noi_dung)}</b></span><button type="button" class="nut vien" data-chep="${esc(hd.noi_dung)}">Chép</button></div>
        ${hd.canh_bao ? `<p class="chip do"><b>Cẩn thận:</b> ${esc(hd.canh_bao)}. Gọi AgiViet nếu người bán nhắn đổi số tài khoản ngoài hợp đồng.</p>` : ""}
        <p class="phu">${esc(hd.cau)}</p>
        <label class="o-nhap">Số tiền bạn đã chuyển (đ)<input data-so inputmode="numeric" value="${Number(hd.so_tien_con_vnd)}"></label>
        <label class="o-nhap">Ảnh biên lai chuyển khoản<input data-anh type="file" accept="image/*"></label>
        <button type="button" class="nut chinh rong" data-bao-chuyen>Báo đã chuyển cho người bán</button>
        <p class="phu">Người bán kiểm tài khoản rồi xác nhận. Chỉ khi người bán xác nhận mới tính là đã trả.</p>` : ""}
      <p class="phu" data-bao role="status"></p></section>`);
    const k = o.querySelector<HTMLElement>(`[data-khoan="${p.id}"]`)!;
    if (hd?.vietqr) await veQr(k.querySelector("[data-qr]"), hd.vietqr);
    k.querySelectorAll<HTMLButtonElement>("[data-chep]").forEach((b) => (b.onclick = async () => { try { await navigator.clipboard.writeText(b.dataset.chep!); b.textContent = "Đã chép"; } catch { b.textContent = "Chép tay"; } }));
    const nut = k.querySelector<HTMLButtonElement>("[data-bao-chuyen]");
    if (nut) nut.onclick = () => {
      const b = k.querySelector<HTMLElement>("[data-bao]")!, soTien = Number(k.querySelector<HTMLInputElement>("[data-so]")!.value.replace(/\D/g, "")), tep = k.querySelector<HTMLInputElement>("[data-anh]")!.files?.[0];
      if (!(soTien > 0)) return void (b.textContent = "Nhập số tiền đã chuyển.");
      if (!tep) return void (b.textContent = "Đính ảnh biên lai để người bán đối chiếu.");
      lam(k, lai)(nut, async () => {
        const anh = await api<any>("/v1/files", { mime: tep.type || "image/jpeg", data_base64: await anhBase64(tep), entity: "payment", entity_id: p.id, captured_in_app: false });
        await api(`/v1/payments/${p.id}/report`, { amount_vnd: soTien, method: "bank_transfer", evidence_document_id: anh.id });
      });
    };
  }
}

function veDenNoi(o: HTMLElement, d: D, dot: D, lai: () => void) {
  o.insertAdjacentHTML("beforeend", `<section class="the toi-luot" id="den"><h2>Nhận tại kho · đợt ${dot.batch_no}</h2>
    ${dot.status === "in_transit" ? `<p class="phu">Xe tới kho thì cân lại. Hao hụt đường trong mức cho phép là bình thường; vượt mức AgiViet sẽ xem.</p>
      <label class="o-nhap">Lượng cân tại kho (kg)<input id="den-can" inputmode="decimal"></label><button type="button" class="nut chinh rong" id="den-gui">Ghi lượng cân tại kho</button>`
    : `<p>Đã ghi lượng cân tại kho. Kiểm hàng xong:</p><button type="button" class="nut chinh rong" id="den-chot">Hàng đúng, chốt nhận</button>
      <p class="phu">Hàng khác mẫu đã niêm phong? Đừng chốt, gửi khiếu nại để AgiViet xử lý.</p><button type="button" class="nut vien rong" id="den-kn">Khiếu nại hàng khác mẫu</button>`}
    <p class="phu" data-bao role="status"></p></section>`);
  const k = o.querySelector<HTMLElement>("#den")!, b = k.querySelector<HTMLElement>("[data-bao]")!, chay = lam(k, lai);
  k.querySelector<HTMLButtonElement>("#den-kn")?.addEventListener("click", async (e) => { const n = e.currentTarget as HTMLButtonElement; n.disabled = true; try { await api("/v1/support", { message: `Khiếu nại ${d.code}: hàng khác mẫu đã niêm phong`, order_id: d.id }); b.textContent = "AgiViet đã ghi nhận khiếu nại, cọc vẫn do ngân hàng giữ. Bạn chưa cần chốt nhận hàng."; } catch (x) { b.textContent = (x as Error).message; n.disabled = false; } });
  k.querySelector<HTMLButtonElement>("#den-gui")?.addEventListener("click", (e) => {
    const can = Number((k.querySelector<HTMLInputElement>("#den-can")!.value || "").replace(",", ".")); if (!(can > 0)) return void (b.textContent = "Nhập lượng cân tại kho.");
    chay(e.currentTarget as HTMLButtonElement, async () => { const r = await api<any>(`/v1/deliveries/${dot.id}/arrival`, { weighed_g: Math.round(can * 1000) }); try { sessionStorage.setItem("agv-hao-" + dot.id, JSON.stringify(r)); } catch { /* bỏ qua */ } });
  });
  try { const r = JSON.parse(sessionStorage.getItem("agv-hao-" + dot.id) || "null"); if (r && dot.status === "arrival_check") b.innerHTML = `Hao hụt đường: <b>${kgc(Number(r.hao_hut_g) / 1000)}</b> (${(r.hao_hut_bps / 100).toFixed(1)}%)${r.vuot_muc ? ' — <b class="do">vượt mức cho phép, AgiViet đã được báo</b>' : " — trong mức cho phép"}.`; } catch { /* bỏ qua */ }
  k.querySelector<HTMLButtonElement>("#den-chot")?.addEventListener("click", (e) => chay(e.currentTarget as HTMLButtonElement, () => api(`/v1/deliveries/${dot.id}/arrival/confirm`, {})));
}

/** Vẽ phần giao nhận/nghiệm thu/tiền của đơn vào cuối màn chi tiết đơn (cùng thứ tự với màn cũ). */
export async function veGiaoNhan(o: HTMLElement, d: D, lai: () => void): Promise<void> {
  const dot = (d.dot_giao || []).find((x: D) => !/closed|cancel|shortfall_ended/.test(x.status));
  try {
    if (dot && ["preparing", "ready"].includes(dot.status)) await veGiao(o, dot, lai);
    if (dot && dot.status === "checking") await veNghiemThu(o, d, dot, lai);
    if (dot && ["in_transit", "arrival_check"].includes(dot.status)) veDenNoi(o, d, dot, lai);
    await veTienBan(o, d, lai);
  } catch (e) { o.insertAdjacentHTML("beforeend", `<section class="the"><p class="phu">Chưa tải được phần giao nhận: ${esc((e as Error).message)}</p></section>`); }
}

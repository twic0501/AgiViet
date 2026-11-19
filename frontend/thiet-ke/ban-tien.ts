import { tien, tienDu, esc, phien, giuThamSo, veDau, veTab } from "./chung.ts";
const $ = (id) => document.getElementById(id);
giuThamSo();
veTab("tien");
veDau($("dau"), { chao: "Tiền của bác", ten: "Sổ tiền", chuDau: "" });

// Trạng thái cọc (core.deposits.status) → chữ cho bác
const COC = { null: ["Chưa cọc", ""], pending: ["Chờ người mua cọc", ""], held: ["Ngân hàng đang giữ cọc", "giu"], processing: ["Ngân hàng đang xử lý cọc", "giu"],
  fully_processed: ["Cọc đã xử lý xong", "xong"], refunded: ["Cọc đã hoàn người mua", ""], expired: ["Quá hạn cọc", ""] };
// Số lớn làm tròn cho dễ đọc; bị làm tròn thì thêm dòng nhỏ số đồng đầy đủ để đối chiếu tin nhắn ngân hàng.
const dayDu = (v) => `${Number(v || 0).toLocaleString("vi-VN")} đ`;
const ghiSo = (id, v) => { const tron = tien(v); $(id).innerHTML = esc(tron) + (tron.replace(/\s/g, "") === dayDu(v).replace(/\s/g, "") ? "" : `<small style="display:block;font-size:13px;font-weight:500;opacity:.8;margin-top:2px">${esc(dayDu(v))}</small>`); $(id).title = tienDu(v); };

let token, tenHd = new Map();
const get = (d) => fetch(d, { headers: { authorization: "Bearer " + token } }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${d}: ${r.status}`))));

async function taiKy(ky) {
  document.querySelectorAll(".ky button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.ky === ky)));
  const dau = new Date(); dau.setDate(1); dau.setHours(0, 0, 0, 0);
  const s = await get(ky === "thang" ? `/v1/money/summary?from=${encodeURIComponent(dau.toISOString())}` : "/v1/money/summary");
  const g = s.tong;
  $("t-nhan").textContent = ky === "thang" ? "Đã nhận tháng này" : "Đã nhận từ trước tới nay";
  ghiSo("da-nhan", BigInt(g.da_nhan_truc_tiep) + BigInt(g.ngan_hang_da_chuyen_den));
  ghiSo("truc-tiep", g.da_nhan_truc_tiep); ghiSo("ngan-hang", g.ngan_hang_da_chuyen_den);
  ghiSo("coc", g.coc_dang_giu); ghiSo("con-nhan", g.con_phai_nhan); ghiSo("treo", g.tien_treo);
  const cuaBac = s.theo_don.filter((d) => !d.la_mua);
  $("ds-hd").innerHTML = cuaBac.length ? cuaBac.map((d) => {
    const h = tenHd.get(d.id) || {};
    const [chu, lop] = COC[d.coc_trang_thai] || [d.coc_trang_thai, ""];
    const giu = BigInt(d.coc_dang_giu_vnd || 0);
    return `<a class="hd-tien" href="./ban-don.html?id=${encodeURIComponent(d.id)}">
      <span style="min-width:0"><p class="ten">${esc(h.buyer_name || "Hợp đồng")}</p><p class="phu">${esc(d.code)}${h.hien_thi?.ten ? ` · ${esc(h.hien_thi.ten)}` : ""}</p></span>
      <span class="gia" title="${esc(tienDu(h.contract_value_vnd))}">${h.contract_value_vnd ? esc(tien(h.contract_value_vnd)) : "—"}</span>
      <span class="coc ${lop}">${esc(chu)}${giu > 0n ? ` · ${esc(tien(giu))}` : ""}</span></a>`;
  }).join("") : BigInt(g.coc_dang_giu || 0) + BigInt(g.con_phai_nhan || 0) + BigInt(g.tien_treo || 0) > 0n
    ? `<p class="bao" style="margin-top:12px">Tiền ở trên là của hợp đồng khung theo tuần. Xem từng tuần ở <a href="./ban-khung.html" style="color:inherit;font-weight:600">Khung tuần</a>.</p>`
    : `<p class="bao" style="margin-top:12px">Bác chưa có hợp đồng nào. Khi bác đồng ý một lời chào giá và hai bên ký, tiền của hợp đồng sẽ hiện ở đây.</p>`;
}

async function mo() {
  token = await phien();
  const [me, don] = await Promise.all([get("/v1/me"), get("/v1/orders")]);
  veDau($("dau"), { chao: "Tiền của bác", ten: me.org.name, chuDau: me.name.split(" ").at(-1).charAt(0).toUpperCase() });
  tenHd = new Map(don.map((d) => [d.id, d]));
  await taiKy("thang");
  taiLichSu().catch(() => { $("ls-tien").innerHTML = `<p class="bao loi" style="margin-top:12px">Chưa tải được lịch sử tiền. Bác kéo xuống để tải lại.</p>`; });
  document.querySelectorAll(".ky button").forEach((b) => (b.onclick = () => taiKy(b.dataset.ky).catch(baoLoi)));
  giuThamSo();
  $("noi").setAttribute("aria-busy", "false");
}
// Lịch sử: tiền về (người mua chuyển thẳng đã xác nhận, ngân hàng chi cọc về tài khoản bác) và tiền ra (bác hoàn), nhóm theo tháng giờ Việt Nam
const laVao = (x) => x.loai === "money_in" || x.loai === "payout";
const dangChuyen = (x) => x.loai === "payout" && !/settled|reconciled|done|completed/.test(x.trang_thai || "");
const tenKhoan = (x) => x.loai === "payout" ? "Ngân hàng chuyển cọc về tài khoản bác" : x.loai === "money_in" ? "Người mua chuyển thẳng (bác đã xác nhận)" : "Bác hoàn tiền cho người mua";
const VN = { timeZone: "Asia/Ho_Chi_Minh" };
const IC_VAO = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4v13M6 11l6 6 6-6M5 20h14"/></svg>';
const IC_RA = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20V7M6 13l6-6 6 6M5 4h14"/></svg>';
async function taiLichSu() {
  const ls = (await get("/v1/seller/history?limit=200")).filter((x) => ["money_in", "payout", "money_out", "refund"].includes(x.loai) && Number(x.so_tien_vnd));
  if (!ls.length) { $("ls-tien").innerHTML = `${window.anhTrong?.("chua-co-tien-ve") || ""}<p class="bao" style="margin-top:12px">Chưa có khoản nào về tay bác. Cọc ngân hàng đang giữ chưa tính vào đây; khi bác xác nhận đã nhận tiền hoặc ngân hàng chuyển cọc về, khoản đó hiện ở đây.</p>`; return; }
  const thang = new Map();
  for (const x of ls) { const k = new Date(x.luc).toLocaleDateString("vi-VN", { ...VN, month: "numeric", year: "numeric" }); thang.set(k, [...(thang.get(k) || []), x]); }
  $("ls-tien").innerHTML = [...thang].map(([k, ds]) => {
    const vao = ds.filter((x) => laVao(x) && !dangChuyen(x)).reduce((t, x) => t + Number(x.so_tien_vnd), 0);
    return `<div class="lt-thang"><h4><span>Tháng ${esc(k)}</span>${vao ? `<b>+${esc(tien(vao))}</b>` : ""}</h4>${ds.map((x) => { const ve = laVao(x), cho = dangChuyen(x);
      return `<a class="lt-dong" href="${x.order_id ? `./ban-don.html?id=${encodeURIComponent(x.order_id)}` : "#"}"><span class="ic ${ve ? "" : "ra"}" aria-hidden="true">${ve ? IC_VAO : IC_RA}</span>
        <span style="min-width:0"><b>${esc(tenKhoan(x))}</b><small>${esc(new Date(x.luc).toLocaleString("vi-VN", { ...VN, hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" }))}${x.ma && x.ma.length <= 20 ? ` · ${esc(x.ma)}` : ""}${cho ? " · đang chuyển, chưa tính là đã về" : ""}</small></span>
        <span class="so ${cho ? "cho" : ve ? "vao" : "ra"}" title="${esc(tienDu(x.so_tien_vnd))}">${ve ? "+" : "−"}${esc(dayDu(x.so_tien_vnd))}</span></a>`; }).join("")}</div>`;
  }).join("");
  giuThamSo($("ls-tien"));
}
const baoLoi = (e) => {
  $("ds-hd").innerHTML = `<p class="bao loi" style="margin-top:12px">Chưa tải được sổ tiền (${esc(e.message)}).</p><button class="nut phu-nut" type="button" style="margin-top:12px" onclick="location.reload()">Thử lại</button>`;
  $("noi").setAttribute("aria-busy", "false");
};
mo().catch(baoLoi);

// Nhắc kèm trâu: số đang là 0 thì nói vì sao; có cọc đang giữ thì nói ai giữ
setTimeout(() => {
  const so = (id) => (document.getElementById(id)?.textContent || "").replace(/\D/g, "");
  if (!Number(so("da-nhan")) && !Number(so("coc")) && !Number(so("con-nhan"))) window.nhacTrau?.({ khoa: "tien-0", mat: "ngac-nhien", chu: "Số đang là 0 vì chưa có hợp đồng nào được cọc hoặc trả tiền. Khi người mua chuyển cọc, ngân hàng giữ và số hiện ở ô xanh." });
  else window.nhacTrau?.({ khoa: "tien-giu", mat: "vui", chu: "Tiền cọc do ngân hàng đối tác giữ, không bên nào rút được. Giao xong và hai bên chốt số cân thì ngân hàng chuyển cho bác." });
}, 2500);

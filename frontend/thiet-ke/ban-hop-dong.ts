import { esc, phien, giuThamSo, tien, tienDu, CHANG, chiSoChang, viecCho, dangLam, LUOT } from "./chung.ts";
const $ = (id) => document.getElementById(id);
$("dau").innerHTML = `<button class="nut-tron" type="button" id="dong" aria-label="Quay lại"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 5l-7 7 7 7"/></svg></button>
  <div style="flex:1;min-width:0"><p class="chao">Sổ hợp đồng</p><h1>Hợp đồng của tôi</h1></div>`;
$("dong").onclick = () => (history.length > 1 ? history.back() : (location.href = "./ban-hom-nay.html" + location.search));
const chuTat = (s) => String(s || "").split(/\s+/).filter((w) => /^[A-ZĐÀ-Ỹ]/.test(w)).slice(-2).map((w) => w[0]).join("") || "?";

function the(d) {
  const k = chiSoChang(d), [lop, ai] = LUOT[d.hien_thi?.toi_luot?.phia] || ["cho", "—"], bac = d.hien_thi?.toi_luot?.phia === d.phia_cua_ban;
  return `<a class="the-hd ${bac && dangLam(d) ? "bac" : ""}" href="./ban-don.html?id=${encodeURIComponent(d.id)}">
    <div class="hang"><span class="logo-ben">${esc(chuTat(d.buyer_name))}</span>
      <span class="giua"><span class="ten">${esc(d.buyer_name)}</span><span class="phu">${esc(d.code)} · ${esc(d.hien_thi?.ten || d.status)}</span></span>
      <span class="gia" title="${esc(tienDu(d.contract_value_vnd))}">${esc(tien(d.contract_value_vnd))}</span></div>
    ${dangLam(d) ? `<div class="chang" aria-label="Chặng ${k + 1} trên ${CHANG.length}: ${CHANG[k]}">${CHANG.map((_, i) => `<i class="${i < k ? "xong" : i === k ? "dang" : ""}"></i>`).join("")}</div>
    <div class="chang-ten">${CHANG.map((c, i) => `<span class="${i === k ? "dang" : ""}">${c}</span>`).join("")}</div>
    <div class="cho-ai"><span class="dau-luot ${lop}">${esc(ai)}</span><span>${esc(viecCho(d))}</span></div>` : ""}</a>`;
}

async function tai() {
  const token = await phien();
  const r = await fetch("/v1/orders", { headers: { authorization: "Bearer " + token } });
  if (!r.ok) throw new Error("Chưa tải được hợp đồng. Bác kéo xuống để tải lại.");
  const ds = await r.json();
  // Hợp đồng khung theo tuần (người bán): việc tới lượt bác lên trước.
  const kh = await fetch("/v1/frameworks", { headers: { authorization: "Bearer " + token } }).then((x) => (x.ok ? x.json() : { data: [] })).then((j) => (j.data ?? j).filter((k) => k.phia === "seller" && (k.mon || []).length)).catch(() => []);
  const toiKh = (k) => k.toi_luot === "seller" || k.gia_tuan?.some((g) => g.trang_thai === "proposed" && g.de_nghi_boi === "buyer") || k.ky_tuan?.some((p) => p.trang_thai_tra === "payer_reported");
  const theKh = (k) => `<a class="the-hd ${toiKh(k) ? "bac" : ""}" href="./ban-khung.html?id=${encodeURIComponent(k.id)}">
    <div class="hang"><span class="logo-ben">${esc(chuTat(k.ben_mua))}</span>
      <span class="giua"><span class="ten">${esc(k.ben_mua)}</span><span class="phu">${esc(k.code)} · khung theo tuần · ${esc(toiKh(k) ? "Tới lượt bác" : k.ten_trang_thai)}</span></span>
      <span class="gia">${esc(tien(k.coc_khung_vnd))}</span></div></a>`;
  const nhomKh = kh.length ? `<section class="hl-nhom"><h2>Hợp đồng khung theo tuần${kh.some(toiKh) ? ` <b>${kh.filter(toiKh).length}</b>` : ""}</h2>${kh.map(theKh).join("")}</section>` : "";
  const bac = ds.filter((d) => dangLam(d) && d.hien_thi?.toi_luot?.phia === d.phia_cua_ban);
  const chay = ds.filter((d) => dangLam(d) && !bac.includes(d));
  const xong = ds.filter((d) => !dangLam(d));
  const nhom = (ten: string, ds_: any[], nhanSo?: boolean) => ds_.length ? `<section class="hl-nhom"><h2>${esc(ten)}${nhanSo ? ` <b>${ds_.length}</b>` : ""}</h2>${ds_.map(the).join("")}</section>` : "";
  $("noi").innerHTML = ds.length || kh.length ? nhomKh + nhom("Cần bác làm", bac, true) + nhom("Đang chạy, chờ bên kia", chay) + nhom("Đã xong / đã đóng", xong)
    : `<div class="hl-trong">${window.anhTrong?.("chua-co-don") || ""}<p>Chưa có hợp đồng nào. Sau khi bác đồng ý giá và người mua gửi điều kiện giao, trả tiền, hợp đồng hiện ở đây để bác xem và ký.</p><a class="nut chinh-nut" href="./ban-tin-nhan.html${esc(location.search)}" style="text-decoration:none">Xem lời chào giá</a></div>`;
  giuThamSo($("noi"));
}
giuThamSo();
tai().catch((e) => { $("noi").innerHTML = `<p class="bao loi">${esc(e.message)}</p>`; });

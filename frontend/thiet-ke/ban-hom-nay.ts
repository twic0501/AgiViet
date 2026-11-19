import { tien, tienDu, can, esc, so, phien, layDuLieu, ANH_SP, viecCho, CHANG, chiSoChang, LUOT, dangLam, giuThamSo, veDau, veTab, soThongBaoMoi, bieuTuong } from "./chung.ts";
veTab("trang-chu");
document.querySelectorAll(".loi-tat [data-ic]").forEach((o) => (o.innerHTML = bieuTuong(o.dataset.ic, false, 24)));
veDau(document.getElementById("dau"), { chao: "Chào bác", ten: "AgiViet", chuDau: "" });
const $ = (id) => document.getElementById(id);
// Trâu: tệp V4g đã duyệt (thở, chớp mắt, tai, đuôi, khăn, nhìn) + phản ứng khi chạm, tự nhúc nhích lúc đứng yên.
// Khi có tệp mới có đầu vào `hanh_dong` (Claude 2 làm, xem docs/KE-HOACH-SONG-SONG.md) thì tự chọn tư thế theo tình huống.
const trau = { cham: null, hanhDong: null, muon: 0 };
const giamDong = matchMedia("(prefers-reduced-motion: reduce)").matches;
try {
  rive.RuntimeLoader.setWasmUrl("/assets/vendor/rive/rive.wasm");
  const r = new rive.Rive({ src: "/assets/trau/trau-v4.riv", canvas: $("trau"), autoplay: !giamDong, stateMachines: "trau",
    layout: new rive.Layout({ fit: rive.Fit.Contain, alignment: rive.Alignment.BottomCenter }),
    onLoad: () => {
      r.resizeDrawingSurfaceToCanvas();
      const vao = r.stateMachineInputs("trau") || [];
      trau.cham = vao.find((x) => x.name === "cham"); trau.hanhDong = vao.find((x) => x.name === "hanh_dong");
      if (trau.hanhDong) trau.hanhDong.value = trau.muon;
    } });
  const cham = () => trau.cham?.fire();
  $("trau").addEventListener("pointerdown", cham);
  // Đứng yên lâu thì tự nhúc nhích nhẹ (8–14 giây một lần), dừng khi tab ẩn
  if (!giamDong) (function hen() { setTimeout(() => { if (!document.hidden) cham(); hen(); }, 8000 + Math.random() * 6000); })();
} catch {}
const datHanhDong = (so) => { trau.muon = so; if (trau.hanhDong) trau.hanhDong.value = so; else trau.cham?.fire(); };

const iconTroi = (p) => p >= 70
  ? `<svg viewBox="0 0 36 36" fill="none"><path d="M10 20a6 6 0 0 1 1-12 8 8 0 0 1 15 2 5 5 0 0 1 0 10z" fill="#c9d3dc"/><path d="M13 24l-2 5M19 24l-2 5M25 24l-2 5" stroke="#2b6cb0" stroke-width="2.4" stroke-linecap="round"/></svg>`
  : p >= 30
  ? `<svg viewBox="0 0 36 36" fill="none"><circle cx="13" cy="13" r="6" fill="#e8b53a"/><path d="M12 24a6 6 0 0 1 1-12 8 8 0 0 1 15 2 5 5 0 0 1 0 10z" fill="#dfe4e8"/></svg>`
  : `<svg viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="7" fill="#e8b53a"/><path d="M18 4v4M18 28v4M4 18h4M28 18h4M8 8l3 3M25 25l3 3M8 28l3-3M25 11l3-3" stroke="#e8b53a" stroke-width="2.4" stroke-linecap="round"/></svg>`;

// Chữ tắt tên người mua: lấy chữ đầu của 2 từ viết hoa đầu tiên ("Nhà máy chế biến Mekong" → "NM")
const chuTat = (ten) => (ten.match(/\p{Lu}/gu) || ["?"]).slice(0, 2).join("");

async function mo() {
  const token = await phien();
  const d = await layDuLieu(token);
  const { me, tienTom, troi, tenSp } = d;
  const don = d.don.filter(dangLam);                       // chỉ hợp đồng còn đang chạy
  const lo = d.lo.filter((l) => l.status === "on_sale" && !l.an_tu_dong);   // lô người mua đang thấy
  // Số thông báo chưa đọc lấy từ backend (lỗi tải thì không hiện chấm)
  const chuaDoc = await soThongBaoMoi(token);
  const dauBan = { chao: `Chào ${me.name.split(" ").at(-1)}`, ten: me.org.name, chuDau: me.name.split(" ").at(-1).charAt(0).toUpperCase(), soThongBao: chuaDoc };
  veDau($("dau"), dauBan);
  $("ngay").textContent = new Date().toLocaleDateString("vi-VN", { weekday: "long", day: "numeric", month: "numeric" });

  const toiBac = don.filter((d) => d.hien_thi?.toi_luot?.phia === d.phia_cua_ban);
  const choNguoi = don.filter((d) => d.hien_thi?.toi_luot && d.hien_thi.toi_luot.phia !== d.phia_cua_ban);
  if (toiBac.length) {
    $("cau-chinh").textContent = `Bác có ${toiBac.length} việc cần làm`;
    $("cau-phu").textContent = viecCho(toiBac[0]);
    $("nut-chinh").textContent = "Làm ngay"; $("nut-chinh").hidden = false;
    $("nut-chinh").onclick = () => { const q = new URLSearchParams(location.search); q.set("id", toiBac[0].id); location.href = "./ban-don.html?" + q; };
  } else if (choNguoi.length) {
    $("cau-chinh").textContent = "Hôm nay bác chưa có việc gấp";
    $("cau-phu").textContent = `${choNguoi.length} hợp đồng đang chờ ${(LUOT[choNguoi[0].hien_thi.toi_luot.phia]?.[1] || "bên kia").toLowerCase()}.`;
  } else {
    const daXong = d.don.filter((x) => x.status === "completed").length;
    $("cau-chinh").textContent = daXong ? `Đã xong ${daXong} hợp đồng, chưa có việc mới` : "Chưa có hợp đồng nào";
    $("cau-phu").textContent = lo.length ? `Bác đang bán ${lo.length} lô, chờ người mua chào giá.` : "Đăng một lô hàng để người mua thấy và chào giá.";
    $("nut-chinh").textContent = "Đăng hàng"; $("nut-chinh").hidden = false;
    $("nut-chinh").onclick = () => (location.href = "./ban-dang-bai.html" + location.search);
  }

  // Lời chào giá người mua đang chờ bác trả lời → nêu ngay trên khối thông báo
  const chao = await fetch("/v1/offers", { headers: { authorization: "Bearer " + token } }).then((x) => (x.ok ? x.json() : [])).catch(() => []);
  const choBac = (Array.isArray(chao) ? chao : []).filter((c) => /sent|countered/.test(c.status) && c.vong_cuoi?.from_side === "buyer");
  if (choBac.length && !toiBac.length) {
    const som = choBac.map((c) => new Date(c.vong_cuoi.expires_at)).sort((x, y) => +x - +y)[0];
    $("cau-chinh").textContent = `${choBac.length} lời chào giá chờ bác`;
    $("cau-phu").textContent = `Hạn sớm nhất ${som.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "numeric", month: "numeric" })}.`;
    $("nut-chinh").textContent = "Xem chào giá"; $("nut-chinh").hidden = false; $("nut-chinh").onclick = () => (location.href = "./ban-tin-nhan.html" + location.search);
  }
  // Trâu làm đúng việc đang chờ bác (bảng hanh_dong HOP-DONG-V4): diễn động tác rồi về nghỉ, ~25 giây nhắc lại một lần.
  // (Trước đây luôn là 8 "cầm giấy đọc" — tờ giấy nhỏ trước ngực trông như cái điện thoại, và đứng một dáng mãi.)
  const viec = toiBac.length ? String(toiBac[0].hien_thi?.toi_luot?.viec || "") : "";
  const dongTac = toiBac.length
    ? (/Ký/i.test(viec) ? 21 : /tiền/i.test(viec) ? 20 : /nghiệm thu|cân/i.test(viec) ? 25 : /Giao|QR|xe/i.test(viec) ? 26 : 8)
    : choBac.length ? 17 : new Date().getHours() < 11 ? 1 : 0;   // 17 chỉ sang trái về nút "Xem chào giá" · 1 chào buổi sáng · 0 nghỉ
  datHanhDong(dongTac);
  // Hướng dẫn lần đầu (một lần; ?huong-dan=1 để xem lại từ trang Tôi)
  import("./huong-dan.ts").then((H) => setTimeout(() => H.moHuongDan(!new URLSearchParams(location.search).has("huong-dan")), 600)).catch(() => {});
  if (dongTac && !giamDong) {
    const lap = () => { setTimeout(() => { if (!document.hidden) datHanhDong(0); setTimeout(() => { if (!document.hidden) datHanhDong(dongTac); lap(); }, 20000); }, 6000); };
    lap();
  }

  $("ds-hd").innerHTML = don.length ? don.slice(0, 3).map((d) => {
    const k = chiSoChang(d);
    const [lop, ai] = LUOT[d.hien_thi?.toi_luot?.phia] || ["cho", "—"];
    return `<a class="hd-wrap" href="./ban-don.html?id=${encodeURIComponent(d.id)}"><div class="hd-gon"><span class="logo-ben">${esc(chuTat(d.buyer_name))}</span>
      <span style="min-width:0"><p class="ten">${esc(d.buyer_name)}</p><p class="phu">${esc(d.code)}</p></span>
      <span class="gia" title="${esc(tienDu(d.contract_value_vnd))}">${esc(tien(d.contract_value_vnd))}</span></div>
      <div class="chang" aria-label="Chặng ${k + 1} trên ${CHANG.length}: ${CHANG[k]}">${CHANG.map((_, i) => `<i class="${i < k ? "xong" : i === k ? "dang" : ""}"></i>`).join("")}</div>
      <div class="chang-ten">${CHANG.map((c, i) => `<span class="${i === k ? "dang" : ""}">${c}</span>`).join("")}</div>
      <div class="cho-ai"><span class="dau-luot ${lop}">${esc(ai)}</span><span>${esc(viecCho(d))}</span></div></a>`;
  }).join("") : `<p class="bao" style="margin-top:12px">Sau khi bác đồng ý giá và người mua gửi điều kiện giao, trả tiền, hợp đồng hiện ở đây để bác xem và ký.</p>`;

  // Ô thời tiết hôm nay
  if (troi && !troi.__loi && troi.ngay?.length) {
    const n0 = troi.ngay[0], c0 = so(n0.nhiet_do_cao_c), m0 = so(n0.kha_nang_mua_phan_tram, 0, 100);
    $("tom-troi").querySelector(".lon").innerHTML = `${iconTroi(m0 ?? 0)}${c0 === null ? "—" : Math.round(c0) + "°"}`;
    $("tom-troi").querySelector(".phu").textContent = [troi.tinh?.ten, m0 !== null ? `mưa ${m0}%` : ""].filter(Boolean).join(" · ");
  } else $("tom-troi").querySelector(".phu").textContent = "Chưa có dữ liệu";
  // Ô giá: mặt hàng đầu tiên bác đang bán
  const l0 = lo[0];
  const g0 = l0 ? await fetch(`/v1/reference-prices?product=${encodeURIComponent(l0.product_code)}&grade=${encodeURIComponent(l0.grade_code)}`, { headers: { authorization: "Bearer " + token } }).then((x) => (x.ok ? x.json() : null)).catch(() => null) : null;
  if (g0?.price_vnd) {
    $("tom-gia").querySelector(".lon").innerHTML = `${Number(g0.price_vnd).toLocaleString("vi-VN")}<small>đ/kg</small>`;
    $("tom-gia").querySelector(".phu").textContent = `${tenSp.get(l0.product_code) || l0.product_code} · Loại ${l0.grade_code.replace(/^L/, "")}`;
    $("tom-gia").insertAdjacentHTML("beforeend", `<span class="the-gd">${g0.order_count || 0} giao dịch</span>${ANH_SP(l0.product_code) ? `<span class="anh-sp" style="background-image:url(${ANH_SP(l0.product_code)})"></span>` : ""}`);
  } else $("tom-gia").querySelector(".phu").textContent = "Chưa có giá tham khảo";
  // Ô tin mới nhất
  const tin = await fetch("/v1/news", { headers: { authorization: "Bearer " + token } }).then((x) => (x.ok ? x.json() : null)).catch(() => null);
  if (tin?.tin?.length) {
    const ds = tin.tin.slice(0, 5);
    $("bang-tin").innerHTML = ds.map((n) => `<div><p class="tieu">${esc(n.tieu_de)}</p><p class="phu">${esc(n.nguon)} · ${new Date(n.ngay).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" })}</p></div>`).join("");
    $("cham-tin").innerHTML = ds.map((_, i) => `<i class="${i ? "" : "dang"}"></i>`).join("");
    let iTin = 0;
    if (ds.length > 1) setInterval(() => {
      if (document.hidden) return;
      iTin = (iTin + 1) % ds.length;
      $("bang-tin").style.transform = `translateX(-${iTin * 100}%)`;
      $("cham-tin").querySelectorAll("i").forEach((c, i) => c.classList.toggle("dang", i === iTin));
    }, 4000);
    $("tom-tin").hidden = false;
  }
  giuThamSo();   // liên kết vừa dựng cũng giữ phiên thử
  $("noi").setAttribute("aria-busy", "false");
}

mo().catch((e) => {
  $("cau-chinh").textContent = "Chưa mở được sổ";
  $("cau-phu").textContent = e.message;
  $("ds-hd").innerHTML = `<p class="bao loi" style="margin-top:12px">Không tải được.</p><button class="nut phu-nut" type="button" style="margin-top:12px" onclick="location.reload()">Thử lại</button>`;
  $("noi").setAttribute("aria-busy", "false");
});

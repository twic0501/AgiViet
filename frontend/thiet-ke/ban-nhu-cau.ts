import { can, esc, phien, giuThamSo, veTab, tenLoai } from "./chung.ts";
const $ = (id) => document.getElementById(id);
veTab("cho");
const ngay = (s) => (s ? new Date(s).toLocaleDateString("vi-VN", { day: "numeric", month: "numeric" }) : "—");
const NHOM = { processor: "Nhà máy chế biến", export: "Doanh nghiệp xuất khẩu", horeca: "Nhà hàng, bếp ăn", wholesale: "Đầu mối", wholesaler: "Vựa, đầu mối", trader: "Thương lái", retail: "Bán lẻ", household: "Hộ chế biến" };
const GIAO = { self_pickup: "Người mua tự đến lấy tại vườn", delivered: "Bác giao tới nơi người mua", seller_delivers: "Bác chở tới nơi người mua", platform_logistics: "AgiViet điều phối xe", warehouse: "Giao tại kho" };
const GIAY = { vietgap: "Chứng nhận VietGAP", growing_area_code: "Mã số vùng trồng", globalgap: "GlobalGAP", residue_test: "Kết quả kiểm dư lượng", organic: "Chứng nhận hữu cơ" };

async function mo() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) throw new Error("Thiếu mã nhu cầu");
  const token = await phien();
  const get = (d) => fetch(d, { headers: { authorization: "Bearer " + token } }).then((r) => (r.ok ? r.json() : Promise.reject(new Error(`${r.status}`))));
  const [n, lo, sp, chao] = await Promise.all([get(`/v1/demands/${id}`), get("/v1/lots?mine=true"), get("/v1/products").catch(() => []), get("/v1/offers").catch(() => null)]);
  // Lời chào mới nhất của bác cho dòng này, còn hiệu lực (đang chờ / đã được đồng ý)
  const cuaBac = (lineId) => { const c = (Array.isArray(chao) ? chao : []).find((x) => x.demand_line_id === lineId && x.direction === "seller_quote"); return c && /sent|accepted/.test(c.status) ? c : null; };
  const trangThai = (c) => c.status === "accepted" ? "người mua đã đồng ý, hàng đang giữ cho người mua (chưa phải hợp đồng)" : c.vong_cuoi.from_side === "buyer" ? "người mua đã trả giá, tới lượt bác" : "chờ người mua trả lời";
  const tenSp = new Map((Array.isArray(sp) ? sp : []).map((p) => [p.code, p.name_vi]));
  const dangBan = lo.filter((l) => l.status === "on_sale" && !l.an_tu_dong && l.product_code === n.product_code);
  const gom = n.lines.some((x) => x.min_source_qty_g && Number(x.min_source_qty_g) < Number(x.qty_g));
  const docs = Array.isArray(n.required_docs) ? n.required_docs : [];
  $("t-nc").textContent = n.code;
  $("noi-dung").innerHTML = `
    <section class="tieu-de" style="padding-top:6px"><h2>${esc(n.buyer_name)}</h2><p>${esc(NHOM[n.segment_code] || n.segment_code)} · cần <b style="color:var(--muc)">${esc(tenSp.get(n.product_code) || n.product_code)}</b></p>
      <div class="nhan">${dangBan.length ? "<span>Khớp hàng của bác</span>" : ""}${gom ? '<span class="gom">Nhận gom nhiều vườn</span>' : ""}</div></section>

    <section class="muc" style="margin-top:18px"><h3><span>Người mua cần</span><span style="font-weight:400">${n.lines.length} loại</span></h3>
      ${n.lines.map((x) => { const k = dangBan.filter((l) => l.grade_code === x.grade_code); const cg = x.min_source_qty_g && Number(x.min_source_qty_g) < Number(x.qty_g);
        return `<div class="dong-nc"><p class="tren"><span>${esc(tenLoai(x.grade_code))}</span><span>${esc(can(x.qty_g).join(" "))}</span></p>
          ${cuaBac(x.id) ? `<p class="cua-bac">${cuaBac(x.id).vong_cuoi.from_side === "buyer" ? "Người mua trả" : "Bác đã chào"} <b>${Number(cuaBac(x.id).vong_cuoi.price_vnd).toLocaleString("vi-VN")} đ/kg</b> · ${esc(can(cuaBac(x.id).vong_cuoi.qty_g).join(" "))} · lô ${esc(cuaBac(x.id).lot_code)} · ${trangThai(cuaBac(x.id))}</p>` : ""}
          <p class="phu">${cg ? `Nhận từ nhiều vườn, mỗi vườn tối thiểu ${esc(can(x.min_source_qty_g).join(" "))}. ` : ""}${k.length ? `<span class="khop">Bác có ${k.length} lô khớp: ${k.map((l) => `${esc(l.code)} (còn ${esc(can(l.available_g).join(" "))})`).join(", ")}</span>` : "Bác chưa có lô loại này."}</p></div>`; }).join("")}</section>

    <section class="muc" style="margin-top:18px"><h3><span>Điều kiện</span></h3>
      <dl class="bang"><dt>Thời gian cần</dt><dd>${ngay(n.needed_from)} – ${ngay(n.needed_to)}</dd>
        <dt>Giao nhận</dt><dd>${esc(GIAO[n.delivery_mode] || n.delivery_mode || "Thỏa thuận khi chốt")}</dd>
        <dt>Giấy tờ yêu cầu</dt><dd>${docs.length ? docs.map((x) => esc(GIAY[x] || x)).join(", ") : "Không yêu cầu thêm"}</dd></dl></section>

    ${gom ? `<p class="giai-thich"><b>Đơn gom là gì?</b> Người mua cần lượng lớn nhưng nhận từ nhiều nhà vườn. Mỗi vườn ký hợp đồng riêng, cọc riêng, cân và nhận tiền riêng; một xe ghé từng vườn theo tuyến. Bác chỉ cần chào phần mình có.</p>` : ""}
    <p class="giai-thich" style="background:var(--la-nhat);color:var(--la-dam)">Giá thấp nhất của bác luôn giữ kín. Người mua không thấy ai đang chào rẻ nhất.</p>
    ${n.status !== "open" ? `<p class="giai-thich" style="background:var(--cho-nen);color:var(--cho)">Nhu cầu này người mua đã đóng, không nhận chào hàng mới.</p>`
      : chao === null ? `<p class="bao loi">Chưa tải được lời chào của bác. Bác tải lại trang trước khi chào hàng.</p>`
      : n.lines.every((x) => cuaBac(x.id)) ? `<a class="nut-di phu" href="./ban-hang-hoa.html#can">Xem lời chào ở Chợ</a>` : dangBan.length ? `<a class="nut-di" href="./ban-hang-hoa.html#can">Chào hàng ở Chợ</a>` : ""}`;
  giuThamSo();
}
mo().catch((e) => { $("noi-dung").innerHTML = `<p class="bao loi">Chưa mở được nhu cầu (${esc(e.message)}).</p>`; }).finally(() => $("noi").setAttribute("aria-busy", "false"));

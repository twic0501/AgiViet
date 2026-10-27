import { money, quantity, date, grams, escapeHtml as e } from "./format.js";
import {
  heading,
  link,
  button,
  amount,
  line,
  rule,
  empty,
  field,
  select,
  badge,
  label,
  notice,
  protection,
  icon,
} from "./ui.js";
export const productPhoto = (code) =>
  ({
    XOAI_CAT_CHU: "mango",
    TOM_THE: "shrimp",
    LUA_TUOI: "rice",
    CA_TRA: "basa",
    THANH_LONG: "dragon-fruit",
    BUOI_DA_XANH: "pomelo", CHANH_KHONG_HAT: "lime", SAU_RIENG: "durian",
  })[code];
export function fallbackPhoto(code) {
  const name=productPhoto(code);
  return ['pomelo','lime','durian'].includes(name)?'/assets/products/'+name+'.svg':'/tham-khao/thiet-ke-so-lam-an/assets/anh/'+name+'.jpg';
}
export function lotPhoto(l, code) {
  const id=l?.photos?.[0]?.id;
  return id
    ? `<figure class="lot-photo"><img class="product-image" hidden data-document-image="${e(id)}" data-lot-photo="true" data-photo-label="${l.photos[0].captured_in_app?"Ảnh lô · chụp tại chỗ":"Ảnh lô · tải lên"}" alt="Ảnh lô hàng"><figcaption>Đang tải ảnh lô…</figcaption></figure>`
    : `<figure class="lot-photo"><img class="product-image" src="${e(fallbackPhoto(code))}" alt="Ảnh minh họa mặt hàng"><figcaption>Ảnh minh họa · không phải ảnh lô</figcaption></figure>`;
}
const productName = (c, code) =>
  c.products.find((p) => p.code === code)?.name_vi || "Mặt hàng";
const opts = (c) => c.products.map((p) => [p.code, p.name_vi]);
const gradeOpts = (c, code) =>
  c.products
    .find((p) => p.code === code)
    ?.grades.map((g) => [g.grade_code, g.label]) || [];
const productFields = (c, defaultCode = "XOAI_CAT_CHU", visual = false) =>
  (visual
    ? `<fieldset class="full product-field"><legend>Chọn mặt hàng</legend><div class="product-picker">${c.products.map((p) => `<label class="product-choice"><input type="radio" name="product" value="${e(p.code)}" ${p.code === defaultCode ? "checked" : ""}>${productPhoto(p.code) ? `<img src="${["pomelo","lime","durian"].includes(productPhoto(p.code))?"/assets/products/"+productPhoto(p.code)+".svg":"/tham-khao/thiet-ke-so-lam-an/assets/anh/"+productPhoto(p.code)+".jpg"}" alt="">` : `<div class="product-placeholder">${icon("leaf")}</div>`}<span>${e(p.name_vi)}</span></label>`).join("")}</div><p class="caption">Ảnh minh họa mặt hàng. Thêm ảnh của lô ở bước tiếp.</p></fieldset>`
    : select("Mặt hàng", "product", opts(c), defaultCode)) +
  select("Loại hàng", "grade", gradeOpts(c, defaultCode), "L1");
export function bindProduct(c) {
  c.change.product = async (form) => {
    form.elements.grade.innerHTML = gradeOpts(c, form.elements.product.value)
      .map(([v, t]) => `<option value="${e(v)}">${e(t)}</option>`)
      .join("");
    await showReference(c, form);
  };
  c.change.grade = (form) => showReference(c, form);
}
async function showReference(c, form) {
  const target = form.querySelector("[data-reference]");
  if (!target) return;
  const r = await c.api.get(
    `/v1/reference-prices?product=${encodeURIComponent(form.elements.product.value)}&grade=${encodeURIComponent(form.elements.grade.value)}`,
  );
  target.textContent =
    r.status === "du_du_lieu"
      ? `Giá tham khảo ${money(r.price_vnd)}/kg · ${r.order_count} đơn, ${r.pair_count} cặp giao dịch.`
      : "Chưa đủ dữ liệu giá tham khảo.";
}
export async function upload(c, file, entity, entityId, captured = false) {
  if (!file?.size) throw new Error("Chọn ảnh hoặc chứng từ trước khi gửi.");
  if (file.size > 8 * 1024 * 1024) throw new Error("Tệp tối đa 8 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return c.api.command("/v1/files", {
    mime: file.type,
    data_base64: btoa(binary),
    entity,
    entity_id: entityId,
    captured_in_app: captured,
  });
}
export async function lots(c, id) {
  if (id) {
    const l = await c.api.get("/v1/lots/" + id);
    const profile = await c.api.get(`/v1/products/${l.product_code}/profile`);
    const source = await c.api.get(`/v1/lots/${id}/source-profile`);
    c.on.available = () => c.command(`/v1/lots/${id}/confirm-available`);
    c.on.publish = () => c.command(`/v1/lots/${id}/publish`, {expected_revision: l.revision});
    c.on.closeLot = () => c.command(`/v1/lots/${id}/close`);
    c.forms.lotPhoto = async (f) => {
      await upload(c, f.get("photo"), "lot", id, f.get("camera") === "on");
      c.flash("Ảnh đã lưu.");
    };
    const buckets = {
      available: "Khả dụng",
      held: "Đang giữ",
      committed: "Cam kết",
      in_transit: "Đang giao",
      delivered: "Đã giao",
      returned_pending: "Trả lại chờ xử lý",
      moved_to_child: "Đã tách lô",
      loss: "Hao hụt",
    };
    return (
      heading(
        l.product_name,
        `${l.code} · ${l.seller_name}`,
        link("Trở lại", "lots", true),
      ) +
      `<div class="grid two"><section class="card"><h2>Thông tin lô</h2>${badge(label(l.status))}${line("Loại hàng", l.grade_code)}${line("Lượng", quantity(l.declared_qty_g))}${line("Cách đo", l.qty_basis === "weighed" ? "Đã cân" : "Ước tính")}${line("Ngày có hàng", date(l.available_from))}${line("Ngày thu hoạch", date(l.harvest_on))}${l.ask_price_vnd ? amount(l.ask_price_vnd, "Giá mong muốn / kg") : ""}${l.floor_price_vnd ? line("Giá thấp nhất · chỉ bạn thấy", money(l.floor_price_vnd) + "/kg") : ""}<details class="rule"><summary>Tiêu chuẩn và lý do trả lại</summary><p>${profile.reject_reasons?.map((r) => e(r.label_vi)).join(" · ") || "Chưa có chi tiết."}</p></details></section><section class="card"><h2>Sổ lượng</h2>${Object.entries(
        l.qty || {},
      )
        .filter(([k]) => buckets[k])
        .map(([k, v]) => line(buckets[k], quantity(v)))
        .join(
          "",
        )}${!Object.keys(l.qty || {}).some((k) => buckets[k]) ? notice("Chưa có lượng theo ngăn để hiển thị.") : ""}${c.seller ? `<div class="actions">${c.can("lot.update") ? button("Xác nhận còn hàng", "available") : ""}${l.status === "draft" && c.can("lot.publish") ? button("Đăng lô này", "publish") : ""}${c.can("lot.close") ? button("Đóng lô", "closeLot", true) : ""}</div>` : c.can("offer.send.buyer") ? link("Gửi lời chào", `bid/${id}`) : ""}</section></div><section class="card"><h2>Hồ sơ nguồn hàng</h2>${line("Người bán",source.nguoi_ban.ten)}${line("Mức xác minh tổ chức",source.nguoi_ban.muc_xac_minh)}${line("Tỉnh",source.nguoi_ban.tinh)}${line("Đơn hoàn tất trên app",source.don_hoan_tat_tren_app)}${line("Vị trí người bán khai",source.vi_tri?.ten || "Chưa khai")}${notice("Tên vị trí do người bán khai; chưa đối chiếu tọa độ. Chưa có điểm uy tín.")}${source.giay_to.map(g=>line(g.label_vi,({da_xac_minh:"Đã xác minh",tu_khai:"Tự khai",het_hieu_luc:"Hết hiệu lực"}[g.trang_thai]||"Đang kiểm tra")+" · "+date(g.tu)+" – "+date(g.den))).join("")}</section><section class="card"><h2>Ảnh lô hàng</h2>${l.photos?.length ? `<div class="grid">${l.photos.map((p) => `<div><img class="product-image" hidden data-document-image="${e(p.id)}" data-lot-photo="true" data-photo-label="${p.captured_in_app ? "Ảnh lô · chụp tại chỗ" : "Ảnh lô · tải lên"} · ${e(date(p.created_at))}" alt="Ảnh lô hàng"><small>Đang tải ảnh lô…</small></div>`).join("")}</div>` : notice("Chưa có ảnh lô hàng.")} ${c.seller && c.can("lot.create") ? `<form data-form="lotPhoto">${field("Ảnh hàng", "photo", "file", "", 'accept="image/png,image/jpeg,image/webp" capture="environment" required')}<label class="check"><input type="checkbox" name="camera">Tôi vừa chụp ảnh này tại lô hàng</label><button>Lưu ảnh</button></form>` : ""}</section>`
    );
  }
  const params = new URLSearchParams(c.seller ? { mine: "true" } : {});
  const filter = c.state.lotFilter || {};
  if (filter.product) params.set("product", filter.product);
  const all = await c.api.get("/v1/lots?" + params);
  const list = filter.search
    ? all.filter((l) =>
        (l.code + " " + productName(c, l.product_code))
          .toLocaleLowerCase("vi")
          .includes(filter.search.toLocaleLowerCase("vi")),
      )
    : all;
  const photos = c.seller ? new Map() : new Map(await Promise.all(list.map(async l => [l.id, await c.api.get("/v1/lots/"+l.id)])));
  c.forms.sourceFilter = (f) => {
    c.state.lotFilter = {
      product: f.get("product"),
      search: f.get("search").trim(),
    };
  };
  return (
    heading(
      c.seller ? "Lô hàng của tôi" : "Nguồn hàng",
      c.seller
        ? "Kiểm tra lượng còn trước khi chào bán."
        : "Xem nguồn phù hợp. Giá được trao đổi riêng qua lời chào.",
      c.seller && c.can("lot.create")
        ? link("Đăng lô mới", "post")
        : !c.seller
          ? link("Tìm hàng theo nhu cầu", "demands", true)
          : "",
    ) +
    `<form data-form="sourceFilter" class="source-filter">${field("Tên hàng hoặc mã lô", "search", "search", filter.search || "")}${select("Mặt hàng", "product", [["", "Tất cả mặt hàng"], ...opts(c)], filter.product || "")}<button>Lọc lô hàng</button></form><div class="grid">${list.map((l) => `<article class="card">${!c.seller ? lotPhoto(photos.get(l.id),l.product_code) : ""}<div class="row"><span class="caption">${e(l.code)}</span>${badge(label(l.status))}</div><h2>${e(productName(c, l.product_code))}</h2>${line("Loại", l.grade_code)}${line("Khả dụng", quantity(l.available_g))}${line("Cách đo", l.qty_basis === "weighed" ? "Đã cân" : "Ước tính")}<div class="actions">${link("Xem lô", `lots/${l.id}`, true)}</div></article>`).join("")}</div>` +
    (!list.length
      ? empty(
          "Chưa có lô hàng",
          c.seller
            ? "Đăng lô đầu tiên để bên mua gửi lời chào."
            : "Hãy lập nhu cầu mua để tìm nguồn phù hợp.",
        )
      : "")
  );
}
export async function postLot(c) {
  bindProduct(c);
  c.forms.post = async (f) => {
    const r = await c.api.command("/v1/lots", {
      product_code: f.get("product"),
      grade_code: f.get("grade"),
      qty_basis: f.get("basis"),
      qty_g: grams(f.get("qty")),
      ask_price_vnd: f.get("ask"),
      floor_price_vnd: f.get("floor"),
      available_from: f.get("available"),
      harvest_on: f.get("harvest") || undefined,
      spray_clear_on: f.get("clear") || undefined,
    });
    c.flash(
      r.data?.canh_bao?.join?.(" ") || "Đã lưu lô. Thêm ảnh tại chỗ rồi đăng.",
    );
    c.go("lots/" + r.id);
  };
  return (
    heading("Đăng lô hàng", "Lưu thông tin trước, thêm ảnh rồi đăng.") +
    `<div class="steps posting-steps" aria-label="Các bước đăng lô"><span class="step current" aria-current="step">Thông tin</span><span class="step">Ảnh lô</span><span class="step">Đăng</span></div><div class="guide"><div class="mascot" data-mascot></div><p>Ghi đúng lượng và loại hàng. Giá thấp nhất chỉ mình bạn thấy.</p></div><form data-form="post" class="card form"><div class="form-grid">${productFields(c, "XOAI_CAT_CHU", true)}${select(
      "Lượng hàng",
      "basis",
      [
        ["", "Chọn cách đo"],
        ["estimated", "Ước tính"],
        ["weighed", "Đã cân"],
      ],
      "",
      "required",
    )}${field("Khối lượng (kg)", "qty", "number", "", 'min="0.001" step="0.001" required')}${field("Ngày có hàng", "available", "date", "", "required")}${field("Ngày thu hoạch", "harvest", "date")}${field("Hết cách ly thuốc ngày", "clear", "date")}${field("Giá mong muốn (đ/kg)", "ask", "number", "", 'min="1" step="1" required')}${field("Giá thấp nhất kín (đ/kg)", "floor", "number", "", 'min="1" step="1" required')}</div><p data-reference class="caption">Chọn mặt hàng để xem giá tham khảo.</p>${rule("Giá thấp nhất không hiển thị cho bên mua. Không đăng khi chưa hết thời gian cách ly thuốc. Hàng ước tính chỉ được cam kết tối đa 80%.")}<div class="actions"><button>Lưu lô và thêm ảnh</button></div></form>`
  );
}
export async function demands(c, id, matches = false) {
  if (id) {
    const d = await c.api.get("/v1/demands/" + id);
    c.on.publishDemand = () =>
      c.command(`/v1/demands/${id}/publish`, { expected_revision: d.revision });
    c.on.closeDemand = () => c.command(`/v1/demands/${id}/close`);
    const base = heading(
      `${d.code} · ${productName(c, d.product_code)}`,
      d.buyer_name,
      link("Trở lại", "demands", true),
    );
    if (matches) {
      const m = await c.api.get(`/v1/demands/${id}/matches`);
      const photos = new Map(await Promise.all([...new Set(m.dong.flatMap(r=>[...r.khop_du,...r.khop_mot_phan,...r.gan_khop_gia].map(l=>l.lot_id)))].map(async id=>[id,await c.api.get("/v1/lots/"+id)])));
      const groups = {
        khop_du: "Khớp đủ lượng",
        khop_mot_phan: "Khớp một phần",
        gan_khop_gia: "Cần thương lượng",
      };
      return (
        base +
        notice(
          "Kết quả ghép là gợi ý phù hợp, không phải xác minh chất lượng hay bảo lãnh người bán. Thứ tự do mức phù hợp, không theo giá rẻ nhất. Giấy tờ, khoảng cách và uy tín chưa được đối chiếu trong kết quả này.",
        ) +
        m.dong
          .map(
            (row) =>
              `<h2>Loại ${e(row.grade_code)} · cần ${e(quantity(row.qty_g))}</h2>${Object.entries(
                groups,
              )
                .map(
                  ([k, title]) =>
                    `<div class="section-title"><h2>${title}</h2><span class="caption">${row[k].length} nguồn</span></div><div class="grid">${row[k].map((l) => `<article class="card">${lotPhoto(photos.get(l.lot_id),d.product_code)}<span class="caption">${e(l.lot_code)}</span><h3>${e(l.seller_name)}</h3>${line("Có thể cam kết", quantity(l.kha_dung_cam_ket_g))}<details class="rule" open><summary>Vì sao khớp?</summary><p>${[...l.ly_do_khop, ...l.thieu, ...(l.ghi_chu || [])].map(e).join(" · ")}</p></details><div class="actions">${link("Xem lô", `lots/${l.lot_id}`, true)}${c.can("offer.send.buyer") ? link("Chào mua", `bid/${l.lot_id}/${row.demand_line_id}`) : ""}</div></article>`).join("")}</div>${!row[k].length ? notice("Chưa có nguồn trong nhóm này.") : ""}`,
                )
                .join(
                  "",
                )}${row.goi_y_gom ? notice(`Gợi ý gom từ ${row.goi_y_gom.lots.join(", ")} · ${quantity(row.goi_y_gom.tong_g)}. Chưa có chức năng lập đơn gom.`) : ""}`,
          )
          .join("")
      );
    }
    return (
      base +
      `<section class="card">${badge(label(d.status))}${line("Ngày cần", date(d.needed_from) + " – " + date(d.needed_to))}${line("Giấy tờ bắt buộc", d.required_docs?.join(", ") || "Không yêu cầu thêm")}${d.lines.map((l) => `<div class="line"><span>Loại ${e(l.grade_code)}</span><div><strong>${e(quantity(l.qty_g))}</strong>${l.max_price_vnd ? `<p class="caption">Giá tối đa kín ${e(money(l.max_price_vnd))}/kg</p>` : ""}${c.seller && c.can("offer.send.seller") ? link("Báo giá", `quote/${id}/${l.id}`, true) : ""}</div></div>`).join("")}<div class="actions">${!c.seller ? link("Xem hàng khớp", `matches/${id}`) : ""}${!c.seller && c.can("demand.create") && d.status === "draft" ? button("Đăng nhu cầu", "publishDemand") : ""}${!c.seller && c.can("demand.create") && d.status === "open" ? button("Đóng nhu cầu", "closeDemand", true) : ""}</div></section>`
    );
  }
  const list = await c.api.get("/v1/demands" + (!c.seller ? "?mine=true" : ""));
  return (
    heading(
      c.seller ? "Bên mua đang cần" : "Nhu cầu mua",
      c.seller
        ? "Chọn nhu cầu phù hợp với lô đang có."
        : "Ghi rõ loại, lượng và thời gian để ghép đúng nguồn.",
      c.can("demand.create") ? link("Tạo nhu cầu", "demand-new") : "",
    ) +
    `<div class="grid">${list.map((d) => `<article class="card"><div class="row"><span class="caption">${e(d.code)}</span>${badge(label(d.status))}</div><h2>${e(productName(c, d.product_code))}</h2><p>${e(d.buyer_name || "Nhu cầu của tổ chức")}</p>${d.lines?.map((l) => line("Loại " + l.grade_code, quantity(l.qty_g))).join("") || ""}<div class="actions">${link("Xem nhu cầu", `demands/${d.id}`, true)}${!c.seller ? link("Tìm hàng khớp", `matches/${d.id}`) : ""}</div></article>`).join("")}</div>` +
    (!list.length
      ? empty(
          "Chưa có nhu cầu",
          "Tạo nhu cầu để tìm nguồn theo lượng và loại hàng.",
        )
      : "")
  );
}
export async function demandNew(c) {
  bindProduct(c);
  c.forms.demand = async (f) => {
    const r = await c.api.command("/v1/demands", {
      product_code: f.get("product"),
      segment_code: f.get("segment"),
      needed_from: f.get("from"),
      needed_to: f.get("to"),
      delivery_mode: f.get("mode"),
      required_docs: f.getAll("docs"),
      lines: [
        {
          grade_code: f.get("grade"),
          qty_g: grams(f.get("qty")),
          max_price_vnd: f.get("max"),
          min_source_qty_g: grams(f.get("min")),
        },
      ],
    });
    c.flash(r.status === "open" ? "Nhu cầu đã được đăng. Bạn có thể xem hàng khớp." : "Đã lưu nhu cầu.");
    c.go("demands/" + r.id);
  };
  return (
    heading(
      "Tạo nhu cầu mua",
      "Mỗi phiếu dưới đây ghi một loại hàng. Giá tối đa chỉ tổ chức bạn thấy.",
    ) +
    `<form data-form="demand" class="card form"><div class="form-grid">${productFields(c)}${select(
      "Dùng cho",
      "segment",
      [
        ["processor", "Chế biến"],
        ["export", "Xuất khẩu"],
        ["wholesaler", "Đầu mối"],
        ["horeca", "Bếp, nhà hàng"],
      ],
    )}${select("Nhận hàng", "mode", [
      ["self_pickup", "Tự lấy hàng"],
      ["delivered", "Giao tới nơi"],
    ])}${field("Cần từ ngày", "from", "date", "", "required")}${field("Đến ngày", "to", "date", "", "required")}${field("Lượng cần (kg)", "qty", "number", "", 'step="0.001" min="0.001" required')}${field("Mỗi nguồn ít nhất (kg)", "min", "number", "", 'step="0.001" min="0.001" required')}${field("Giá tối đa kín (đ/kg)", "max", "number", "", 'min="1" required')}</div><p data-reference class="caption">Chọn mặt hàng để xem giá tham khảo.</p><fieldset><legend>Giấy tờ cần có</legend><label class="check"><input type="checkbox" name="docs" value="vietgap">VietGAP</label><label class="check"><input type="checkbox" name="docs" value="export_code">Mã vùng trồng xuất khẩu</label></fieldset><div class="actions"><button>Lưu nhu cầu</button></div></form>`
  );
}
export async function bid(c, lotId, lineId = "", quote = false) {
  const lots = quote ? await c.api.get("/v1/lots?mine=true") : null;
  c.forms.bid = async (f) => {
    const r = await c.api.command("/v1/offers", {
      direction: quote ? "seller_quote" : "buyer_bid",
      lot_id: quote ? f.get("lot") : lotId,
      demand_line_id: lineId || undefined,
      qty_g: grams(f.get("qty")),
      price_vnd: f.get("price"),
    });
    c.flash(r.data?.thong_bao || "Đã gửi lời chào.");
    c.go("offers/" + r.id);
  };
  const l = quote ? null : await c.api.get("/v1/lots/" + lotId);
  return (
    heading(
      quote ? "Báo giá cho bên mua" : "Gửi lời chào mua",
      quote
        ? "Chọn lô có đúng loại hàng của nhu cầu."
        : `${l.code} · ${l.product_name} · ${l.seller_name}`,
    ) +
    `<form data-form="bid" class="card form">${
      quote
        ? select(
            "Lô hàng của bạn",
            "lot",
            lots.map((l) => [
              l.id,
              l.code +
                " · " +
                productName(c, l.product_code) +
                " · " +
                l.grade_code,
            ]),
          )
        : line("Lượng khả dụng", quantity(l.qty?.available))
    }${field("Lượng chào (kg)", "qty", "number", "", 'min="0.001" step="0.001" required')}${field("Đơn giá (đ/kg)", "price", "number", "", 'min="1" step="1" required')}${notice("Đây chưa phải hợp đồng. Hai bên còn phải ký và chuyển cọc để đơn có hiệu lực.")}${rule("Giá gửi kín cho đối tác. Không gửi lời chào vượt lượng. Giá dưới 60% tham khảo không được chấp nhận.")}<button>Gửi lời chào</button></form>`
  );
}
export async function offers(c, id) {
  if (id) {
    const o = await c.api.get("/v1/offers/" + id);
    const r = o.rounds.at(-1);
    c.on.accept = () =>
      c.command(`/v1/offers/${id}/accept`, { expected_revision: o.revision });
    c.on.reject = () => c.command(`/v1/offers/${id}/reject`);
    c.on.withdrawOffer = () => c.command(`/v1/offers/${id}/withdraw`);
    c.forms.counter = (f) =>
      c.command(`/v1/offers/${id}/counter`, { price_vnd: f.get("price") });
    return (
      heading(
        "Lời chào giá",
        `${o.code} · lô ${o.lot_code}`,
        link("Trở lại", "offers", true),
      ) +
      `<section class="card">${badge(label(o.status))}${amount(r.price_vnd, "Đơn giá / kg")}${line("Lượng chào", quantity(r.qty_g))}${line("Hạn trả lời", date(r.expires_at, { time: true }))}${line("Lượt trả giá còn", o.luot_tra_gia_con)}${notice("Đây chưa phải hợp đồng. Giá đồng ý được giữ trong thời hạn của lời chào.")}<div class="actions">${o.toi_luot_toi && c.can("offer.accept." + c.side) ? button("Đồng ý giá này", "accept") : ""}${o.toi_luot_toi && c.can("offer.accept." + c.side) ? button(c.seller ? "Không bán" : "Không mua", "reject", true) : ""}${!o.toi_luot_toi && o.status === "sent" && c.can("offer.send." + c.side) ? button("Rút lời chào", "withdrawOffer", true) : ""}${o.status === "accepted" && !c.seller && c.can("order.create") && !o.hold?.order_id ? link("Lập hợp đồng", `create-order/${id}`) : ""}${o.hold?.order_id ? link("Mở hợp đồng", `order/${o.hold.order_id}`) : ""}</div>${o.toi_luot_toi && o.luot_tra_gia_con > 0 && c.can("offer.counter." + c.side) ? `<details class="rule"><summary>Trả giá</summary><form data-form="counter">${field("Đơn giá đề nghị (đ/kg)", "price", "number", "", 'min="1" required')}<button>Gửi giá đề nghị</button></form></details>` : ""}</section><section class="card"><h2>Các lượt trao đổi</h2>${o.rounds.map((r) => line((r.from_side === "buyer" ? "Bên mua" : "Người bán") + " · lượt " + r.round_no, money(r.price_vnd) + "/kg · " + quantity(r.qty_g))).join("")}</section>`
    );
  }
  const list = await c.api.get("/v1/offers");
  const demands = c.seller ? [] : await c.api.get("/v1/demands?mine=true");
  const comparisons = await Promise.all(demands.map(async d=>({d,rows:await c.api.get(`/v1/demands/${d.id}/offer-comparison`)})));
  const comparedIds = new Set(comparisons.flatMap(x=>x.rows.map(r=>r.offer_id)));
  const answered = list.filter(
    (o) => !comparedIds.has(o.id) && (o.status === "accepted" || o.vong_cuoi?.round_no > 1),
  );
  return (
    heading(
      c.seller ? "Lời chào giá" : "So báo giá",
      "Giá chào chỉ hiển thị cho hai bên giao dịch.",
    ) +
    (!c.seller
      ? `${comparisons.map(({d,rows})=>`<section class="card"><h2>So báo giá · ${e(d.code)}</h2>${rows.map(r=>`<article>${link(r.code,`offers/${r.offer_id}`,true)}${line("Người bán",r.seller_name)}${line("Lượng",quantity(r.luong_g))}${line("Giá chào",money(r.gia_vnd)+"/kg")}${line("Giá tại kho",r.gia_tai_kho_vnd==null?r.ghi_chu:money(r.gia_tai_kho_vnd))}</article>`).join("")||notice("Chưa có lời chào đã trả lời cho nhu cầu này.")}</section>`).join("")}<section class="card"><h2>Lời chào không gắn nhu cầu</h2>${answered.length ? `<div class="table-scroll"><table><thead><tr><th>Lời chào</th><th>Lượng</th><th>Giá / kg</th><th>Giá tại kho</th></tr></thead><tbody>${answered.map((o) => `<tr><td><a href="#/offers/${e(o.id)}">${e(o.code)}</a></td><td>${e(quantity(o.vong_cuoi.qty_g))}</td><td>${e(money(o.vong_cuoi.price_vnd))}</td><td>Chưa có chi phí xe, hao hụt và kiểm định</td></tr>`).join("")}</tbody></table></div>` : notice("Chưa có lời chào đã được trả lời để so sánh.")} ${rule("Không xếp theo giá rẻ nhất. Cần xét loại hàng, thời gian, xe, hao hụt, kiểm định và hạn trả trước khi chọn nguồn.")}</section>`
      : "") +
    `<div class="section-title"><h2>Tất cả lời chào</h2><span class="caption">${list.length} lời chào</span></div><div class="grid">${list.map((o) => `<article class="card"><div class="row"><span class="caption">${e(o.code)}</span>${badge(label(o.status))}</div><h3>Lô ${e(o.lot_code)}</h3>${amount(o.vong_cuoi.price_vnd, "Đơn giá / kg")}${line("Lượng", quantity(o.vong_cuoi.qty_g))}${line("Hạn", date(o.vong_cuoi.expires_at, { time: true }))}<div class="actions">${link("Xem lời chào", `offers/${o.id}`, true)}</div></article>`).join("")}</div>` +
    (!list.length
      ? empty(
          "Chưa có lời chào",
          c.seller
            ? "Khi bên mua chào giá, bạn sẽ thấy ở đây."
            : "Mở nguồn hàng để chào mua một lô.",
          link("Xem nguồn hàng", "lots", true),
        )
      : "")
  );
}

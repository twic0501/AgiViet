import { bankName, accountName, paymentQr } from "./virtual-money.js";
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
  steps,
  protection,
  fraud,
} from "./ui.js";
import { amendments } from "./amendments.js";
import { upload } from "./market.js";
const payNames = {
  goods_before_loading: "Tiền trước khi bốc",
  goods_on_receipt: "Tiền khi nhận hàng",
  goods_after_days: "Tiền trả sau",
  settlement_buyer_balance: "Tiền còn phải trả",
  seller_refund: "Người bán phải hoàn",
};
const kindNames = {
  accepted: "Đạt",
  downgraded: "Hạ cấp",
  rejected: "Trả lại",
  transit_damage: "Hư do vận chuyển",
};
const bankStages = {
  created: "Đã tạo",
  sent: "Đã gửi",
  processing: "Đang xử lý",
  succeeded: "Tiền đã về",
  reconciled: "Đã đối soát",
  failed: "Chưa thành công",
  awaiting_callback: "Chờ xác minh",
};
export async function createOrder(c, offerId) {
  const o = await c.api.get("/v1/offers/" + offerId);
  c.forms.createOrder = async (f) => {
    const r = await c.api.command("/v1/orders", {
      offer_id: offerId,
      downgrade_price_vnd: f.get("downgrade"),
      delivery_mode: f.get("mode"),
      site_kind: f.get("site"),
      transport_by: f.get("transport"),
      delivery_from: new Date(f.get("from") + "+07:00").toISOString(),
      delivery_to: new Date(f.get("to") + "+07:00").toISOString(),
      payment_timing: f.get("timing"),
      pay_after_days: f.get("days") ? Number(f.get("days")) : undefined,
      silent_accept_hours: f.get("silent") ? Number(f.get("silent")) : null,
      seal_sample_required: true,
    });
    c.go("order/" + r.id);
  };
  return (
    heading("Lập hợp đồng cọc", `${o.code} · ${o.lot_code}`) +
    steps("Ký") +
    `<form data-form="createOrder" class="card form"><h2>Thỏa thuận giao và trả tiền</h2>${line("Lượng đã đồng ý", quantity(o.rounds.at(-1).qty_g))}${line("Đơn giá", money(o.rounds.at(-1).price_vnd) + "/kg")}<div class="form-grid">${field("Giá hạ cấp (đ/kg)", "downgrade", "number", "", 'min="1" required')}${select("Điểm giao và nghiệm thu", "mode", [["at_farm","Tại nơi người bán"],["at_buyer_warehouse","Tại kho bên mua"],["at_collection_point","Tại điểm tập kết"]])}${select(
      "Nghiệm thu tại",
      "site",
      [
        ["tai_vuon", "Tại vườn"],
        ["tai_ao", "Tại ao"],
        ["tai_ruong", "Tại ruộng"],
      ],
    )}${select("Ai lo xe", "transport", [
      ["buyer", "Bên mua"],
      ["seller", "Người bán"],
      ["partner_for_buyer", "Đối tác · bên mua trả"],
      ["partner_for_seller", "Đối tác · người bán trả"],
    ])}${select("Trả phần còn lại", "timing", [
      ["before_loading", "Trước khi bốc hàng"],
      ["inspect_then_before_loading", "Kiểm xong rồi trả trước bốc"],
      ["on_receipt", "Khi nhận tại nơi đến"],
      ["after_days", "Trả sau theo số ngày"],
    ])}${field("Giao từ (giờ Việt Nam)", "from", "datetime-local", "", "required")}${field("Giao đến (giờ Việt Nam)", "to", "datetime-local", "", "required")}${field("Số ngày trả sau (nếu chọn trả sau)", "days", "number", "", 'min="1" max="90"')}${select(
      "Tự chốt khi im lặng ở nơi đến",
      "silent",
      [
        ["", "Không tự chốt"],
        ["2", "Sau 2 giờ"],
      ],
    )}</div>${notice("Cọc, phí và số trả thẳng sẽ được tính sau khi lưu hợp đồng. Người nhận được chỉ định trước khi giao.")} ${rule(protection)}<button>Lưu và xem hợp đồng</button></form>`
  );
}
export async function orderList(c) {
  const list = await c.api.get("/v1/orders");
  return (
    heading(
      "Hợp đồng",
      "Theo dõi các bước và việc tới lượt từ máy chủ.",
      button("Tải lại", "reload", true),
    ) +
    `<div class="grid">${list.map((o) => `<article class="card"><div class="row"><strong>${e(o.code)}</strong>${badge(o.hien_thi.ten)}</div><p>${e(c.seller ? o.buyer_name : o.seller_name)}</p>${amount(o.contract_value_vnd, "Giá trị hợp đồng")}${o.hien_thi.toi_luot ? notice(`${o.hien_thi.toi_luot.phia === c.side ? "Tới lượt bạn" : sideName(o.hien_thi.toi_luot.phia)} · ${o.hien_thi.toi_luot.viec}`) : ""}<div class="actions">${link("Mở hợp đồng", `order/${o.id}`)}</div></article>`).join("")}</div>` +
    (!list.length
      ? empty(
          "Chưa có hợp đồng",
          "Hợp đồng được lập từ lời chào đã được hai bên đồng ý.",
          link("Xem lời chào", "offers", true),
        )
      : "")
  );
}
const sideName = (side) =>
  ({
    buyer: "Bên mua",
    seller: "Người bán",
    bank: "Ngân hàng",
    ops: "AgiViet",
  })[side] || "Đối tác";
export async function order(c, id, tab = "terms") {
  const o = await c.api.get(`/v1/orders/${id}`);
  c.currentOrder = o;
  const tabs = [
    ["terms", "Thỏa thuận"],
    ["deposit", "Cọc"],
    ["payments", "Trả thẳng"],
    ["delivery", "Giao nhận"],
    ["money", "Quyết toán"],
    ["documents", "Giấy tờ"],
    ["cancel", "Hủy"],
    ["disputes", "Tranh chấp"],
    ["amendments", "Sửa / phụ lục"],
  ];
  const head =
    heading(
      o.code,
      c.seller ? o.buyer.display_name : o.seller.display_name,
      button("Tải lại", "reload", true),
    ) +
    steps(o.hien_thi.chang) +
    `<div class="row wrap"><h2>${e(o.hien_thi.ten)}</h2>${badge(o.hien_thi.toi_luot ? `${sideName(o.hien_thi.toi_luot.phia)} · ${o.hien_thi.toi_luot.viec}` : "Đã xong", o.hien_thi.toi_luot?.phia === c.side)}</div>${o.han.length ? `<p class="caption">Hạn gần nhất: ${e(date(o.han[0].due_at, { time: true }))}</p>` : ""}<nav class="tabs" aria-label="Chi tiết hợp đồng">${tabs.map(([key, title]) => `<a href="#/order/${e(id)}/${key}" ${key === tab ? 'aria-current="page"' : ""}>${title}</a>`).join("")}</nav>`;
  const renderers = {
    terms,
    deposit,
    payments,
    delivery,
    money: moneyView,
    documents,
    cancel,
    disputes,
    amendments,
  };
  return head + (await (renderers[tab] || terms)(c, o));
}
// Phần nội dung một mục của đơn (không đầu trang, không tab): app bán dùng trong màn con.
export async function orderPart(c, o, tab) {
  const renderers = { terms, deposit, payments, delivery, money: moneyView, documents, cancel, disputes, amendments };
  return (renderers[tab] || terms)(c, o);
}
async function terms(c, o) {
  const t = await c.api.get(`/v1/orders/${o.id}/terms`);
  const actions = o.hanh_dong;
  c.forms.prepareSign = async (f) => {
    c.state.otp = {
      kind: "sign",
      order: o.id,
      ack: f.get("commitment") === "on",
      abnormal: f.get("abnormal") === "on",
      challenge: await c.api.post("/v1/otp/challenges", {
        purpose: "contract_sign",
        document_id: o.tai_lieu.find((d) => d.doc_type === "contract").id,
      }),
    };
  };
  c.forms.sign = async (f) => {
    const s = c.state.otp;
    await c.command(`/v1/orders/${o.id}/sign`, {
      challenge_id: s.challenge.challenge_id,
      code: f.get("code"),
      commitment_ack: s.ack,
      abnormal_price_ack: s.abnormal,
      expected_revision: o.revision,
    });
    delete c.state.otp;
  };
  c.on.submitApproval = () => c.command(`/v1/orders/${o.id}/submit-approval`);
  c.on.approve = () => c.command(`/v1/orders/${o.id}/approve`);
  c.on.rejectApproval = () =>
    c.command(`/v1/orders/${o.id}/reject-approval`, {
      reason: "Không duyệt hợp đồng",
    });
  const doc = o.tai_lieu.find((d) => d.doc_type === "contract");
  return `<div class="grid two"><section class="card">${amount(o.dieu_khoan.contract_value_vnd, "Giá trị hợp đồng")}${line("Cọc đảm bảo", money(o.dieu_khoan.deposit_vnd))}${line("Phí bên mua", money(o.dieu_khoan.fee_vnd))}${line("Tài khoản người bán", `${bankName(c, o.dieu_khoan.seller_account.bank_code)} · ${accountName(c, o.dieu_khoan.seller_account.masked)}`)}${line("Chủ tài khoản", o.dieu_khoan.seller_account.holder)}${rule(protection)}</section><section class="card"><h2>Trước khi ký</h2>${o.ky?.ly_do?notice(o.ky.ly_do):""}<p>Đọc lại thỏa thuận và toàn văn hợp đồng.</p>${doc ? button("Xem PDF hợp đồng", "pdf:" + doc.id, true) : notice("Chưa có hợp đồng để xem.")}${actions.includes("sign") ? (c.state.otp?.kind === "sign" && c.state.otp.order === o.id ? `<form data-form="sign">${notice(fraud)}${field("Mã OTP ký hợp đồng", "code", "text", "", 'inputmode="numeric" pattern="[0-9]{6}" autocomplete="one-time-code" required')}<button>Ký hợp đồng bằng OTP</button></form>` : `<form data-form="prepareSign" class="consent"><label class="check"><input type="checkbox" name="commitment" required>Tôi đã đọc và đồng ý các điều khoản, lượng hàng và tài khoản nhận tiền.</label>${o.co.gia_bat_thuong ? `<label class="check"><input type="checkbox" name="abnormal" required>Tôi đã xem lại giá khác thường và vẫn đồng ý.</label>` : ""}${o.dieu_khoan.payment_timing === "after_days" ? notice(`Người bán có rủi ro nhận tiền chậm khi cho trả sau. Hãy xem rõ số ngày trong hợp đồng.`) : ""}<button>Nhận mã ký hợp đồng</button></form>`) : notice("Chưa tới lượt bạn ký, hoặc vai của bạn không có quyền ký.")}<div class="actions">${actions.includes("submit_approval") ? button("Gửi quản lý duyệt", "submitApproval", true) : ""}${actions.includes("approve") ? button("Duyệt hợp đồng", "approve") : ""}${actions.includes("reject_approval") ? button("Không duyệt", "rejectApproval", true) : ""}</div></section></div><div class="section-title"><h2>8 điều khoản cần xem</h2></div><div class="grid two">${t.the.map((t) => `<section class="card"><h3>${e(t.so)}. ${e(t.tieu_de)}</h3><p>${e(c.health?.moi_truong === "thu" ? t.noi_dung.replace(/Agribank|Vietcombank|Vietinbank|Sacombank|BIDV|\bVCB\b|\bVBA\b|\bCTG\b/gi, bankName(c)) : t.noi_dung)}</p></section>`).join("")}</div><div data-pdf-host></div>`;
}
async function deposit(c, o) {
  const m = await c.api.get(`/v1/orders/${o.id}/money`);
  let d = null;
  if (o.hanh_dong.includes("deposit_instruction"))
    d = await c.api.get(`/v1/orders/${o.id}/deposit-instruction`);
  c.depositInstruction = d;
  return `<section class="card form"><h2>Cọc qua tài khoản đảm bảo ngân hàng</h2>${amount(o.dieu_khoan.deposit_vnd, "Tiền cọc · 30% giá tính cọc")}${line("Phí bên mua", money(o.dieu_khoan.fee_vnd))}${m.coc ? line("Trạng thái cọc", label(m.coc.status)) : notice("Chưa có yêu cầu cọc. Hai bên cần ký hợp đồng trước.")}${d ? `${amount(d.total_vnd, "Tổng cần chuyển vào tài khoản đảm bảo")}${line("Ngân hàng", bankName(c, "Ngân hàng đảm bảo")) + line("Tài khoản đảm bảo", accountName(c, d.virtual_account_no))}${line("Nội dung chuyển tiền", d.payment_ref)}${line("Đã được ghi nhận", money(d.received_vnd))}${line("Hạn chuyển", date(d.due_at, { time: true }))}${d.vietqr ? `<canvas class="qr" data-qr="${e(paymentQr(c, d.payment_ref, d.vietqr))}" aria-label="Mã QR chuyển cọc"></canvas>${c.health?.moi_truong === "thu" ? '<p class="caption">QR giả · Ngân hàng ảo AgiViet · không dùng chuyển tiền</p>' : ""}` : notice("Chưa có QR chuyển cọc. Dùng số tài khoản và nội dung ở trên.")}` : !c.seller && o.status === "awaiting_deposit" ? notice("Kế toán hoặc quản lý mở màn này để lấy hướng dẫn chuyển cọc.") : notice("Xem trạng thái cọc ở trên. Cọc đang giữ không phải tiền đã về người bán.")}${notice("Chỉ ngân hàng xác nhận mới tính là đã cọc. Không chuyển cọc vào tài khoản riêng của người bán.")} ${rule(protection)}</section>`;
}
async function payments(c, o) {
  const list = await c.api.get(`/v1/orders/${o.id}/payments`);
  const instructions = new Map(await Promise.all(list.filter(p=>((!c.seller&&p.direction==="buyer_to_seller"&&c.can("money.pay.buyer"))||(c.seller&&p.direction==="seller_to_buyer"&&c.can("money.confirm.seller")))&&!["fully_received","cancelled","not_due"].includes(p.status)).map(async p=>[p.id,await c.api.get(`/v1/payments/${p.id}/instruction`)])));
  for (const p of list) {
    const receiver =
      (c.seller && p.direction === "buyer_to_seller") ||
      (!c.seller && p.direction === "seller_to_buyer");
    c.forms["report-" + p.id] = async (f) => {
      const file = await upload(c, f.get("evidence"), "payment", p.id);
      await c.command(`/v1/payments/${p.id}/report`, {
        amount_vnd: f.get("amount"),
        method: "bank_transfer",
        evidence_document_id: file.id,
      });
    };
    c.forms["prepareMoney-" + p.id] = async (f) => {
      const sum = f.get("amount");
      c.state.otp = {
        kind: "money",
        payment: p.id,
        amount: sum,
        result: f.get("result"),
        ref: f.get("ref"),
        challenge: await c.api.post("/v1/otp/challenges", {
          purpose: "money_received",
          payment_id: p.id,
          amount_vnd: sum,
        }),
      };
    };
    c.forms["confirmMoney-" + p.id] = async (f) => {
      const s = c.state.otp;
      await c.command(`/v1/payments/${p.id}/confirm`, {
        challenge_id: s.challenge.challenge_id,
        code: f.get("code"),
        amount_vnd: s.amount,
        result: s.result,
        bank_txn_ref: s.ref,
        method: "bank_transfer",
      });
      delete c.state.otp;
    };
    c.on["notReceived-" + p.id] = () =>
      c.command(`/v1/payments/${p.id}/not-received`);
  }
  return (
    notice(
      "Phần còn lại trả thẳng vào tài khoản người bán trong hợp đồng. Ảnh biên lai chưa chứng minh tiền đã về. Người nhận tiền phải tự kiểm tra tài khoản và xác nhận OTP.",
    ) +
    `<div class="stack">${list
      .map((p) => {
        const receiver =
          (c.seller && p.direction === "buyer_to_seller") ||
          (!c.seller && p.direction === "seller_to_buyer");
        const permitted = receiver
          ? c.can("money.confirm." + c.side)
          : c.seller ? c.can("money.confirm.seller") : c.can("money.pay.buyer");
        const instruction = instructions.get(p.id);
        const settled = ["fully_received", "cancelled", "not_due"].includes(
          p.status,
        );
        return `<section class="card form"><div class="row"><h2>${e(payNames[p.kind] || "Khoản thanh toán")}</h2>${badge(label(p.status))}</div>${amount(p.amount_due_vnd, "Số phải trả")}${line("Đã báo trả", money(p.reported_vnd))}${line("Đã xác nhận nhận", money(p.confirmed_vnd))}${line("Ngân hàng nhận", bankName(c, p.payee_bank_code) + " · " + accountName(c, p.payee_account_masked))}${line("Chủ tài khoản", p.payee_account_holder)}${line("Hạn trả", date(p.due_at, { time: true }))}${instruction?`<div class="transfer-instruction"><h3>Thông tin chuyển khoản</h3>${amount(instruction.so_tien_con_vnd,"Còn cần trả")}${instruction.tai_khoan?`${line("Ngân hàng",bankName(c, instruction.tai_khoan.ngan_hang))}${line("Số tài khoản trong hợp đồng",accountName(c, instruction.tai_khoan.so_tai_khoan))}${line("Tên người nhận",instruction.tai_khoan.chu_tai_khoan)}`:notice(instruction.cau)}${line("Nội dung chuyển tiền",instruction.noi_dung)}${instruction.canh_bao?notice(instruction.canh_bao):""}${instruction.vietqr?`<canvas class="qr" data-qr="${e(paymentQr(c, instruction.noi_dung, instruction.vietqr))}" aria-label="QR trả thẳng"></canvas>${c.health?.moi_truong === "thu" ? '<p class="caption">QR giả · Ngân hàng ảo AgiViet · không dùng chuyển tiền</p>' : ""}`:""}</div>`:""}${
          !settled && permitted
            ? receiver
              ? c.state.otp?.payment === p.id
                ? `<form data-form="confirmMoney-${p.id}">${notice(fraud)}${amount(c.state.otp.amount, "Bạn sắp xác nhận đã nhận")}${field("Mã OTP xác nhận nhận tiền", "code", "text", "", 'inputmode="numeric" pattern="[0-9]{6}" required')}<button>Xác nhận đã nhận ${e(money(c.state.otp.amount))}</button></form>`
                : `<details class="rule"><summary>Tôi đã thấy tiền trong tài khoản</summary><form data-form="prepareMoney-${p.id}">${field("Số tiền thực nhận lần này (đ)", "amount", "number", "", 'min="1" required')}${select(
                    "Đối chiếu khoản tiền",
                    "result",
                    [
                      ["", "Chọn kết quả"],
                      ["full", "Đã nhận đủ khoản này"],
                      ["partial", "Mới nhận một phần"],
                    ],
                    "",
                    "required",
                  )}${field("Mã giao dịch trong ngân hàng", "ref", "text", "", "required")}<label class="check"><input type="checkbox" required>Tôi tự mở tài khoản ngân hàng và đã thấy số tiền trên.</label><button>Nhận mã xác nhận tiền</button></form></details><div class="actions">${button("Chưa nhận được tiền", "notReceived-" + p.id, true)}</div>`
              : `<details class="rule"><summary>Ghi số tiền đã chuyển</summary><form data-form="report-${p.id}">${field("Số tiền đã chuyển lần này (đ)", "amount", "number", "", 'min="1" required')}${field("Chứng từ chuyển khoản", "evidence", "file", "", 'accept="image/png,image/jpeg,image/webp,application/pdf" required')}<button>Gửi thông báo đã chuyển</button></form></details>`
            : !settled
              ? notice(
                  "Vai của bạn chỉ xem khoản tiền này. Kế toán, quản lý hoặc chủ tài khoản thực hiện bước tiếp.",
                )
              : ""
        }</section>`;
      })
      .join("")}</div>` +
    (!list.length
      ? empty(
          "Chưa có khoản trả thẳng",
          "Khoản trả được tạo theo hiệu lực và điều kiện của hợp đồng.",
        )
      : "")
  );
}
async function delivery(c, o) {
  if (!o.dot_giao.length)
    return empty(
      "Chưa có đợt giao",
      "Đợt giao được tạo sau khi ngân hàng xác nhận đủ cọc.",
    );
  const did = o.dot_giao.find(d=>d.id===c.state.deliveryId)?.id || o.dot_giao[0].id;
  c.forms.chooseDelivery = f => { c.state.deliveryId=f.get("delivery"); c.state.receipt=null; c.state.disagree=false; };
  const members = !c.seller && c.can("delivery.plan") ? await c.api.get("/v1/org/members") : [];
  const receivers=members.filter(m=>m.status==="active"&&m.roles_effective.some(r=>["owner","warehouse","site_receiver"].includes(r)));
  c.forms.receiver = f => c.command(`/v1/deliveries/${did}/receiver`,{user_id:f.get("receiver")});
  const records=await c.api.get(`/v1/orders/${o.id}/disputes`);
  const waitingReweigh=records.some(r=>r.delivery_id===did && r.status==="open");
  const resubmit=records.some(r=>r.delivery_id===did&&r.hanh_dong.includes("resubmit_acceptance"));
  const d = await c.api.get("/v1/deliveries/" + did);
  c.delivery = d;
  const warehouse = o.dieu_khoan.delivery_mode === "at_buyer_warehouse";
  c.forms.ship = f => c.command(`/v1/deliveries/${did}/ship`,{loaded_g:grams(f.get("loaded")),ma_6_so:f.get("code"),plate_no:f.get("plate"),seal_code:f.get("seal")});
  c.forms.receive = f => c.command(`/v1/deliveries/${did}/receive`,{plate_no:f.get("plate")});
  c.on.receiverSelf = () =>
    c.command(`/v1/deliveries/${did}/receiver`, { user_id: c.user.user_id });
  c.forms.trip = (f) =>
    c.command(`/v1/deliveries/${did}/trip`, {
      plate_no: f.get("plate"),
      freight_vnd: f.get("freight") || undefined,
    });
  c.on.receiptQr = async () => {
    const r = await c.api.command(`/v1/deliveries/${did}/receipt-qr`);
    c.state.receipt = { ...r.data, delivery: did };
  };
  c.forms.startCheck = (f) => {
    const qr = f.get("qr")?.trim(),
      code = f.get("code")?.trim();
    if (!qr && !code)
      throw new Error("Quét QR hoặc nhập mã 6 số của người nhận.");
    return c.command(`/v1/deliveries/${did}/start-check`, {
      ...(qr ? { qr_token: qr } : { ma_6_so: code }),
      plate_no: f.get("plate"),
    });
  };
  c.change.scan = async (form, input) => {
    if (!("BarcodeDetector" in window))
      throw new Error(
        "Máy này chưa hỗ trợ quét ảnh QR. Nhập mã 6 số trên máy người nhận.",
      );
    const img = await createImageBitmap(input.files[0]);
    try {
      const codes = await new BarcodeDetector({ formats: ["qr_code"] }).detect(
        img,
      );
      if (!codes.length)
        throw new Error("Chưa đọc được QR. Chụp rõ hơn hoặc dùng mã 6 số.");
      form.elements.qr.value = codes[0].rawValue;
    } finally {
      img.close();
    }
  };
  const latest = d.ket_qua.at(-1);
  const openRecords = records.filter(r=>r.delivery_id===did&&r.status==='open');
  const fixedLines = resubmit ? latest.lines.filter(l=>!openRecords.some(r=>r.line_no===l.line_no)) : [];
  const totalFor = (lines, kind) => lines.filter(l=>l.kind===kind).reduce((sum,l)=>sum+BigInt(l.qty_g),0n);
  const kgInput = value => String(Number(value)/1000);
  const reweighEvidence = c.state.reweighEvidence?.delivery===did && c.state.reweighEvidence?.version===latest?.version_no ? c.state.reweighEvidence : null;
  c.forms.reweighEvidence = async f => {
    const file = await upload(c, f.get('evidence'), 'order', o.id);
    c.state.reweighEvidence = {delivery:did, version:latest.version_no, id:file.id, name:f.get('evidence').name};
  };
  c.forms.acceptance = async (f) => {
    if(resubmit && !reweighEvidence) throw new Error('Tải ảnh hoặc phiếu cân lại mới trước khi ký kết quả.');
    const lines = fixedLines.map(l=>({kind:l.kind,qty_g:l.qty_g,reason_code:l.reason_code,evidence_document_id:l.evidence_document_id||reweighEvidence?.id}));
    let ev = reweighEvidence?.id;
    if (f.get("evidence")?.size)
      ev = (await upload(c, f.get("evidence"), "delivery", did)).id;
    for (const kind of ["accepted", "downgraded", "rejected"]) {
      const entered = BigInt(grams(f.get(kind) || 0));
      const fixed = totalFor(fixedLines,kind);
      if(entered<fixed) throw new Error('Giữ nguyên lượng các dòng không tranh chấp.');
      const qty = (entered-fixed).toString();
      if (qty !== "0")
        lines.push({
          kind,
          qty_g: qty,
          ...(kind !== "accepted"
            ? { reason_code: f.get(kind + "Reason"), evidence_document_id: ev }
            : {}),
        });
    }
    await c.command(`/v1/deliveries/${did}/acceptance`, {
      pin: f.get("pin"),
      evidence_document_id: reweighEvidence?.id,
      weighed_g: grams(f.get("weighed")),
      seal_code: f.get("seal"),
      accept_overage: f.get("overage") === "on",
      withdrawn_g: f.get("withdrawn") ? grams(f.get("withdrawn")) : undefined,
      lines,
    });
    delete c.state.reweighEvidence;
  };
  c.forms.agree = (f) =>
    c.command(`/v1/deliveries/${did}/acceptance/agree`, {
      pin: f.get("pin"),
      expected_sha256: latest.content_sha256,
      ...(f.get("shortfall") ? {shortfall:{choice:f.get("shortfall"),notice:f.get("notice"),backfill_from:f.get("backFrom")?new Date(f.get("backFrom")+"+07:00").toISOString():undefined,backfill_to:f.get("backTo")?new Date(f.get("backTo")+"+07:00").toISOString():undefined}} : {}),
    });
  c.on.disagree = () => {
    c.state.disagree = true;
  };
  c.change.option = async (form) => {
    const part=form.querySelector('[data-withdrawal-pin]');
    if(!part) return;
    const show=form.elements.option.value==='rut_phan';
    part.hidden=!show;
    const pin=part.querySelector('input');pin.disabled=!show;pin.required=show;
  };
  c.forms.disagree = async (f) => {
    const r = await c.api.command(`/v1/deliveries/${did}/acceptance/dispute`,{line_no:Number(f.get("line")),reason:f.get("reason"),option:f.get("option"),...(f.get('option')==='rut_phan'?{pin:f.get('pin')}: {})});
    c.go("dispute/"+r.id);
  };
  c.forms.arrival = (f) =>
    c.command(`/v1/deliveries/${did}/arrival`, {
      weighed_g: grams(f.get("weighed")),
    });
  c.forms.confirmArrival = () =>
    c.command(`/v1/deliveries/${did}/arrival/confirm`);
  const qr = c.state.receipt?.delivery === did ? c.state.receipt : null;
  let profile = null;
  if (d.status === "checking" || resubmit) {
    const meta = o.tai_lieu.find((x) => x.doc_type === "contract");
    const doc = await c.api.get("/v1/documents/" + meta.id);
    const product = c.products.find(
      (p) => p.name_vi === doc.canonical_content.hang.ten,
    );
    if (product)
      profile = await c.api.get(`/v1/products/${product.code}/profile`);
  }
  const reasons = [
    ["", "Chọn lý do"],
    ...(profile?.reject_reasons || []).map((r) => [r.reason_code, r.label_vi]),
  ];
  return (
    `${o.dot_giao.length>1?`<form data-form="chooseDelivery" class="card">${select("Chọn đợt giao / giao bù","delivery",o.dot_giao.map(d=>[d.id,"Đợt "+d.batch_no+" · "+quantity(d.planned_qty_g)+" · "+label(d.status)]),did)}<button>Mở đợt giao</button></form>`:""}<section class="card"><div class="row"><h2>Đợt giao ${e(d.batch_no)}</h2>${badge(label(d.status))}</div>${line("Lượng dự kiến", quantity(d.planned_qty_g))}${line("Bắt đầu nhận", date(d.window_from, { time: true }))}${line("Hạn nhận", date(d.window_to, { time: true }))}${d.the_san_sang ? `<h3>Đủ điều kiện mới giao hàng</h3>${d.the_san_sang.map((r) => `<div class="readiness ${r.ok ? "ok" : ""}"><i aria-hidden="true">${r.ok ? "✓" : "!"}</i><div><strong>${e(r.ten)}</strong>${!r.ok ? `<p>${e(r.ly_do)}</p>` : ""}</div></div>`).join("")}` : ""}</section>` +
    (warehouse && c.seller && c.can("delivery.ship") && ["preparing","ready"].includes(d.status)?`<form data-form="trip" class="card form"><h2>Người bán đặt xe giao tại kho</h2>${field("Biển số xe","plate","text","","required")}${field("Cước xe đã thỏa thuận (đ)","freight","number","",'min="0"')}<button>Lưu chuyến xe</button></form>`:"") +
    (["preparing", "ready"].includes(d.status)
      ? `<div class="grid two">${!c.seller && c.can("delivery.plan") ? `<section class="card"><h2>Người nhận và xe</h2>${!d.receiver_user_id ? notice("Chưa chỉ định người nhận.") : notice(d.receiver_user_id === c.user.user_id ? "Bạn là người nhận được chỉ định." : "Đã chỉ định người nhận. Người đó mở QR bằng tài khoản của mình.")}${receivers.length?`<form data-form="receiver">${select("Chọn người nhận theo tên","receiver",receivers.map(m=>[m.user_id,m.name]),d.receiver_user_id||"")}<button>Chỉ định người nhận</button></form>`:notice("Chưa có thành viên có quyền nhận hàng.")}${c.can("delivery.check") ? button("Tôi là người nhận hàng", "receiverSelf", true) : ""}<form data-form="trip" class="consent">${field("Biển số xe", "plate", "text", "", "required")}${field("Cước xe đã thỏa thuận (đ)", "freight", "number", "", 'min="0"')}<button>Lưu chuyến xe</button></form></section>` : ""}${d.receiver_user_id === c.user.user_id ? `<section class="card"><h2>Thẻ người nhận hàng</h2><p>Đưa mã này cho người bán tại điểm nhận.</p>${button(qr ? "Lấy lại mã còn hiệu lực" : "Mở QR nhận hàng", "receiptQr")}${qr ? `<canvas class="qr" data-qr="${e(qr.qr_token)}" aria-label="QR người nhận hàng"></canvas><p class="code" data-receipt-code>${e(qr.ma_6_so)}</p><p class="caption">Hiệu lực đến ${e(date(qr.het_han, { time: true }))}. Khi hết hạn, lấy lại mã trước khi quét.</p>` : ""}</section>` : ""}${((c.seller && c.can("delivery.ship")) || (!c.seller && c.can("delivery.check"))) && d.status === "ready" && !warehouse ? `<form data-form="startCheck" class="card"><h2>Quét thẻ người nhận</h2><p>Đối chiếu người nhận, biển số và lô hàng trước khi cân.</p>${field("Chụp QR người nhận", "scan", "file", "", 'accept="image/*" capture="environment"')}<details class="rule"><summary>Nội dung QR đã đọc</summary><label>Nội dung QR<textarea name="qr"></textarea></label></details>${field("Hoặc nhập mã 6 số", "code", "text", "", 'inputmode="numeric" pattern="[0-9]{6}"')}${field("Biển số xe tại điểm nhận", "plate", "text", "", "required")}<button>Bắt đầu nghiệm thu</button></form>` : ""}</div>`
      : "") +
    (warehouse && c.seller && c.can("delivery.ship") && d.status==="ready" ? `<form data-form="ship" class="card form"><h2>Xuất hàng giao tại kho</h2>${field("Lượng bốc lên xe (kg)","loaded","number","",'min="0.001" step="0.001" required')}${field("Mã 6 số của người nhận","code","text","",'pattern="[0-9]{6}" required')}${field("Biển số xe","plate","text","","required")}${field("Mã niêm phong","seal","text","","required")}<button>Xác nhận xuất hàng</button></form>`:"") +
    (warehouse && !c.seller && c.can("delivery.arrival") && d.status==="in_transit" ? `<form data-form="receive" class="card form"><h2>Nhận xe tại kho</h2>${field("Biển số xe thực tế","plate","text","","required")}<button>Nhận hàng và bắt đầu cân tại kho</button></form>`:"") +
    (resubmit && !c.seller && c.can("delivery.check") ? `<section class="card form"><h2>1. Tải chứng cứ cân lại</h2>${notice("Tải ảnh hoặc phiếu cân mới sau khi người bán phản đối, trong 24 giờ và trước kiểm định. Giữ nguyên tổng cân và các dòng không tranh chấp.")}${fixedLines.map(l=>line("Giữ nguyên · "+kindNames[l.kind],quantity(l.qty_g))).join("")}${reweighEvidence?notice("Đã tải chứng cứ: "+reweighEvidence.name):""}<form data-form="reweighEvidence">${field("Ảnh hoặc phiếu cân lại mới", "evidence", "file", "", 'accept="image/png,image/jpeg,image/webp,application/pdf" required')}<button>${reweighEvidence?"Thay chứng cứ cân lại":"Tải chứng cứ cân lại"}</button></form></section>` : "") +
    ((d.status === "checking" || resubmit && reweighEvidence) && !c.seller && c.can("delivery.check")
      ? `<form data-form="acceptance" class="card form"><h2>${resubmit?"2. Cân lại / chia lại kết quả":"Ghi kết quả cân và 3 phần hàng"}</h2><p>Nhập số thực tế. Tổng đạt, hạ cấp và trả lại phải bằng số cân.</p><div class="form-grid">${field("Tổng cân thực tế (kg)", "weighed", "number", resubmit?kgInput(latest.weighed_g):"", 'min="0.001" step="0.001" required'+(resubmit?' readonly':''))}${field("Mã mẫu niêm phong", "seal", "text", "", "required")}${field("Đạt (kg)", "accepted", "number", resubmit?kgInput(totalFor(latest.lines,"accepted")):"", `min="${kgInput(totalFor(fixedLines,"accepted"))}" step="0.001" required`)}${field("Hạ cấp (kg)", "downgraded", "number", resubmit?kgInput(totalFor(latest.lines,"downgraded")):"", `min="${kgInput(totalFor(fixedLines,"downgraded"))}" step="0.001" required`)}${select("Lý do hạ cấp", "downgradedReason", reasons, resubmit?latest.lines.find(l=>l.kind==="downgraded")?.reason_code||"":"")}${field("Trả lại (kg)", "rejected", "number", resubmit?kgInput(totalFor(latest.lines,"rejected")):"", `min="${kgInput(totalFor(fixedLines,"rejected"))}" step="0.001" required`)}${select("Lý do trả lại", "rejectedReason", reasons, resubmit?latest.lines.find(l=>l.kind==="rejected")?.reason_code||"":"")}${resubmit?"":field("Ảnh phần hàng chênh lệch", "evidence", "file", "", 'accept="image/png,image/jpeg,image/webp" capture="environment"')}</div><label class="check"><input type="checkbox" name="overage" disabled>Nhận phần vượt: chức năng chưa sẵn sàng. Chỉ ghi lượng hợp đồng hoặc lập phụ lục.</label>${resubmit?field("Lượng người bán rút về (kg, nếu có)","withdrawn","number","",'min="0" step="0.001" disabled')+notice("Rút phần hàng chưa sẵn sàng. Liên hệ hỗ trợ để xử lý hồ sơ."):""}${rule("Không chọn sẵn số cân. Hạ cấp và trả lại phải có lý do; phần trả lại vượt mức cho phép phải kèm ảnh.")}${field("PIN ký biên bản của bên mua", "pin", "password", "", 'inputmode="numeric" autocomplete="off" required')}<button>Ký và gửi kết quả cho người bán</button></form>`
      : "") +
    (latest
      ? `<section class="card"><h2>Kết quả nghiệm thu · lần ${e(latest.version_no)}</h2>${waitingReweigh?notice("Đang chờ bên mua cân lại / chia lại phần đã phản đối. Chỉ ký sau khi có kết quả mới."):""}${line("Lượng đã cân", quantity(latest.weighed_g))}${latest.lines.map((l) => line(kindNames[l.kind], quantity(l.qty_g) + " · " + money(l.value_vnd))).join("")}<div class="actions">${button("Xem PDF biên bản", "pdf:" + latest.document_id, true)}</div>${
          d.status === "awaiting_seller" &&
          c.seller &&
          c.can("acceptance.respond") && !waitingReweigh
            ? `<form data-form="agree" class="consent"><label class="check"><input type="checkbox" required>Tôi đã xem đúng số cân, 3 phần hàng và biên bản trên.</label><details class="rule"><summary>Thiếu lượng ngoài dung sai: chọn cách xử lý</summary>${select("Xử lý phần thiếu","shortfall",[["","Không có thiếu ngoài dung sai"],["backfill","Giao bù"],["end","Kết thúc phần thiếu"],["force_majeure","Bất khả kháng"]])}${select("Đã báo thiếu trước ngày giao","notice",[["none","Không báo trước"],["lt3d","Dưới 3 ngày"],["ge3d","Từ 3 ngày"]])}${field("Giao bù từ (giờ Việt Nam)","backFrom","datetime-local")}${field("Giao bù đến (giờ Việt Nam)","backTo","datetime-local")}<p>Kết thúc phần thiếu có thể phát sinh phạt theo hợp đồng. Chọn đúng việc đã thỏa thuận.</p></details>${field("PIN xác nhận biên bản", "pin", "password", "", 'inputmode="numeric" required')}<button>Đồng ý kết quả nghiệm thu</button></form><div class="actions">${button("Không đúng", "disagree", true)}</div>${
                c.state.disagree
                  ? `<form data-form="disagree" class="consent"><h3>Phần nào không đúng?</h3>${select(
                      "Dòng nghiệm thu",
                      "line",
                      latest.lines.map((l) => [
                        String(l.line_no),
                        `${kindNames[l.kind]} · ${quantity(l.qty_g)}`,
                      ]),
                    )}${select("Đề nghị xử lý","option",[["chia_lai","Cân lại / chia lại"],["rut_phan","Rút phần hàng về"]])}<div data-withdrawal-pin hidden>${field("PIN ký rút phần hàng", "pin", "password", "", 'inputmode="numeric" autocomplete="off" disabled')}</div><label>Lý do không đồng ý<textarea name="reason" required></textarea></label><button>Gửi phản đối phần này</button></form>`
                  : ""
              }`
            : ""
        }</section>`
      : "") +
    (d.status === "in_transit" && !warehouse && !c.seller && c.can("delivery.arrival")
      ? `<form data-form="arrival" class="card form"><h2>Cân tại nơi đến</h2>${field("Số cân tại nơi đến (kg)", "weighed", "number", "", 'min="0.001" step="0.001" required')}<button>Ghi số cân nơi đến</button></form>`
      : "") +
    (d.status === "arrival_check" && !c.seller && c.can("delivery.arrival")
      ? `<form data-form="confirmArrival" class="card form"><h2>Xác nhận nhận hàng</h2><label class="check"><input type="checkbox" required>Tôi đã kiểm hàng tại nơi đến và xác nhận đạt thỏa thuận.</label><button>Xác nhận đến đạt</button><div class="actions">${link("Hàng khác mẫu lúc bốc", `order/${o.id}/disputes`, true)}</div></form>`
      : "") +
    `<div data-pdf-host></div>`
  );
}
async function moneyView(c, o) {
  const m = await c.api.get(`/v1/orders/${o.id}/money`);
  const names = {
    v_vnd: "Giá trị được chấp nhận",
    d_vnd: "Trả thẳng đã xác nhận",
    c_vnd: "Cọc",
    release_vnd: "Cọc chi người bán",
    refund_vnd: "Cọc hoàn bên mua",
    t_bm_vnd: "Bên mua còn phải trả",
    t_nb_vnd: "Người bán còn phải hoàn",
    additional_hold_vnd: "Giữ thêm chờ giải quyết",
  };
  return `<div class="grid two"><section class="card"><h2>Tiền của đơn</h2>${amount(o.dieu_khoan.contract_value_vnd, "Giá trị hợp đồng")}${m.coc ? line("Cọc", money(m.coc.deposit_vnd) + " · " + label(m.coc.status)) : ""}${m.phi ? line("Phí", money(m.phi.so_tien_vnd) + " · " + (m.coc?.status === "awaiting_transfer" ? "Chưa thu" : m.phi.trang_thai)) : ""}${rule("Cọc đang giữ không phải tiền đã về. Chỉ khi ngân hàng báo thành công mới ghi tiền đã về; đối soát là bước cuối.")}<div class="actions">${link("Xem khoản trả thẳng", `order/${o.id}/payments`, true)}</div></section><section class="card"><h2>Lệnh ngân hàng</h2>${m.lenh_ngan_hang.length ? m.lenh_ngan_hang.map((l) => `<article><h3>${e(l.code)}</h3>${amount(l.amount_vnd, l.kind.includes("refund") ? "Hoàn lại" : "Chi tiền")}${line("Trạng thái", bankStages[l.status] || "Đang theo dõi")}${line("Tài khoản nhận", bankName(c, l.target_bank_code) + " · " + accountName(c, l.target_account_masked))}<div class="steps" aria-label="Bốn bước ngân hàng">${["created", "sent", "succeeded", "reconciled"].map((s, i) => `<span class="step ${i <= ["created", "sent", "succeeded", "reconciled"].indexOf(l.status) ? "done" : ""}">${["Tạo", "Gửi", "Tiền về", "Đối soát"][i]}</span>`).join("")}</div></article>`).join("") : notice("Chưa có lệnh chi hoặc hoàn cọc.")}</section></div><div class="section-title"><h2>Bảng quyết toán</h2></div>${
    m.quyet_toan.length
      ? m.quyet_toan
          .map(
            (q) =>
              `<section class="card"><h3>${q.is_final ? "Quyết toán cuối" : "Quyết toán tạm"} · lần ${q.seq}</h3>${Object.entries(
                names,
              )
                .filter(([k]) => q[k] != null)
                .map(([k, v]) => line(v, money(q[k])))
                .join(
                  "",
                )}${line("Tính lúc", date(q.computed_at, { time: true }))}</section>`,
          )
          .join("")
      : empty(
          "Chưa có quyết toán",
          "Bảng quyết toán xuất hiện khi hàng được chốt nhận hoặc phần không tranh chấp được xử lý.",
        )
  }`;
}
async function documents(c, o) {
  return `<section class="card"><h2>Giấy tờ của đơn</h2>${o.tai_lieu.map((d) => `<div class="line"><div><strong>${e(d.code)}</strong><p class="caption">Phiên bản ${e(d.version_no)} · ${e(date(d.created_at))}</p></div>${button("Xem PDF", "pdf:" + d.id, true)}</div>`).join("")}${!o.tai_lieu.length ? notice("Chưa có tài liệu.") : ""}</section><section class="card"><h2>Lịch sử giao dịch</h2>${o.lich_su.map((h) => `<div class="line"><span>${e(date(h.at, { time: true }))}</span><strong>${e(historyName(h.command))}${h.reason ? `<small> · ${e(h.reason)}</small>` : ""}</strong></div>`).join("")}</section><div data-pdf-host></div>`;
}
function historyName(code) {
  return (
    {
      lap_don: "Lập hợp đồng",
      ky: "Ký hợp đồng",
      coc_da_nhan: "Ngân hàng xác nhận cọc",
      dat_xe: "Lưu chuyến xe",
      bat_dau_nghiem_thu: "Bắt đầu nghiệm thu",
      gui_ket_qua: "Gửi kết quả nghiệm thu",
      dong_y_ket_qua: "Đồng ý nghiệm thu",
      ky_nhan_tai_noi_den: "Nhận tại nơi đến",
      xac_nhan_den_dat: "Xác nhận hàng đạt",
      quyet_toan: "Lập quyết toán",
      doi_soat: "Đối soát",
      bao_da_tra: "Báo đã trả",
      xac_nhan_nhan: "Xác nhận nhận tiền",
      xin_huy: "Đề nghị hủy",
      dong_y_huy: "Đồng ý hủy",
    }[code] || "Cập nhật giao dịch"
  );
}
async function cancel(c, o) {
  let preview = null;
  if (["active", "awaiting_deposit"].includes(o.status))
    preview = await c.api.get(`/v1/orders/${o.id}/cancellation-preview`);
  c.forms.cancel = (f) =>
    c.command(
      `/v1/orders/${o.id}/${o.hanh_dong.includes("request_cancel") ? "cancellation-requests" : o.hanh_dong.includes("cancel") ? "cancel" : o.hanh_dong.includes("withdraw") ? "withdraw" : "decline"}`,
      {
        reason: f.get("reason"),
        reason_text: f.get("reason"),
        reason_kind: c.seller ? "seller_request" : "buyer_request",
      },
    );
  const requests = await c.api.get(`/v1/orders/${o.id}/cancellation-requests`);
  for(const r of requests) for(const action of r.hanh_dong) c.forms[`cancel-${action}-${r.id}`] = () => c.command(`/v1/cancellation-requests/${r.id}/${action}`);
  const requestCards=requests.map(r=>`<section class="card form"><h2>${r.la_cua_toi?"Đề nghị của bạn":"Bên kia đề nghị hủy"}</h2>${badge(label(r.status))}${line("Người gửi",r.requested_by_name)}${line("Lý do",r.reason_text)}${line("Hạn trả lời",date(r.reply_due_at,{time:true}))}${r.outcome?Object.entries({hang:"Hàng",coc:"Cọc",phi:"Phí",tra_thang:"Trả thẳng",uy_tin:"Uy tín"}).filter(([k])=>r.outcome[k]).map(([k,t])=>line(t,r.outcome[k]?.cau||r.outcome[k])).join(""):""}${r.hanh_dong.map(a=>`<form data-form="cancel-${a}-${r.id}"><label class="check"><input type="checkbox" required>Tôi đã xem hệ quả và xác nhận ${a==="accept"?"đồng ý hủy":"không đồng ý hủy"}.</label><button>${a==="accept"?"Đồng ý hủy hợp đồng":"Từ chối đề nghị hủy"}</button></form>`).join("")}</section>`).join("");
  if(requests.some(r=>["awaiting_reply","processing_money"].includes(r.status))) return requestCards + notice("Hệ quả áp dụng theo yêu cầu hủy ở trên. Tiền chỉ được tính là đã hoàn hoặc đã chi khi ngân hàng xác nhận.") + link("Theo dõi tiền hủy",`order/${o.id}/money`,true);
  return requestCards + `<section class="card form"><h2>Xem hệ quả trước khi hủy</h2>${preview ? `${line("Hàng", preview.hang)}${line("Cọc", preview.coc.cau)}${line("Phí", preview.phi.cau)}${line("Trả thẳng", preview.tra_thang.cau)}${line("Uy tín", preview.uy_tin)}` : notice(["closed", "completed", "outstanding", "awaiting_settlement"].includes(o.status) ? "Đơn đã qua bước hủy trực tiếp. Xem quyết toán hoặc hồ sơ tranh chấp của phần hàng nếu có." : "Trước khi hợp đồng có hiệu lực, rút hoặc từ chối ký sẽ kết thúc thỏa thuận.")}${o.co.dang_xin_huy ? notice("Đang có yêu cầu hủy. Xem lý do, hệ quả và hành động tại hồ sơ phía trên.") : ["request_cancel", "cancel", "withdraw", "decline"].some((a) => o.hanh_dong.includes(a)) ? `<form data-form="cancel"><label>Lý do hủy<textarea name="reason" required></textarea></label><label class="check"><input type="checkbox" required>Tôi đã xem hệ quả ở trên và muốn tiếp tục.</label><button>${o.status === "active" ? "Gửi đề nghị hủy" : "Xác nhận rút hoặc hủy"}</button></form>` : notice("Không có hành động hủy được phép ở bước này.")}${rule("Sau cọc, bên kia cần đồng ý. Hủy không đồng nghĩa tiền lập tức đã hoàn. Phải theo dõi trạng thái lệnh ngân hàng.")}</section>`;
}
async function disputes(c, o) {
  const records=await c.api.get(`/v1/orders/${o.id}/disputes`);
  const did = o.dot_giao[0]?.id;
  let d = did ? await c.api.get(`/v1/deliveries/${did}`) : null;
  c.forms.complaint = async (f) => {
    const file = await upload(c, f.get("evidence"), "delivery", did);
    const r = await c.api.command(`/v1/deliveries/${did}/arrival/complaint`, {
      line_no: Number(f.get("line")),
      qty_g: grams(f.get("qty")),
      reason: f.get("reason"),
      seal_code: f.get("seal"),
      inspection_fee_vnd: f.get("fee"),
      evidence_document_id: file.id,
    });
    c.flash("Đã gửi khiếu nại.");
    c.go("dispute/" + r.id);
  };
  return `<div class="stack">${records.map(r=>`<section class="card"><h2>Hồ sơ · dòng ${e(r.line_no)}</h2>${badge(r.status==="resolved"?"Đã giải quyết":"Đang xử lý")}${line("Lý do",r.reason)}${line("Phần hàng",quantity(r.disputed_qty_g))}${line("Hạn tiếp theo",date(r.next_due_at,{time:true}))}${link("Mở hồ sơ",`dispute/${r.id}`,true)}${r.hanh_dong.includes("resubmit_acceptance")?link("Cân lại / chia lại",`order/${o.id}/delivery`,true):""}${r.hanh_dong.includes("agree_acceptance")?link("Xem kết quả mới",`order/${o.id}/delivery`,true):""}${r.status!=="resolved"&&!r.hanh_dong.length?notice("Hồ sơ đang chờ xử lý. Chưa có thao tác tiếp theo cho vai của bạn."):""}</section>`).join("")||notice("Đơn chưa có hồ sơ tranh chấp.")}</div><section class="card form"><h2>Tranh chấp của đơn</h2>${notice("Không ký kết quả chưa đúng. Giữ ảnh, mã mẫu niêm phong và biên bản của đúng phần hàng.")} ${!c.seller && c.can("dispute.buyer") && d?.status === "arrival_check" ? `<h3>Khác mẫu tại nơi đến</h3><p>Gửi trong 2 giờ sau khi ký nhận. Bên mua ứng phí kiểm định.</p><form data-form="complaint">${select("Dòng nghiệm thu", "line", d.ket_qua.at(-1)?.lines.map((l) => [String(l.line_no), `${l.line_no}. ${kindNames[l.kind]} · ${quantity(l.qty_g)}`]) || [])}${field("Lượng có vấn đề (kg)", "qty", "number", "", 'min="0.001" step="0.001" required')}${field("Mã niêm phong mẫu", "seal", "text", "", "required")}${field("Phí kiểm định đã thỏa thuận (đ)", "fee", "number", "", 'min="0" required')}<label>Mô tả khác biệt<textarea name="reason" required></textarea></label>${field("Ảnh bằng chứng", "evidence", "file", "", 'accept="image/png,image/jpeg,image/webp" required')}<button>Gửi khiếu nại phần hàng này</button></form>` : notice("Phản đối từng phần bằng nút Không đúng khi xem kết quả nghiệm thu. Khiếu nại nơi đến mở sau khi ghi cân tại nơi đến.")}<form data-form="openDispute">${field("Mã hồ sơ đã được cấp", "dispute", "text", "", "required")}<button class="secondary">Mở hồ sơ</button></form></section>`;
}
export async function dispute(c, id) {
  const d = await c.api.get("/v1/disputes/" + id);
  return (
    heading(
      "Hồ sơ tranh chấp",
      "Theo dõi lượng và kết quả kiểm định của phần đang xử lý.",
    ) +
    `<section class="card form">${badge(d.status === "resolved" ? "Đã giải quyết" : "Đang giải quyết")}${line("Lượng tranh chấp", quantity(d.disputed_qty_g))}${line("Lý do", d.reason)}${line("Gửi lúc", date(d.created_at, { time: true }))}${(d.inspections || []).map((i) => `<h3>Kiểm định</h3>${line("Phí ứng", money(i.fee_vnd))}${line("Hạn kết quả", date(i.due_at, { time: true }))}${line("Kết quả", { passed: "Đạt", failed: "Không đạt", inconclusive: "Chưa kết luận" }[i.result] || "Chưa có")}`).join("")}<div class="actions">${link("Về đơn", `order/${d.order_id}/disputes`, true)}</div></section>`
  );
}
